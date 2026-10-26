"""
Configuration and Defaults for the AI Gesture-Controlled Smart Vehicle System
"""

import os
from pathlib import Path
from typing import Dict, Any

# Base directories
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODELS_DIR = BASE_DIR / "models"
DB_PATH = BASE_DIR / "vehicle_system.db"

# Model paths
HAND_LANDMARKER_MODEL = MODELS_DIR / "hand_landmarker.task"
GESTURE_RECOGNIZER_MODEL = MODELS_DIR / "gesture_recognizer.task"

# Default Gesture-to-Command Mapping
DEFAULT_GESTURE_MAP: Dict[str, str] = {
    "OPEN_PALM": "STOP",
    "CLOSED_FIST": "EMERGENCY_STOP",
    "THUMB_UP": "START_SIMULATION",
    "INDEX_FORWARD": "FORWARD",
    "INDEX_BACKWARD": "REVERSE",
    "TILT_LEFT": "TURN_LEFT",
    "TILT_RIGHT": "TURN_RIGHT",
    "VICTORY_TWO_FINGERS": "TOGGLE_LIGHTS",
    "OPEN_PALM_HELD": "CONFIRM_ACTION",
}

# Supported Vehicle Commands
SUPPORTED_COMMANDS = [
    "START_SIMULATION",
    "STOP",
    "EMERGENCY_STOP",
    "FORWARD",
    "REVERSE",
    "TURN_LEFT",
    "TURN_RIGHT",
    "STEER_STRAIGHT",
    "TOGGLE_LIGHTS",
    "TOGGLE_LEFT_INDICATOR",
    "TOGGLE_RIGHT_INDICATOR",
    "TOGGLE_HAZARDS",
    "HORN_ON",
    "HORN_OFF",
    "CONFIRM_ACTION",
    "SET_SPEED_MODE",
    "MANUAL_RESET_ESTOP",
]

# Supported Gestures
SUPPORTED_GESTURES = [
    "OPEN_PALM",
    "CLOSED_FIST",
    "THUMB_UP",
    "INDEX_FORWARD",
    "INDEX_BACKWARD",
    "TILT_LEFT",
    "TILT_RIGHT",
    "VICTORY_TWO_FINGERS",
    "OPEN_PALM_HELD",
    "NO_HAND",
    "UNKNOWN",
]

# Vision and Recognition Defaults
DEFAULT_SETTINGS: Dict[str, Any] = {
    "confidence_threshold": 0.65,
    "stability_frame_count": 3,
    "hold_confirmation_sec": 1.2,
    "deadman_timeout_sec": 0.6,
    "camera_index": 0,
    "camera_fps": 30,
    "demo_mode": False,
    "auto_enable_movement": False,
    
    # Vehicle Kinematics
    "max_speed_eco": 25.0,
    "max_speed_normal": 50.0,
    "max_speed_sport": 85.0,
    "max_reverse_speed": 22.0,
    "acceleration_rate": 18.0,
    "braking_rate": 38.0,
    "natural_friction": 8.0,
    "max_steer_angle": 35.0,
    "steer_speed": 70.0,
    "steer_centering_speed": 60.0,
    
    # Hardware Configuration
    "hardware_enabled": False,
    "hardware_port": "COM3",
    "hardware_baud": 115200,
    "hardware_mock_mode": True,
    "hardware_heartbeat_sec": 1.0,
}
