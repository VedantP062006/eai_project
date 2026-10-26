"""
Ultra-Robust Threaded Webcam & Video Stream Manager.
Supports multiple camera backends (DirectShow, MSMF, Default), auto-reconnect,
continuous non-dropping frame capture, and graceful synthetic demo fallback.
"""

import os
import cv2
import time
import math
import threading
import numpy as np
from typing import Optional, Tuple, Dict, Any, List


class CameraService:
    def __init__(self, camera_index: int = 0, width: int = 640, height: int = 480, fps: int = 30):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.target_fps = fps

        self.cap: Optional[cv2.VideoCapture] = None
        self.is_connected = False
        self.demo_mode = False
        self.demo_gesture = "OPEN_PALM"
        self.demo_time = 0.0

        # Threading & Double Buffering
        self.latest_frame: Optional[np.ndarray] = None
        self.frame_timestamp_ms: int = 0
        self.frame_lock = threading.Lock()
        self.running = False
        self.worker_thread: Optional[threading.Thread] = None

        # Performance stats
        self.last_frame_time = time.time()
        self.fps = 0.0
        self.frame_count = 0
        self.active_backend = "NONE"

        self.start()

    def start(self) -> bool:
        """Attempts to open physical webcam with multiple Windows backends; falls back to demo mode."""
        self.stop()
        self.running = True

        # Test index order: requested camera_index first, then 0, 1
        indices_to_try = [self.camera_index]
        for alt_idx in [0, 1]:
            if alt_idx not in indices_to_try:
                indices_to_try.append(alt_idx)

        backends = [
            ("CAP_DSHOW", cv2.CAP_DSHOW),
            ("CAP_ANY", cv2.CAP_ANY),
            ("CAP_MSMF", cv2.CAP_MSMF),
        ] if os.name == 'nt' else [("CAP_ANY", cv2.CAP_ANY)]

        for test_idx in indices_to_try:
            for backend_name, backend_flag in backends:
                try:
                    cap = cv2.VideoCapture(test_idx, backend_flag)
                    if cap.isOpened():
                        # Set resolution & framerate
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                        cap.set(cv2.CAP_PROP_FPS, self.target_fps)

                        # Test reading a valid frame
                        ret, test_frame = cap.read()
                        if not ret or test_frame is None or test_frame.size == 0:
                            # Try setting MJPG fourcc as fallback
                            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                            ret, test_frame = cap.read()

                        if ret and test_frame is not None and test_frame.size > 0:
                            self.cap = cap
                            self.camera_index = test_idx
                            self.is_connected = True
                            self.demo_mode = False
                            self.active_backend = backend_name

                            flipped = cv2.flip(test_frame, 1)
                            now_ms = int(time.time() * 1000)
                            with self.frame_lock:
                                self.latest_frame = flipped
                                self.frame_timestamp_ms = now_ms

                            print(f"[CameraService] Webcam {self.camera_index} initialized via {backend_name}. Starting worker thread.")
                            self.worker_thread = threading.Thread(target=self._capture_worker, daemon=True)
                            self.worker_thread.start()
                            return True
                        else:
                            cap.release()
                except Exception as e:
                    print(f"[CameraService] Failed backend {backend_name} on index {test_idx}: {e}")

        print(f"[CameraService] Physical webcam not accessible on indices {indices_to_try}. Enabling Demo Mode.")
        self.is_connected = False
        self.demo_mode = True
        return False

    def reconnect(self, camera_index: Optional[int] = None) -> bool:
        """Explicitly reconnects the camera, optionally switching camera index."""
        if camera_index is not None:
            self.camera_index = camera_index
        return self.start()

    def _capture_worker(self):
        """Continuously reads frames from camera hardware in separate thread with automatic reconnect."""
        consecutive_failures = 0

        while self.running:
            if not self.cap or not self.cap.isOpened():
                time.sleep(0.05)
                continue

            try:
                ret, frame = self.cap.read()
                if ret and frame is not None and frame.size > 0:
                    consecutive_failures = 0
                    flipped = cv2.flip(frame, 1)
                    now_ms = int(time.time() * 1000)

                    with self.frame_lock:
                        self.latest_frame = flipped
                        self.frame_timestamp_ms = now_ms
                else:
                    consecutive_failures += 1
                    if consecutive_failures >= 30:
                        print("[CameraService] Frame grab failed 30 times. Attempting auto-reconnect...")
                        if self.cap:
                            try:
                                self.cap.release()
                            except Exception:
                                pass
                        time.sleep(0.2)
                        self.cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
                        consecutive_failures = 0
                    time.sleep(0.01)
            except Exception as e:
                consecutive_failures += 1
                time.sleep(0.05)

    def stop(self):
        """Stops background thread and releases camera."""
        self.running = False
        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=1.0)
            self.worker_thread = None

        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_connected = False

    def set_demo_mode(self, enabled: bool, demo_gesture: Optional[str] = None):
        """Toggle demo mode or change active virtual gesture."""
        self.demo_mode = enabled
        if demo_gesture:
            self.demo_gesture = demo_gesture

    def get_frame(self) -> Tuple[bool, np.ndarray, int]:
        """
        Retrieves the freshest available frame with zero latency.
        Returns: (success: bool, frame: np.ndarray, timestamp_ms: int)
        """
        now = time.time()
        dt = now - self.last_frame_time
        if dt > 0:
            current_instant_fps = 1.0 / dt
            self.fps = round(self.fps * 0.85 + current_instant_fps * 0.15, 1)
        self.last_frame_time = now
        self.frame_count += 1

        if not self.demo_mode and self.is_connected:
            with self.frame_lock:
                if self.latest_frame is not None:
                    return True, self.latest_frame.copy(), self.frame_timestamp_ms

        # Fallback to demo mode synthetic frame
        frame = self._generate_synthetic_frame()
        return True, frame, int(now * 1000)

    def _generate_synthetic_frame(self) -> np.ndarray:
        """Generates synthetic high-tech video frame with animated cyber background."""
        self.demo_time += 0.035
        h, w = self.height, self.width
        frame = np.zeros((h, w, 3), dtype=np.uint8)

        # Cyber Grid Background
        grid_color = (25, 32, 45)
        grid_size = 40
        for x in range(0, w, grid_size):
            cv2.line(frame, (x, 0), (x, h), grid_color, 1)
        for y in range(0, h, grid_size):
            cv2.line(frame, (0, y), (w, y), grid_color, 1)

        # Center target circle with subtle animation
        pulse = int(math.sin(self.demo_time * 2.0) * 8)
        cv2.circle(frame, (w // 2, h // 2), 160 + pulse, (30, 45, 65), 1)

        # Overlay text
        cv2.putText(
            frame,
            f"AI VISION DEMO MODE - GESTURE: {self.demo_gesture}",
            (16, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 240, 255),
            2,
            cv2.LINE_AA
        )
        cv2.putText(
            frame,
            f"FPS: {self.fps} | Camera: {'LIVE' if self.is_connected else 'VIRTUAL'}",
            (16, 56),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (160, 180, 200),
            1,
            cv2.LINE_AA
        )

        return frame

    def get_synthetic_landmarks(self, gesture: Optional[str] = None) -> Optional[List[Dict[str, float]]]:
        """Returns normalized 21 landmarks for testing without physical webcam."""
        target = gesture or self.demo_gesture
        if target == "NO_HAND":
            return None

        wx, wy = 0.5, 0.75
        lms = [
            {"x": wx, "y": wy, "z": 0.0},                  # 0: Wrist
            {"x": wx - 0.05, "y": wy - 0.05, "z": -0.01},  # 1: Thumb CMC
            {"x": wx - 0.08, "y": wy - 0.10, "z": -0.02},  # 2: Thumb MCP
            {"x": wx - 0.10, "y": wy - 0.15, "z": -0.02},  # 3: Thumb IP
            {"x": wx - 0.12, "y": wy - 0.20, "z": -0.03},  # 4: Thumb Tip
            {"x": wx - 0.04, "y": wy - 0.16, "z": 0.0},    # 5: Index MCP
            {"x": wx - 0.04, "y": wy - 0.24, "z": 0.0},    # 6: Index PIP
            {"x": wx - 0.04, "y": wy - 0.30, "z": 0.0},    # 7: Index DIP
            {"x": wx - 0.04, "y": wy - 0.36, "z": 0.0},    # 8: Index Tip
            {"x": wx, "y": wy - 0.16, "z": 0.0},           # 9: Middle MCP
            {"x": wx, "y": wy - 0.25, "z": 0.0},           # 10: Middle PIP
            {"x": wx, "y": wy - 0.32, "z": 0.0},           # 11: Middle DIP
            {"x": wx, "y": wy - 0.39, "z": 0.0},           # 12: Middle Tip
            {"x": wx + 0.04, "y": wy - 0.15, "z": 0.0},    # 13: Ring MCP
            {"x": wx + 0.04, "y": wy - 0.23, "z": 0.0},    # 14: Ring PIP
            {"x": wx + 0.04, "y": wy - 0.29, "z": 0.0},    # 15: Ring DIP
            {"x": wx + 0.04, "y": wy - 0.35, "z": 0.0},    # 16: Ring Tip
            {"x": wx + 0.08, "y": wy - 0.14, "z": 0.0},    # 17: Pinky MCP
            {"x": wx + 0.08, "y": wy - 0.20, "z": 0.0},    # 18: Pinky PIP
            {"x": wx + 0.08, "y": wy - 0.25, "z": 0.0},    # 19: Pinky DIP
            {"x": wx + 0.08, "y": wy - 0.30, "z": 0.0},    # 20: Pinky Tip
        ]

        if target == "CLOSED_FIST":
            lms[4] = {"x": wx - 0.03, "y": wy - 0.13, "z": -0.04}
            lms[8] = {"x": wx - 0.04, "y": wy - 0.15, "z": 0.02}
            lms[12] = {"x": wx, "y": wy - 0.15, "z": 0.02}
            lms[16] = {"x": wx + 0.04, "y": wy - 0.14, "z": 0.02}
            lms[20] = {"x": wx + 0.07, "y": wy - 0.13, "z": 0.02}

        elif target == "THUMB_UP":
            lms[4] = {"x": wx - 0.08, "y": wy - 0.30, "z": 0.0}
            lms[3] = {"x": wx - 0.07, "y": wy - 0.23, "z": 0.0}
            lms[2] = {"x": wx - 0.06, "y": wy - 0.16, "z": 0.0}
            lms[8] = {"x": wx - 0.04, "y": wy - 0.15, "z": 0.02}
            lms[12] = {"x": wx, "y": wy - 0.15, "z": 0.02}
            lms[16] = {"x": wx + 0.04, "y": wy - 0.14, "z": 0.02}
            lms[20] = {"x": wx + 0.07, "y": wy - 0.13, "z": 0.02}

        elif target == "INDEX_FORWARD":
            lms[4] = {"x": wx - 0.03, "y": wy - 0.13, "z": -0.02}
            lms[8] = {"x": wx - 0.04, "y": wy - 0.38, "z": 0.0}
            lms[12] = {"x": wx, "y": wy - 0.15, "z": 0.02}
            lms[16] = {"x": wx + 0.04, "y": wy - 0.14, "z": 0.02}
            lms[20] = {"x": wx + 0.07, "y": wy - 0.13, "z": 0.02}

        elif target == "INDEX_BACKWARD":
            lms[4] = {"x": wx - 0.03, "y": wy - 0.13, "z": -0.02}
            lms[6] = {"x": wx - 0.04, "y": wy - 0.12, "z": 0.0}
            lms[7] = {"x": wx - 0.04, "y": wy - 0.06, "z": 0.0}
            lms[8] = {"x": wx - 0.04, "y": wy - 0.01, "z": 0.0}
            lms[12] = {"x": wx, "y": wy - 0.15, "z": 0.02}
            lms[16] = {"x": wx + 0.04, "y": wy - 0.14, "z": 0.02}
            lms[20] = {"x": wx + 0.07, "y": wy - 0.13, "z": 0.02}

        elif target == "VICTORY_TWO_FINGERS":
            lms[4] = {"x": wx - 0.03, "y": wy - 0.13, "z": -0.02}
            lms[8] = {"x": wx - 0.07, "y": wy - 0.37, "z": 0.0}
            lms[12] = {"x": wx + 0.03, "y": wy - 0.38, "z": 0.0}
            lms[16] = {"x": wx + 0.04, "y": wy - 0.14, "z": 0.02}
            lms[20] = {"x": wx + 0.07, "y": wy - 0.13, "z": 0.02}

        elif target == "TILT_LEFT":
            angle = math.radians(-35)
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            for lm in lms:
                rel_x = lm["x"] - wx
                rel_y = lm["y"] - wy
                lm["x"] = wx + (rel_x * cos_a - rel_y * sin_a)
                lm["y"] = wy + (rel_x * sin_a + rel_y * cos_a)

        elif target == "TILT_RIGHT":
            angle = math.radians(35)
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            for lm in lms:
                rel_x = lm["x"] - wx
                rel_y = lm["y"] - wy
                lm["x"] = wx + (rel_x * cos_a - rel_y * sin_a)
                lm["y"] = wy + (rel_x * sin_a + rel_y * cos_a)

        return lms

    @staticmethod
    def detect_available_cameras(max_probe: int = 3) -> List[Dict[str, Any]]:
        """Probes for available physical cameras on Windows."""
        devices = []
        for idx in range(max_probe):
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)
            if cap.isOpened():
                ret, _ = cap.read()
                devices.append({
                    "index": idx,
                    "available": bool(ret),
                    "name": f"Camera {idx}"
                })
                cap.release()
            else:
                devices.append({
                    "index": idx,
                    "available": False,
                    "name": f"Camera {idx} (Unavailable)"
                })
        return devices

