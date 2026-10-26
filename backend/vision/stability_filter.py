"""
Gesture Stability and Temporal Validation Filter.
Applies sliding window frame buffering, confidence thresholds, hold duration tracking,
and deadman's automatic stop when hands disappear.
"""

import time
from collections import deque
from typing import Optional, Tuple, Dict, Any


class StabilityFilter:
    def __init__(
        self,
        confidence_threshold: float = 0.65,
        required_consecutive_frames: int = 4,
        hold_confirmation_sec: float = 1.5,
        deadman_timeout_sec: float = 0.6
    ):
        self.confidence_threshold = confidence_threshold
        self.required_consecutive_frames = required_consecutive_frames
        self.hold_confirmation_sec = hold_confirmation_sec
        self.deadman_timeout_sec = deadman_timeout_sec

        self.history = deque(maxlen=20)
        self.current_candidate_gesture: str = "NO_HAND"
        self.consecutive_count: int = 0
        self.last_stable_gesture: str = "NO_HAND"
        self.last_stable_confidence: float = 0.0

        # Timing
        self.gesture_start_time: float = time.time()
        self.last_hand_seen_time: float = time.time()
        self.hold_action_dispatched: bool = False

    def update_settings(self, settings: Dict[str, Any]):
        """Update filter parameters dynamically from settings."""
        if "confidence_threshold" in settings:
            self.confidence_threshold = float(settings["confidence_threshold"])
        if "stability_frame_count" in settings:
            self.required_consecutive_frames = int(settings["stability_frame_count"])
        if "hold_confirmation_sec" in settings:
            self.hold_confirmation_sec = float(settings["hold_confirmation_sec"])
        if "deadman_timeout_sec" in settings:
            self.deadman_timeout_sec = float(settings["deadman_timeout_sec"])

    def process(self, raw_gesture: str, confidence: float) -> Dict[str, Any]:
        """
        Processes a raw frame gesture and returns the validated stable gesture,
        its confidence, stability count, hold progress, and whether it is a deadman trigger.
        """
        now = time.time()

        # Check for hand presence
        if raw_gesture != "NO_HAND":
            self.last_hand_seen_time = now
        else:
            # Check deadman's timeout
            if (now - self.last_hand_seen_time) >= self.deadman_timeout_sec:
                # Deadman's trigger: Hand lost for longer than timeout
                self.current_candidate_gesture = "NO_HAND"
                self.consecutive_count = 0
                self.last_stable_gesture = "NO_HAND"
                self.hold_action_dispatched = False
                return {
                    "stable_gesture": "NO_HAND",
                    "confidence": 1.0,
                    "consecutive_count": 0,
                    "required_frames": self.required_consecutive_frames,
                    "is_stable": True,
                    "deadman_triggered": True,
                    "hold_progress": 0.0,
                    "raw_gesture": raw_gesture
                }

        # Filter out low-confidence readings (except emergency fist which gets low latency priority)
        is_fist = (raw_gesture == "CLOSED_FIST")
        effective_threshold = 0.50 if is_fist else self.confidence_threshold

        if confidence < effective_threshold and raw_gesture != "NO_HAND":
            # Low confidence frame: count as jitter, do not reset immediately unless it persists
            return {
                "stable_gesture": self.last_stable_gesture,
                "confidence": self.last_stable_confidence,
                "consecutive_count": self.consecutive_count,
                "required_frames": self.required_consecutive_frames,
                "is_stable": False,
                "deadman_triggered": False,
                "hold_progress": 0.0,
                "raw_gesture": raw_gesture,
                "warning": "Low confidence frame filtered"
            }

        # Consecutive frame stability accumulation
        # Emergency stop fist only needs 2 frames for rapid response
        effective_required_frames = 2 if is_fist else self.required_consecutive_frames

        if raw_gesture == self.current_candidate_gesture:
            self.consecutive_count += 1
        else:
            self.current_candidate_gesture = raw_gesture
            self.consecutive_count = 1
            self.gesture_start_time = now
            self.hold_action_dispatched = False

        is_stable = (self.consecutive_count >= effective_required_frames)
        stable_gesture = self.last_stable_gesture

        if is_stable:
            stable_gesture = self.current_candidate_gesture
            self.last_stable_gesture = stable_gesture
            self.last_stable_confidence = confidence

        # Check for OPEN_PALM held confirmation
        hold_progress = 0.0
        if stable_gesture == "OPEN_PALM":
            duration = now - self.gesture_start_time
            hold_progress = min(1.0, duration / self.hold_confirmation_sec)
            if hold_progress >= 1.0 and not self.hold_action_dispatched:
                stable_gesture = "OPEN_PALM_HELD"
                self.hold_action_dispatched = True

        return {
            "stable_gesture": stable_gesture,
            "confidence": confidence if is_stable else self.last_stable_confidence,
            "consecutive_count": self.consecutive_count,
            "required_frames": effective_required_frames,
            "is_stable": is_stable,
            "deadman_triggered": False,
            "hold_progress": hold_progress,
            "raw_gesture": raw_gesture
        }

    def reset(self):
        """Reset internal filter state."""
        self.history.clear()
        self.consecutive_count = 0
        self.current_candidate_gesture = "NO_HAND"
        self.last_stable_gesture = "NO_HAND"
        self.last_stable_confidence = 0.0
        self.hold_action_dispatched = False
