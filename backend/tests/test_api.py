"""
Integration tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_api_status(client):
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "active_control_mode" in data


def test_api_manual_command(client):
    # Start engine manually
    response = client.post("/api/manual_command", json={"command": "START"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Steer left
    response = client.post("/api/manual_command", json={"command": "STEER_LEFT"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Trigger manual emergency stop
    response = client.post("/api/manual_command", json={"command": "EMERGENCY_STOP"})
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Reset emergency stop
    response = client.post("/api/manual_command", json={"command": "RESET_ESTOP"})
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_api_demo_mode_toggle(client):
    response = client.post("/api/camera/demo_mode", json={"enabled": True, "gesture": "THUMB_UP"})
    assert response.status_code == 200
    data = response.json()
    assert data["demo_mode"] is True
    assert data["demo_gesture"] == "THUMB_UP"


def test_api_gesture_map(client):
    response = client.get("/api/gesture_map")
    assert response.status_code == 200
    data = response.json()
    assert "gesture_map" in data
    assert data["gesture_map"]["CLOSED_FIST"] == "EMERGENCY_STOP"


def test_api_settings(client):
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "settings" in data
    assert "confidence_threshold" in data["settings"]


def test_api_command_history(client):
    response = client.get("/api/command_history?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert isinstance(data["logs"], list)
