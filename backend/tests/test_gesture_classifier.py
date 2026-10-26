"""
Unit tests for Landmark Geometric Gesture Classifier.
"""

import pytest
from backend.vision.gesture_classifier import GestureClassifier
from backend.vision.camera import CameraService


@pytest.fixture
def classifier():
    return GestureClassifier(tilt_threshold_deg=24.0)


@pytest.fixture
def camera_service():
    return CameraService(camera_index=0)


def test_no_hand_classification(classifier):
    gesture, confidence = classifier.classify(None)
    assert gesture == "NO_HAND"
    assert confidence == 0.0

    gesture, confidence = classifier.classify([])
    assert gesture == "NO_HAND"


def test_closed_fist_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("CLOSED_FIST")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "CLOSED_FIST"
    assert confidence >= 0.85


def test_thumb_up_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("THUMB_UP")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "THUMB_UP"
    assert confidence >= 0.85


def test_index_forward_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("INDEX_FORWARD")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "INDEX_FORWARD"
    assert confidence >= 0.85


def test_index_backward_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("INDEX_BACKWARD")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "INDEX_BACKWARD"
    assert confidence >= 0.85


def test_tilt_left_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("TILT_LEFT")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "TILT_LEFT"
    assert confidence >= 0.70


def test_tilt_right_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("TILT_RIGHT")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "TILT_RIGHT"
    assert confidence >= 0.70


def test_victory_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("VICTORY_TWO_FINGERS")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "VICTORY_TWO_FINGERS"
    assert confidence >= 0.80


def test_open_palm_classification(classifier, camera_service):
    landmarks = camera_service.get_synthetic_landmarks("OPEN_PALM")
    gesture, confidence = classifier.classify(landmarks)
    assert gesture == "OPEN_PALM"
    assert confidence >= 0.80
