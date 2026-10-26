"""
Landmark-based Geometric Gesture Classifier.
Accurately classifies 21 hand landmarks into vehicle gestures with high-precision confidence scoring.
"""

import math
from typing import List, Dict, Tuple, Optional, Any


def euclidean_distance(p1: Dict[str, float], p2: Dict[str, float]) -> float:
    """Calculates Euclidean distance between two landmark points."""
    return math.sqrt(
        (p1["x"] - p2["x"]) ** 2 +
        (p1["y"] - p2["y"]) ** 2 +
        (p1.get("z", 0.0) - p2.get("z", 0.0)) ** 2
    )


class GestureClassifier:
    """
    Classifies normalized hand landmarks:
    0: WRIST
    1: THUMB_CMC, 2: THUMB_MCP, 3: THUMB_IP, 4: THUMB_TIP
    5: INDEX_MCP, 6: INDEX_PIP, 7: INDEX_DIP, 8: INDEX_TIP
    9: MIDDLE_MCP, 10: MIDDLE_PIP, 11: MIDDLE_DIP, 12: MIDDLE_TIP
    13: RING_MCP, 14: RING_PIP, 15: RING_DIP, 16: RING_TIP
    17: PINKY_MCP, 18: PINKY_PIP, 19: PINKY_DIP, 20: PINKY_TIP
    """

    def __init__(self, tilt_threshold_deg: float = 20.0):
        self.tilt_threshold_deg = tilt_threshold_deg

    def analyze_fingers(self, landmarks: List[Dict[str, float]], handedness: str = "Right") -> Dict[str, Any]:
        """
        Calculates extension state, tuck status, and geometric orientation of each finger.
        """
        wrist = landmarks[0]

        # Palm scale (wrist to middle MCP)
        palm_size = euclidean_distance(wrist, landmarks[9])
        if palm_size < 1e-4:
            palm_size = 0.1

        # Check finger extensions
        # A finger is extended if its tip is noticeably farther from the wrist than its PIP joint
        index_ext = euclidean_distance(wrist, landmarks[8]) > (euclidean_distance(wrist, landmarks[6]) * 1.15)
        middle_ext = euclidean_distance(wrist, landmarks[12]) > (euclidean_distance(wrist, landmarks[10]) * 1.15)
        ring_ext = euclidean_distance(wrist, landmarks[16]) > (euclidean_distance(wrist, landmarks[14]) * 1.15)
        pinky_ext = euclidean_distance(wrist, landmarks[20]) > (euclidean_distance(wrist, landmarks[18]) * 1.15)

        # Check fingertip tucking (for true closed fist)
        index_tucked = euclidean_distance(landmarks[8], landmarks[5]) < (palm_size * 0.70)
        middle_tucked = euclidean_distance(landmarks[12], landmarks[9]) < (palm_size * 0.70)
        ring_tucked = euclidean_distance(landmarks[16], landmarks[13]) < (palm_size * 0.70)
        pinky_tucked = euclidean_distance(landmarks[20], landmarks[17]) < (palm_size * 0.70)

        # Thumb extension: tip relative to pinky MCP and wrist
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        thumb_mcp = landmarks[2]
        pinky_mcp = landmarks[17]

        thumb_ext = euclidean_distance(thumb_tip, pinky_mcp) > (euclidean_distance(thumb_ip, pinky_mcp) * 1.15)

        # Thumb vertical orientation (smaller y is higher in screen coordinates)
        thumb_pointing_up = (thumb_tip["y"] < thumb_ip["y"] < thumb_mcp["y"]) and ((thumb_mcp["y"] - thumb_tip["y"]) > 0.05)
        thumb_pointing_down = (thumb_tip["y"] > thumb_ip["y"] > thumb_mcp["y"]) and ((thumb_tip["y"] - thumb_mcp["y"]) > 0.05)

        # Index pointing direction
        index_pointing_down = (landmarks[8]["y"] > landmarks[6]["y"] > landmarks[5]["y"]) and ((landmarks[8]["y"] - landmarks[5]["y"]) > 0.06)
        index_pointing_up = (landmarks[8]["y"] < landmarks[6]["y"] < landmarks[5]["y"])

        # Hand tilt calculation: Vector from wrist (0) to middle MCP (9)
        dx = landmarks[9]["x"] - wrist["x"]
        dy = -(landmarks[9]["y"] - wrist["y"])  # invert y so upward is positive
        tilt_angle = math.degrees(math.atan2(dx, dy))

        return {
            "index_extended": index_ext,
            "middle_extended": middle_ext,
            "ring_extended": ring_ext,
            "pinky_extended": pinky_ext,
            "index_tucked": index_tucked,
            "middle_tucked": middle_tucked,
            "ring_tucked": ring_tucked,
            "pinky_tucked": pinky_tucked,
            "thumb_extended": thumb_ext,
            "thumb_pointing_up": thumb_pointing_up,
            "thumb_pointing_down": thumb_pointing_down,
            "index_pointing_down": index_pointing_down,
            "index_pointing_up": index_pointing_up,
            "tilt_angle": tilt_angle,
            "palm_size": palm_size
        }

    def classify(self, landmarks: Optional[List[Dict[str, float]]], handedness: str = "Right") -> Tuple[str, float]:
        """
        Classifies the 21 landmarks into one of the 9 vehicle gestures.
        Returns: (gesture_name, confidence_score)
        """
        if not landmarks or len(landmarks) < 21:
            return "NO_HAND", 0.0

        features = self.analyze_fingers(landmarks, handedness)
        idx_ext = features["index_extended"]
        mid_ext = features["middle_extended"]
        rng_ext = features["ring_extended"]
        pky_ext = features["pinky_extended"]
        thb_ext = features["thumb_extended"]
        tilt = features["tilt_angle"]

        extended_count = sum([idx_ext, mid_ext, rng_ext, pky_ext])

        # 1. Thumb pointing upward (Start / Enable simulation)
        # Thumb clearly pointing up, other 4 fingers folded
        if features["thumb_pointing_up"] and extended_count == 0:
            confidence = 0.95
            return "THUMB_UP", confidence

        # 2. Backward / Reverse (Thumb pointing down OR Index pointing down with others folded)
        if (features["thumb_pointing_down"] and extended_count == 0) or \
           (features["index_pointing_down"] and not mid_ext and not rng_ext and not pky_ext):
            confidence = 0.92
            return "INDEX_BACKWARD", confidence

        # 3. Closed Fist (Emergency Stop)
        # All 4 fingers folded closed, not pointing down, not thumb up
        if extended_count == 0 and not features["thumb_pointing_up"] and not features["thumb_pointing_down"] and not features["index_pointing_down"]:
            confidence = 0.94 if not thb_ext else 0.88
            return "CLOSED_FIST", confidence

        # 4. Hand tilted left / Hand tilted right (Steering)
        # When 3 or more fingers are extended and hand has clear tilt angle
        if extended_count >= 3:
            if tilt < -self.tilt_threshold_deg:
                confidence = min(1.0, 0.75 + abs(tilt) / 100.0)
                return "TILT_LEFT", confidence
            elif tilt > self.tilt_threshold_deg:
                confidence = min(1.0, 0.75 + abs(tilt) / 100.0)
                return "TILT_RIGHT", confidence

        # 5. Victory / Two Fingers Raised (Mode switch or Indicator toggle)
        # Index and Middle extended, Ring and Pinky folded, Thumb folded
        if idx_ext and mid_ext and not rng_ext and not pky_ext:
            tip_dist = euclidean_distance(landmarks[8], landmarks[12])
            mcp_dist = euclidean_distance(landmarks[5], landmarks[9])
            is_v_shape = tip_dist > (mcp_dist * 0.85)
            confidence = 0.94 if is_v_shape else 0.84
            return "VICTORY_TWO_FINGERS", confidence

        # 6. Index Finger Pointing Forward / Up (Move Forward)
        # Only Index extended, Middle, Ring, Pinky folded
        if idx_ext and not mid_ext and not rng_ext and not pky_ext:
            confidence = 0.93
            return "INDEX_FORWARD", confidence

        # 7. Open Palm (Stop Command)
        # 4 or 5 fingers extended, upright hand (within tilt threshold)
        if extended_count >= 4 and abs(tilt) <= self.tilt_threshold_deg:
            confidence = 0.95 if thb_ext else 0.88
            return "OPEN_PALM", confidence

        # Unknown / Transition gesture
        return "UNKNOWN", 0.40
