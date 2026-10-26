"""
Unit tests for Vehicle Simulation Engine.
"""

import pytest
from backend.vehicle.simulation import VehicleSimulation


@pytest.fixture
def sim():
    return VehicleSimulation()


def test_initial_state(sim):
    assert sim.engine_state == "STOPPED"
    assert sim.gear == "P"
    assert sim.speed == 0.0
    assert not sim.headlights
    assert not sim.hazard_lights


def test_start_and_forward(sim):
    # Cannot move while STOPPED
    assert not sim.forward()

    # Start engine
    assert sim.start_engine()
    assert sim.engine_state == "RUNNING"
    assert sim.gear == "D"

    # Accelerate forward
    assert sim.forward()
    assert sim.target_speed > 0

    # Step simulation
    for _ in range(30):
        sim.tick(0.033)

    assert sim.speed > 0
    assert sim.gear == "D"


def test_emergency_stop_and_reset(sim):
    sim.start_engine()
    sim.forward()
    for _ in range(10):
        sim.tick(0.033)

    # Trigger E-Stop
    sim.emergency_stop()
    assert sim.engine_state == "EMERGENCY_STOPPED"
    assert sim.speed == 0.0
    assert sim.target_speed == 0.0
    assert sim.gear == "P"
    assert sim.hazard_lights is True

    # Cannot start while in emergency stopped
    assert not sim.start_engine()

    # Reset E-Stop
    assert sim.reset_emergency_stop()
    assert sim.engine_state == "STOPPED"

    # Now can start
    assert sim.start_engine()
    assert sim.engine_state == "RUNNING"


def test_steering_and_centering(sim):
    sim.start_engine()
    sim.turn_left()
    assert sim.target_steering_angle < 0

    for _ in range(30):
        sim.tick(0.033)
    assert sim.steering_angle < 0

    # Steer straight
    sim.steer_straight()
    assert sim.target_steering_angle == 0.0
    for _ in range(30):
        sim.tick(0.033)
    assert abs(sim.steering_angle) < 1.0


def test_lights_and_signals(sim):
    assert not sim.headlights
    sim.toggle_headlights()
    assert sim.headlights

    assert not sim.left_indicator
    sim.toggle_left_indicator()
    assert sim.left_indicator

    # Toggling right cancels left
    sim.toggle_right_indicator()
    assert sim.right_indicator
    assert not sim.left_indicator


def test_speed_modes(sim):
    sim.set_speed_mode("ECO")
    assert sim.get_max_forward_speed() == 25.0
    sim.set_speed_mode("SPORT")
    assert sim.get_max_forward_speed() == 85.0
