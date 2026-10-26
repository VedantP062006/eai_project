"""
High-Performance Hand Detection Module using MediaPipe HandLandmarker in VIDEO Mode.
Utilizes temporal tracking for a 20-30x speed boost (~60 FPS) on CPU.
"""

import time
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from backend.config import HAND_LANDMARKER_MODEL

# MediaPipe 21 Hand Landmark Connections
HAND_CONNECTIONS = [
    # Thumb
    (0, 1), (1, 2), (2, 3), (3, 4),
    # Index
    (0, 5), (5, 6), (6, 7), (7, 8),
    # Middle
    (5, 9), (9, 10), (10, 11), (11, 12),
    # Ring
    (9, 13), (13, 14), (14, 15), (15, 16),
    # Pinky
    (13, 17), (17, 18), (18, 19), (19, 20),
    # Palm Base
    (0, 17)
]


class HandDetector:
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or HAND_LANDMARKER_MODEL
        self.detector = None
        self.is_initialized = False
        self.last_timestamp_ms = 0
        self._init_detector()

    def _init_detector(self):
        """Initialize MediaPipe HandLandmarker in RunningMode.VIDEO for 60FPS tracking."""
        try:
            if not self.model_path.exists():
                print(f"[HandDetector] Model file not found at {self.model_path}")
                return

            base_options = python.BaseOptions(model_asset_path=str(self.model_path))
            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_hands=1,
                min_hand_detection_confidence=0.45,
                min_hand_presence_confidence=0.45,
                min_tracking_confidence=0.45
            )
            self.detector = vision.HandLandmarker.create_from_options(options)
            self.is_initialized = True
            print("[HandDetector] MediaPipe HandLandmarker initialized in high-speed VIDEO mode.")
        except Exception as e:
            print(f"[HandDetector] Initialization error: {e}")
            self.detector = None
            self.is_initialized = False

    def detect(self, bgr_frame: np.ndarray, timestamp_ms: Optional[int] = None) -> Tuple[Optional[List[Dict[str, float]]], Optional[str]]:
        """
        Detects hand in a BGR OpenCV image frame.
        Uses monotonic timestamp for VIDEO mode temporal tracking.
        Returns:
            landmarks: List of 21 dicts [{'x': float, 'y': float, 'z': float}, ...] or None
            handedness: 'Left', 'Right', or None
        """
        if not self.is_initialized or self.detector is None or bgr_frame is None:
            return None, None

        try:
            rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            # Ensure strictly increasing timestamp for VIDEO mode
            ts = timestamp_ms or int(time.time() * 1000)
            if ts <= self.last_timestamp_ms:
                ts = self.last_timestamp_ms + 1
            self.last_timestamp_ms = ts

            result = self.detector.detect_for_video(mp_image, ts)

            if result and result.hand_landmarks and len(result.hand_landmarks) > 0:
                raw_landmarks = result.hand_landmarks[0]
                landmarks = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in raw_landmarks]

                handedness = "Right"
                if result.handedness and len(result.handedness) > 0 and len(result.handedness[0]) > 0:
                    handedness = result.handedness[0][0].category_name

                return landmarks, handedness

            return None, None
        except Exception as e:
            print(f"[HandDetector] Detection error: {e}")
            return None, None

    @staticmethod
    def draw_landmarks(frame: np.ndarray, landmarks: List[Dict[str, float]], gesture_name: str = "", confidence: float = 0.0) -> np.ndarray:
        """
        Draws high-tech cybernetic skeleton and joints on the video frame.
        """
        if frame is None or not landmarks:
            return frame

        h, w, _ = frame.shape
        points = []

        # Convert normalized coordinates to pixel coordinates
        for lm in landmarks:
            px = int(lm["x"] * w)
            py = int(lm["y"] * h)
            points.append((px, py))

        # Color palette
        is_estop = gesture_name == "CLOSED_FIST"
        line_color = (0, 70, 255) if is_estop else (0, 240, 255)
        joint_color = (0, 0, 255) if is_estop else (255, 0, 128)

        # Draw futuristic connection lines
        for start_idx, end_idx in HAND_CONNECTIONS:
            pt1 = points[start_idx]
            pt2 = points[end_idx]
            cv2.line(frame, pt1, pt2, line_color, 2, cv2.LINE_AA)

        # Draw joints
        for idx, pt in enumerate(points):
            if idx in (4, 8, 12, 16, 20):  # Fingertips
                cv2.circle(frame, pt, 6, joint_color, -1, cv2.LINE_AA)
                cv2.circle(frame, pt, 8, (255, 255, 255), 1, cv2.LINE_AA)
            else:
                cv2.circle(frame, pt, 4, (0, 255, 200), -1, cv2.LINE_AA)

        # Draw hand bounding box with corner brackets
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        x_min, x_max = max(0, min(xs) - 16), min(w - 1, max(xs) + 16)
        y_min, y_max = max(0, min(ys) - 16), min(h - 1, max(ys) + 16)

        # Corner brackets
        c_len = 14
        box_col = (0, 70, 255) if is_estop else (0, 240, 255)
        cv2.line(frame, (x_min, y_min), (x_min + c_len, y_min), box_col, 2)
        cv2.line(frame, (x_min, y_min), (x_min, y_min + c_len), box_col, 2)
        cv2.line(frame, (x_max, y_min), (x_max - c_len, y_min), box_col, 2)
        cv2.line(frame, (x_max, y_min), (x_max, y_min + c_len), box_col, 2)
        cv2.line(frame, (x_min, y_max), (x_min + c_len, y_max), box_col, 2)
        cv2.line(frame, (x_min, y_max), (x_min, y_max - c_len), box_col, 2)
        cv2.line(frame, (x_max, y_max), (x_max - c_len, y_max), box_col, 2)
        cv2.line(frame, (x_max, y_max), (x_max, y_max - c_len), box_col, 2)

        # Label tag above bounding box
        if gesture_name:
            tag = f"{gesture_name} ({int(confidence * 100)}%)"
            cv2.rectangle(frame, (x_min, max(0, y_min - 22)), (x_min + len(tag) * 10, y_min), (8, 12, 22), -1)
            cv2.putText(
                frame,
                tag,
                (x_min + 3, max(16, y_min - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                box_col,
                1,
                cv2.LINE_AA
            )

        return frame
