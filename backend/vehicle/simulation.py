"""
Vehicle Simulation Engine.
Implements realistic 2D vehicle kinematics, engine lifecycle, steering, speed modes,
headlights, indicators, brake lights, horn, and telemetry state.
"""

import math
import time
from typing import Dict, Any, Optional
from backend.config import DEFAULT_SETTINGS


class VehicleSimulation:
    def __init__(self, settings: Optional[Dict[str, Any]] = None):
        self.settings = DEFAULT_SETTINGS.copy()
        if settings:
            self.settings.update(settings)

        # Engine & Transmission
        self.engine_state = "STOPPED"  # STOPPED, RUNNING, EMERGENCY_STOPPED
        self.gear = "P"                # P, R, N, D
        self.speed_mode = "NORMAL"     # ECO, NORMAL, SPORT

        # Kinematics
        self.speed = 0.0               # km/h (-reverse to +forward)
        self.target_speed = 0.0        # km/h
        self.steering_angle = 0.0      # degrees (-35 to +35)
        self.target_steering_angle = 0.0

        # Spatial Coordinates (Simulation World)
        self.x = 400.0                 # Center of canvas
        self.y = 300.0
        self.heading = 0.0             # degrees (0 = North / Up)
        self.odometer = 0.0            # km

        # Electrical & Signals
        self.headlights = False
        self.left_indicator = False
        self.right_indicator = False
        self.hazard_lights = False
        self.brake_lights = False
        self.horn = False

        # Blinking state timers
        self.indicator_blink_phase = False
        self.last_blink_time = time.time()
        self.blink_interval = 0.45     # seconds

        # Safety & Lockout
        self.last_command = "INITIAL_IDLE"
        self.last_command_time = time.time()

    def update_settings(self, new_settings: Dict[str, Any]):
        """Dynamically update kinematics settings."""
        self.settings.update(new_settings)

    def get_max_forward_speed(self) -> float:
        if self.speed_mode == "ECO":
            return float(self.settings.get("max_speed_eco", 25.0))
        elif self.speed_mode == "SPORT":
            return float(self.settings.get("max_speed_sport", 85.0))
        return float(self.settings.get("max_speed_normal", 50.0))

    def get_max_reverse_speed(self) -> float:
        return float(self.settings.get("max_reverse_speed", 22.0))

    # --- Vehicle Control Handlers ---

    def start_engine(self) -> bool:
        """Starts vehicle engine if not locked in Emergency Stop."""
        if self.engine_state == "EMERGENCY_STOPPED":
            return False
        self.engine_state = "RUNNING"
        self.gear = "D"
        self.last_command = "START_SIMULATION"
        self.last_command_time = time.time()
        return True

    def stop_vehicle(self) -> bool:
        """Normal smooth stop."""
        self.target_speed = 0.0
        self.target_steering_angle = 0.0
        self.brake_lights = True
        self.last_command = "STOP"
        self.last_command_time = time.time()
        return True

    def emergency_stop(self) -> bool:
        """Immediate high-priority emergency stop. Locks engine until manual re-enable."""
        self.engine_state = "EMERGENCY_STOPPED"
        self.speed = 0.0
        self.target_speed = 0.0
        self.target_steering_angle = 0.0
        self.gear = "P"
        self.brake_lights = True
        self.hazard_lights = True
        self.last_command = "EMERGENCY_STOP"
        self.last_command_time = time.time()
        return True

    def reset_emergency_stop(self) -> bool:
        """Clears Emergency Stop lockout back to STOPPED status."""
        if self.engine_state == "EMERGENCY_STOPPED":
            self.engine_state = "STOPPED"
            self.hazard_lights = False
            self.brake_lights = False
            self.last_command = "MANUAL_RESET_ESTOP"
            self.last_command_time = time.time()
            return True
        return False

    def forward(self) -> bool:
        """Accelerate forward."""
        if self.engine_state != "RUNNING":
            return False
        self.gear = "D"
        self.target_speed = self.get_max_forward_speed()
        self.brake_lights = False
        self.last_command = "FORWARD"
        self.last_command_time = time.time()
        return True

    def reverse(self) -> bool:
        """Move backward."""
        if self.engine_state != "RUNNING":
            return False
        self.gear = "R"
        self.target_speed = -self.get_max_reverse_speed()
        self.brake_lights = False
        self.last_command = "REVERSE"
        self.last_command_time = time.time()
        return True

    def turn_left(self) -> bool:
        """Turn steering left."""
        max_angle = float(self.settings.get("max_steer_angle", 35.0))
        self.target_steering_angle = -max_angle
        self.last_command = "TURN_LEFT"
        self.last_command_time = time.time()
        return True

    def turn_right(self) -> bool:
        """Turn steering right."""
        max_angle = float(self.settings.get("max_steer_angle", 35.0))
        self.target_steering_angle = max_angle
        self.last_command = "TURN_RIGHT"
        self.last_command_time = time.time()
        return True

    def steer_straight(self) -> bool:
        """Center steering wheel."""
        self.target_steering_angle = 0.0
        return True

    def toggle_headlights(self) -> bool:
        self.headlights = not self.headlights
        self.last_command = "TOGGLE_LIGHTS"
        self.last_command_time = time.time()
        return self.headlights

    def toggle_left_indicator(self) -> bool:
        self.left_indicator = not self.left_indicator
        if self.left_indicator:
            self.right_indicator = False
            self.hazard_lights = False
        self.last_command = "TOGGLE_LEFT_INDICATOR"
        self.last_command_time = time.time()
        return self.left_indicator

    def toggle_right_indicator(self) -> bool:
        self.right_indicator = not self.right_indicator
        if self.right_indicator:
            self.left_indicator = False
            self.hazard_lights = False
        self.last_command = "TOGGLE_RIGHT_INDICATOR"
        self.last_command_time = time.time()
        return self.right_indicator

    def toggle_hazard_lights(self) -> bool:
        self.hazard_lights = not self.hazard_lights
        if self.hazard_lights:
            self.left_indicator = False
            self.right_indicator = False
        self.last_command = "TOGGLE_HAZARDS"
        self.last_command_time = time.time()
        return self.hazard_lights

    def set_horn(self, active: bool):
        self.horn = active
        self.last_command = "HORN_ON" if active else "HORN_OFF"
        self.last_command_time = time.time()

    def set_speed_mode(self, mode: str) -> str:
        if mode in ("ECO", "NORMAL", "SPORT"):
            self.speed_mode = mode
            self.last_command = f"SPEED_MODE_{mode}"
            self.last_command_time = time.time()
        return self.speed_mode

    # --- Physics Kinematic Integration Loop ---

    def tick(self, dt: float = 0.033):
        """
        Integrates kinematics forward by dt seconds (~30Hz).
        """
        now = time.time()

        # Update indicator blink cycle
        if now - self.last_blink_time >= self.blink_interval:
            self.indicator_blink_phase = not self.indicator_blink_phase
            self.last_blink_time = now

        # If emergency stopped, keep vehicle anchored
        if self.engine_state == "EMERGENCY_STOPPED":
            self.speed = 0.0
            self.target_speed = 0.0
            self.brake_lights = True
            return

        # Smooth steering angle interpolation
        steer_rate = float(self.settings.get("steer_speed", 70.0))
        steer_diff = self.target_steering_angle - self.steering_angle
        if abs(steer_diff) > 0.1:
            step = math.copysign(min(abs(steer_diff), steer_rate * dt), steer_diff)
            self.steering_angle += step
        else:
            self.steering_angle = self.target_steering_angle

        # Speed adjustment with realistic acceleration / braking / friction
        accel_rate = float(self.settings.get("acceleration_rate", 18.0))
        brake_rate = float(self.settings.get("braking_rate", 38.0))
        friction_rate = float(self.settings.get("natural_friction", 8.0))

        if self.target_speed > self.speed:
            # Accelerating forward
            if self.speed < 0:
                # Braking reverse to forward
                self.speed += brake_rate * dt
                self.brake_lights = True
            else:
                self.speed += accel_rate * dt
                self.brake_lights = False
            if self.speed > self.target_speed:
                self.speed = self.target_speed

        elif self.target_speed < self.speed:
            # Decelerating or reversing
            if self.speed > 0:
                # Braking forward
                self.speed -= brake_rate * dt
                self.brake_lights = True
            else:
                # Accelerating reverse
                self.speed -= accel_rate * dt
                self.brake_lights = False
            if self.speed < self.target_speed:
                self.speed = self.target_speed

        else:
            # Constant speed or resting
            if abs(self.speed) > 0.1 and self.target_speed == 0:
                # Coasting to stop with friction
                drag = friction_rate * dt
                if abs(self.speed) <= drag:
                    self.speed = 0.0
                else:
                    self.speed -= math.copysign(drag, self.speed)
                self.brake_lights = True
            else:
                self.brake_lights = (self.speed == 0.0 and self.gear == "P")

        # Update gear indicator
        if self.engine_state == "STOPPED":
            self.gear = "P"
        elif self.speed > 0.5:
            self.gear = "D"
        elif self.speed < -0.5:
            self.gear = "R"
        elif self.target_speed == 0 and abs(self.speed) < 0.5:
            self.gear = "N" if self.engine_state == "RUNNING" else "P"

        # Update position and heading based on bicycle kinematics model
        if abs(self.speed) > 0.1:
            # Speed in meters/sec (1 km/h = 1/3.6 m/s)
            # In canvas pixel world, scale 1 meter = 8 pixels
            speed_px_per_sec = (self.speed / 3.6) * 14.0
            dist_step = speed_px_per_sec * dt

            # Update heading based on steering angle and wheelbase
            wheelbase_px = 65.0
            steer_rad = math.radians(self.steering_angle)
            angular_velocity = (speed_px_per_sec / wheelbase_px) * math.tan(steer_rad)
            self.heading += math.degrees(angular_velocity * dt)
            self.heading %= 360.0

            # Update coordinates along current heading
            heading_rad = math.radians(self.heading)
            self.x += dist_step * math.sin(heading_rad)
            self.y -= dist_step * math.cos(heading_rad)  # Screen coordinates (y up is negative)

            # Keep vehicle within toroidal or bounded canvas bounds (wrap around for endless drive)
            world_w, world_h = 1200.0, 900.0
            if self.x < 0:
                self.x += world_w
            elif self.x > world_w:
                self.x -= world_w
            if self.y < 0:
                self.y += world_h
            elif self.y > world_h:
                self.y -= world_h

            # Accumulate odometer
            self.odometer += abs((self.speed / 3600.0) * dt)

    def get_telemetry(self) -> Dict[str, Any]:
        """Returns complete vehicle state dictionary for WebSocket broadcast."""
        return {
            "engine_state": self.engine_state,
            "gear": self.gear,
            "speed_mode": self.speed_mode,
            "speed": round(self.speed, 1),
            "target_speed": round(self.target_speed, 1),
            "steering_angle": round(self.steering_angle, 1),
            "heading": round(self.heading, 1),
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "odometer": round(self.odometer, 2),
            "headlights": self.headlights,
            "left_indicator": self.left_indicator,
            "right_indicator": self.right_indicator,
            "hazard_lights": self.hazard_lights,
            "brake_lights": self.brake_lights,
            "horn": self.horn,
            "indicator_blink_active": (
                self.indicator_blink_phase and (self.left_indicator or self.right_indicator or self.hazard_lights)
            ),
            "last_command": self.last_command,
            "last_command_time": self.last_command_time,
        }
