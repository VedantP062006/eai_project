"""
Hardware Serial Bridge for Arduino / ESP32 robotic vehicle integration.
Implements command formatting, heartbeat watchdog, connection retry, and Mock Serial mode.
"""

import time
import threading
from typing import Optional, Dict, Any, List

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False


class HardwareBridge:
    def __init__(
        self,
        port: str = "COM3",
        baud_rate: int = 115200,
        enabled: bool = False,
        mock_mode: bool = True,
        heartbeat_sec: float = 1.0
    ):
        self.port = port
        self.baud_rate = baud_rate
        self.enabled = enabled
        self.mock_mode = mock_mode
        self.heartbeat_sec = heartbeat_sec

        self.serial_conn: Optional[Any] = None
        self.is_connected = False
        self.last_sent_command = "NONE"
        self.last_heartbeat_time = time.time()
        self.mock_rx_buffer: List[str] = []
        self.mock_tx_buffer: List[str] = []

        self.lock = threading.Lock()
        self.running = False
        self.thread: Optional[threading.Thread] = None

    def start(self):
        """Starts hardware thread and connects if enabled."""
        self.running = True
        if self.enabled:
            self.connect()
        self.thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.thread.start()

    def stop(self):
        """Stops thread and disconnects."""
        self.running = False
        self.disconnect()

    def update_config(self, port: str, baud_rate: int, enabled: bool, mock_mode: bool):
        """Update hardware bridge configuration."""
        with self.lock:
            reconnect_needed = (port != self.port or baud_rate != self.baud_rate or mock_mode != self.mock_mode)
            self.port = port
            self.baud_rate = baud_rate
            self.enabled = enabled
            self.mock_mode = mock_mode

        if reconnect_needed and self.enabled:
            self.disconnect()
            self.connect()
        elif not self.enabled:
            self.disconnect()

    def connect(self) -> bool:
        """Connects to serial port or initializes mock serial."""
        if not self.enabled:
            return False

        if self.mock_mode:
            self.is_connected = True
            print(f"[HardwareBridge] MOCK Serial connected on virtual port {self.port} at {self.baud_rate} baud.")
            return True

        if not SERIAL_AVAILABLE:
            print("[HardwareBridge] pyserial not available. Falling back to mock mode.")
            self.mock_mode = True
            self.is_connected = True
            return True

        try:
            self.serial_conn = serial.Serial(self.port, self.baud_rate, timeout=1.0)
            self.is_connected = True
            print(f"[HardwareBridge] Connected to hardware on {self.port} at {self.baud_rate} baud.")
            return True
        except Exception as e:
            print(f"[HardwareBridge] Failed to open {self.port}: {e}. Switching to Mock Mode.")
            self.mock_mode = True
            self.is_connected = True
            return False

    def disconnect(self):
        """Closes the serial connection."""
        self.is_connected = False
        if self.serial_conn:
            try:
                self.serial_conn.close()
            except Exception:
                pass
            self.serial_conn = None

    def send_command(self, action: str, param: str = "0") -> bool:
        """
        Formats and transmits a command string: `CMD:<ACTION>:<PARAM>\n`
        Supported actions: STOP, FORWARD, REVERSE, LEFT, RIGHT, LIGHTS_ON, LIGHTS_OFF, HORN_ON, HORN_OFF, ESTOP
        """
        if not self.enabled:
            return False

        payload = f"CMD:{action}:{param}\n"
        with self.lock:
            self.last_sent_command = payload.strip()
            self.last_heartbeat_time = time.time()

            if self.mock_mode:
                self.mock_tx_buffer.append(self.last_sent_command)
                if len(self.mock_tx_buffer) > 50:
                    self.mock_tx_buffer.pop(0)
                # Mock response
                self.mock_rx_buffer.append(f"ACK:{action}")
                return True

            if self.serial_conn and self.is_connected:
                try:
                    self.serial_conn.write(payload.encode("utf-8"))
                    self.serial_conn.flush()
                    return True
                except Exception as e:
                    print(f"[HardwareBridge] Send error: {e}")
                    self.is_connected = False
                    return False
        return False

    def _heartbeat_loop(self):
        """Sends periodic heartbeat to maintain physical robot safety watchdog."""
        while self.running:
            time.sleep(0.5)
            if self.enabled and self.is_connected:
                now = time.time()
                if now - self.last_heartbeat_time >= self.heartbeat_sec:
                    self.send_command("HEARTBEAT", str(int(now)))

    def get_status(self) -> Dict[str, Any]:
        """Returns bridge status for UI dashboard."""
        available_ports = []
        if SERIAL_AVAILABLE:
            try:
                available_ports = [p.device for p in serial.tools.list_ports.comports()]
            except Exception:
                pass

        return {
            "enabled": self.enabled,
            "connected": self.is_connected,
            "mock_mode": self.mock_mode,
            "port": self.port,
            "baud_rate": self.baud_rate,
            "last_command": self.last_sent_command,
            "available_ports": available_ports or ["COM1", "COM3", "COM4", "/dev/ttyUSB0"],
            "mock_tx_recent": self.mock_tx_buffer[-5:]
        }
