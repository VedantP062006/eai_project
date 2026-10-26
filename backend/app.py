"""
FastAPI Backend Application for AI Gesture-Controlled Smart Vehicle System.
Optimized with dedicated multi-threaded Vision & Kinematics worker,
cooperative async video streaming, and high-frequency WebSocket telemetry.
"""

import cv2
import time
import base64
import asyncio
import threading
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
from pydantic import BaseModel

from backend.config import DEFAULT_SETTINGS, DEFAULT_GESTURE_MAP
from backend.database import (
    init_db,
    get_command_logs,
    clear_command_logs,
    get_system_events,
    get_gesture_map,
    update_gesture_map,
    get_system_settings,
    update_system_settings,
    log_event
)
from backend.vision.camera import CameraService
from backend.vision.hand_detector import HandDetector
from backend.vision.gesture_classifier import GestureClassifier
from backend.vision.stability_filter import StabilityFilter
from backend.vehicle.simulation import VehicleSimulation
from backend.vehicle.safety_controller import SafetyController
from backend.hardware.serial_bridge import HardwareBridge

# --- Global Subsystems ---
camera_service: Optional[CameraService] = None
hand_detector: Optional[HandDetector] = None
gesture_classifier: Optional[GestureClassifier] = None
stability_filter: Optional[StabilityFilter] = None
vehicle_sim: Optional[VehicleSimulation] = None
safety_ctrl: Optional[SafetyController] = None
hardware_bridge: Optional[HardwareBridge] = None

# Threading & Shared State
worker_thread: Optional[threading.Thread] = None
worker_running: bool = False
state_lock = threading.Lock()
current_annotated_jpeg: Optional[bytes] = None
last_system_state: Dict[str, Any] = {}
ws_broadcast_task: Optional[asyncio.Task] = None


class ConnectionManager:
    """Manages active WebSockets and broadcasts live telemetry."""
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        dead_connections = []
        for connection in self.connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


ws_manager = ConnectionManager()


def vision_and_sim_worker_thread():
    """
    Dedicated high-performance background OS thread running at 30-60 FPS.
    Handles frame acquisition, MediaPipe inference, temporal filtering,
    safety command arbitration, vehicle physics stepping, and frame compression
    completely decoupled from the web server event loop.
    """
    global current_annotated_jpeg, last_system_state, worker_running

    last_time = time.time()
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 65]

    while worker_running:
        cycle_start = time.time()
        dt = cycle_start - last_time
        last_time = cycle_start

        try:
            # 1. Fetch Latest Fresh Frame (0ms from threaded capture)
            ret, frame, ts_ms = camera_service.get_frame()
            if not ret or frame is None:
                safety_ctrl.handle_deadman_trigger("Camera frame not available")
                time.sleep(0.02)
                continue

            # 2. Hand Landmark Detection (VIDEO tracking mode)
            landmarks = None
            handedness = "Right"

            if camera_service.demo_mode:
                landmarks = camera_service.get_synthetic_landmarks()
            else:
                landmarks, handedness = hand_detector.detect(frame, ts_ms)

            # 3. Geometric Gesture Classification
            raw_gesture = "NO_HAND"
            raw_confidence = 0.0
            if landmarks:
                raw_gesture, raw_confidence = gesture_classifier.classify(landmarks, handedness or "Right")

            # 4. Stability Filter & Deadman
            filter_res = stability_filter.process(raw_gesture, raw_confidence)
            stable_gesture = filter_res["stable_gesture"]
            stable_conf = filter_res["confidence"]
            is_stable = filter_res["is_stable"]

            if filter_res.get("deadman_triggered"):
                safety_ctrl.handle_deadman_trigger("Hand absent from camera")

            # 5. Execute Command
            if is_stable or raw_gesture == "CLOSED_FIST":
                success, executed_cmd, _ = safety_ctrl.execute_gesture_command(
                    stable_gesture,
                    stable_conf,
                    is_stable
                )
                if success and hardware_bridge and hardware_bridge.enabled:
                    hardware_bridge.send_command(executed_cmd)

            # 6. Step Kinematics Physics Simulation
            vehicle_sim.tick(dt=max(0.01, min(0.06, dt)))

            # 7. Render Landmarks and Compress JPEG
            if landmarks:
                frame = HandDetector.draw_landmarks(frame, landmarks, stable_gesture, stable_conf)

            _, buffer = cv2.imencode(".jpg", frame, encode_params)
            jpeg_bytes = buffer.tobytes()

            # 8. Update Atomic Telemetry Payload
            telemetry = vehicle_sim.get_telemetry()
            hw_status = hardware_bridge.get_status() if hardware_bridge else {}

            # Base64 data URI for zero-lag, non-blocking WebSocket stream
            b64_str = base64.b64encode(jpeg_bytes).decode("ascii")
            data_uri = f"data:image/jpeg;base64,{b64_str}"

            payload = {
                "type": "TELEMETRY_UPDATE",
                "timestamp": time.time(),
                "vehicle": telemetry,
                "vision": {
                    "raw_gesture": raw_gesture,
                    "stable_gesture": stable_gesture,
                    "confidence": round(stable_conf, 3),
                    "stability_count": filter_res["consecutive_count"],
                    "required_frames": filter_res["required_frames"],
                    "hold_progress": round(filter_res["hold_progress"], 2),
                    "hand_detected": landmarks is not None,
                    "fps": camera_service.fps,
                    "camera_connected": camera_service.is_connected,
                    "camera_index": camera_service.camera_index,
                    "active_backend": getattr(camera_service, "active_backend", "UNKNOWN"),
                    "demo_mode": camera_service.demo_mode,
                    "demo_gesture": camera_service.demo_gesture,
                    "landmarks": landmarks[:21] if landmarks else None,
                    "image": data_uri
                },
                "safety": {
                    "control_mode": safety_ctrl.active_control_mode,
                    "safety_lockout": safety_ctrl.safety_lockout,
                    "safety_warning": safety_ctrl.last_safety_warning,
                    "engine_state": vehicle_sim.engine_state
                },
                "hardware": hw_status
            }

            # Atomic reference updates without blocking OS locks
            current_annotated_jpeg = jpeg_bytes
            last_system_state = payload

            # Regulate framerate (~35-40 FPS loop)
            elapsed = time.time() - cycle_start
            sleep_time = max(0.002, 0.026 - elapsed)
            time.sleep(sleep_time)

        except Exception as e:
            print(f"[WorkerThread] Error: {e}")
            time.sleep(0.03)


async def async_websocket_broadcast_loop():
    """Lightweight non-blocking async task broadcasting state over WebSockets at ~30 FPS."""
    while True:
        try:
            if ws_manager.connections:
                msg = last_system_state
                if msg:
                    await ws_manager.broadcast(msg)
            await asyncio.sleep(0.033)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[WsBroadcast] Error: {e}")
            await asyncio.sleep(0.05)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database, hardware, and starts dedicated worker thread."""
    global camera_service, hand_detector, gesture_classifier, stability_filter
    global vehicle_sim, safety_ctrl, hardware_bridge, worker_thread, worker_running, ws_broadcast_task

    print("[App] Initializing SQLite database...")
    init_db()

    settings = get_system_settings()
    gesture_map = get_gesture_map()

    print("[App] Initializing Vision and Simulation subsystems...")
    camera_service = CameraService(
        camera_index=int(settings.get("camera_index", 0)),
        fps=int(settings.get("camera_fps", 30))
    )
    if settings.get("demo_mode", False):
        camera_service.set_demo_mode(True)

    hand_detector = HandDetector()
    gesture_classifier = GestureClassifier()
    stability_filter = StabilityFilter(
        confidence_threshold=float(settings.get("confidence_threshold", 0.65)),
        required_consecutive_frames=int(settings.get("stability_frame_count", 3)),
        hold_confirmation_sec=float(settings.get("hold_confirmation_sec", 1.2)),
        deadman_timeout_sec=float(settings.get("deadman_timeout_sec", 0.6))
    )

    vehicle_sim = VehicleSimulation(settings=settings)
    safety_ctrl = SafetyController(vehicle=vehicle_sim, gesture_map=gesture_map)

    hardware_bridge = HardwareBridge(
        port=str(settings.get("hardware_port", "COM3")),
        baud_rate=int(settings.get("hardware_baud", 115200)),
        enabled=bool(settings.get("hardware_enabled", False)),
        mock_mode=bool(settings.get("hardware_mock_mode", True))
    )
    hardware_bridge.start()

    # Launch dedicated vision & kinematics OS worker thread
    worker_running = True
    worker_thread = threading.Thread(target=vision_and_sim_worker_thread, daemon=True)
    worker_thread.start()

    # Launch WebSocket async broadcast task
    ws_broadcast_task = asyncio.create_task(async_websocket_broadcast_loop())
    print("[App] System initialized in high-performance multi-threaded mode.")

    yield

    print("[App] Shutting down subsystems...")
    worker_running = False
    if ws_broadcast_task:
        ws_broadcast_task.cancel()
    if worker_thread and worker_thread.is_alive():
        worker_thread.join(timeout=1.0)
    if hardware_bridge:
        hardware_bridge.stop()
    if camera_service:
        camera_service.stop()


app = FastAPI(
    title="AI Gesture-Controlled Smart Vehicle System",
    description="Full-stack AI Computer Vision Vehicle System with WebSockets, Simulation, and Hardware Bridge",
    version="2.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request Models ---

class ManualCommandRequest(BaseModel):
    command: str
    value: Optional[Any] = None


class DemoModeRequest(BaseModel):
    enabled: bool
    gesture: Optional[str] = "OPEN_PALM"


class ControlModeRequest(BaseModel):
    mode: str


class CameraReconnectRequest(BaseModel):
    camera_index: Optional[int] = 0


# --- WebSocket Endpoint ---

@app.websocket("/ws")
async def websocket_telemetry(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        if last_system_state:
            await websocket.send_json(last_system_state)

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "MANUAL_COMMAND":
                cmd = data.get("command")
                val = data.get("value")
                safety_ctrl.execute_manual_command(cmd, val)

            elif msg_type == "SET_DEMO_GESTURE":
                gesture = data.get("gesture")
                camera_service.set_demo_mode(True, gesture)

            elif msg_type == "SET_CONTROL_MODE":
                mode = data.get("mode")
                safety_ctrl.set_control_mode(mode)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# --- Cooperative Non-Blocking Video Stream Endpoint ---

@app.get("/api/video_feed")
async def get_video_feed():
    """Asynchronous non-blocking MJPEG live video stream with proper headers and disconnect handling."""
    async def frame_generator():
        try:
            while True:
                await asyncio.sleep(0.028)  # ~35 FPS smooth stream
                frame_bytes = current_annotated_jpeg
                if frame_bytes:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n"
                        b"Content-Length: " + str(len(frame_bytes)).encode("ascii") + b"\r\n\r\n"
                        + frame_bytes + b"\r\n"
                    )
        except (asyncio.CancelledError, GeneratorExit):
            pass

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "close"
        }
    )


@app.get("/api/camera/snapshot")
def get_camera_snapshot():
    """Returns single fresh annotated JPEG frame with zero delay."""
    frame_bytes = current_annotated_jpeg
    if not frame_bytes:
        raise HTTPException(status_code=503, detail="Frame not ready")
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )


# --- REST API Endpoints ---

@app.get("/api/status")
def get_system_status():
    """Returns complete real-time system state and health metrics."""
    return {
        "status": "ONLINE",
        "last_state": last_system_state,
        "camera_connected": camera_service.is_connected if camera_service else False,
        "camera_index": camera_service.camera_index if camera_service else 0,
        "active_backend": getattr(camera_service, "active_backend", "UNKNOWN") if camera_service else "NONE",
        "model_initialized": hand_detector.is_initialized if hand_detector else False,
        "active_control_mode": safety_ctrl.active_control_mode if safety_ctrl else "GESTURE",
        "ws_clients_count": len(ws_manager.connections)
    }


@app.post("/api/manual_command")
def post_manual_command(req: ManualCommandRequest):
    """Executes manual dashboard or keyboard command override."""
    if not safety_ctrl:
        raise HTTPException(status_code=500, detail="System not initialized")
    success, msg = safety_ctrl.execute_manual_command(req.command, req.value)
    return {"success": success, "message": msg, "telemetry": vehicle_sim.get_telemetry()}


@app.post("/api/control_mode")
def set_control_mode(req: ControlModeRequest):
    safety_ctrl.set_control_mode(req.mode)
    return {"success": True, "mode": safety_ctrl.active_control_mode}


@app.post("/api/camera/demo_mode")
def set_demo_mode(req: DemoModeRequest):
    camera_service.set_demo_mode(req.enabled, req.gesture)
    if req.enabled:
        safety_ctrl.set_control_mode("DEMO")
    return {"demo_mode": camera_service.demo_mode, "demo_gesture": camera_service.demo_gesture}


@app.post("/api/camera/reconnect")
def reconnect_camera(req: Optional[CameraReconnectRequest] = None):
    """Cleanly re-initializes webcam hardware and clears any locked handles."""
    if not camera_service:
        raise HTTPException(status_code=500, detail="Camera service not ready")
    idx = req.camera_index if req else None
    camera_service.set_demo_mode(False)
    success = camera_service.reconnect(camera_index=idx)
    return {
        "success": success,
        "camera_connected": camera_service.is_connected,
        "camera_index": camera_service.camera_index,
        "active_backend": getattr(camera_service, "active_backend", "UNKNOWN"),
        "demo_mode": camera_service.demo_mode,
        "fps": camera_service.fps
    }


@app.post("/api/camera/release")
def release_camera():
    """Releases the physical webcam so the browser or another application can access it."""
    if camera_service:
        camera_service.stop()
        camera_service.set_demo_mode(True)
    return {"success": True, "message": "Camera hardware released"}


@app.get("/api/camera/devices")
def get_camera_devices():
    """Returns detected camera hardware devices."""
    devices = CameraService.detect_available_cameras(max_probe=3)
    return {"devices": devices}


@app.get("/api/command_history")
def get_history(limit: int = 100, cmd: Optional[str] = None, source: Optional[str] = None):
    logs = get_command_logs(limit=limit, filter_cmd=cmd, filter_source=source)
    return {"logs": logs, "count": len(logs)}


@app.delete("/api/command_history")
def delete_history():
    cleared = clear_command_logs()
    return {"cleared": cleared}


@app.get("/api/system_events")
def get_events(limit: int = 50):
    events = get_system_events(limit=limit)
    return {"events": events, "count": len(events)}


@app.get("/api/gesture_map")
def get_gestures():
    return {"gesture_map": get_gesture_map()}


@app.post("/api/gesture_map")
def update_gestures(new_map: Dict[str, str]):
    updated = update_gesture_map(new_map)
    safety_ctrl.update_gesture_map(updated)
    return {"success": True, "gesture_map": updated}


@app.get("/api/settings")
def get_settings():
    return {"settings": get_system_settings()}


@app.post("/api/settings")
def update_settings(new_settings: Dict[str, Any]):
    saved = update_system_settings(new_settings)
    stability_filter.update_settings(saved)
    vehicle_sim.update_settings(saved)
    if hardware_bridge:
        hardware_bridge.update_config(
            port=str(saved.get("hardware_port", "COM3")),
            baud_rate=int(saved.get("hardware_baud", 115200)),
            enabled=bool(saved.get("hardware_enabled", False)),
            mock_mode=bool(saved.get("hardware_mock_mode", True))
        )
    return {"success": True, "settings": saved}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=False)
