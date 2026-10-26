"""
Unit tests for Safety Controller: Priority Emergency Stop, Deadman Switch, Conflict Prevention.
"""

import pytest
from backend.config import DEFAULT_GESTURE_MAP
from backend.vehicle.simulation import VehicleSimulation
from backend.vehicle.safety_controller import SafetyController
from backend.database import init_db


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


@pytest.fixture
def vehicle():
    return VehicleSimulation()


@pytest.fixture
def safety_controller(vehicle):
    return SafetyController(vehicle=vehicle, gesture_map=DEFAULT_GESTURE_MAP.copy())


def test_emergency_stop_priority(safety_controller, vehicle):
    vehicle.start_engine()
    vehicle.forward()

    # Closed fist must immediately emergency stop regardless of stability
    success, cmd, msg = safety_controller.execute_gesture_command(
        gesture="CLOSED_FIST",
        confidence=0.95,
        is_stable=False
    )
    assert success is True
    assert cmd == "EMERGENCY_STOP"
    assert vehicle.engine_state == "EMERGENCY_STOPPED"
    assert vehicle.speed == 0.0


def test_movement_prevented_before_engine_start(safety_controller, vehicle):
    assert vehicle.engine_state == "STOPPED"

    # Forward command while stopped must be rejected
    success, cmd, msg = safety_controller.execute_gesture_command(
        gesture="INDEX_FORWARD",
        confidence=0.92,
        is_stable=True
    )
    assert success is False
    assert "not started" in msg.lower() or "rejected" in msg.lower()


def test_recovery_from_emergency_stop(safety_controller, vehicle):
    vehicle.emergency_stop()
    assert vehicle.engine_state == "EMERGENCY_STOPPED"

    # Forward must fail while emergency stopped
    success, cmd, msg = safety_controller.execute_gesture_command(
        gesture="INDEX_FORWARD",
        confidence=0.92,
        is_stable=True
    )
    assert success is False

    # Thumb up clears emergency stop and starts engine
    success, cmd, msg = safety_controller.execute_gesture_command(
        gesture="THUMB_UP",
        confidence=0.95,
        is_stable=True
    )
    assert success is True
    assert vehicle.engine_state == "RUNNING"


def test_deadman_switch(safety_controller, vehicle):
    vehicle.start_engine()
    vehicle.forward()
    for _ in range(10):
        vehicle.tick(0.033)

    assert vehicle.speed > 0
    safety_controller.handle_deadman_trigger("Hand disappeared from camera")
    assert vehicle.target_speed == 0.0


def test_manual_override_priority(safety_controller, vehicle):
    safety_controller.set_control_mode("MANUAL")
    vehicle.start_engine()

    # In manual mode, gesture movement commands are ignored
    success, cmd, msg = safety_controller.execute_gesture_command(
        gesture="INDEX_FORWARD",
        confidence=0.95,
        is_stable=True
    )
    assert success is False
    assert "manual mode" in msg.lower()

    # But manual dashboard command succeeds
    success, msg = safety_controller.execute_manual_command("FORWARD")
    assert success is True
