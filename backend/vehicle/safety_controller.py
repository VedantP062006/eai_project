"""
Safety Controller and Arbiter.
Enforces emergency-stop priority, conflict prevention, hand-presence deadman stop,
manual override priority, and logs safety violations to database.
"""

import time
from typing import Dict, Any, Tuple, Optional
from backend.vehicle.simulation import VehicleSimulation
from backend.database import log_command, log_event


class SafetyController:
    def __init__(self, vehicle: VehicleSimulation, gesture_map: Dict[str, str]):
        self.vehicle = vehicle
        self.gesture_map = gesture_map
        self.active_control_mode = "GESTURE"  # GESTURE, MANUAL, DEMO
        self.safety_lockout = False
        self.last_safety_warning = ""
        self.hand_present = False
        self.camera_operational = True
        self.model_operational = True

    def update_gesture_map(self, new_map: Dict[str, str]):
        self.gesture_map = new_map

    def set_control_mode(self, mode: str):
        if mode in ("GESTURE", "MANUAL", "DEMO"):
            self.active_control_mode = mode

    def handle_deadman_trigger(self, reason: str = "Hand lost from camera"):
        """Called when hand disappears or camera fails."""
        if self.vehicle.speed != 0 or self.vehicle.target_speed != 0:
            self.vehicle.stop_vehicle()
            self.last_safety_warning = f"DEADMAN'S SWITCH TRIGGERED: {reason}"
            log_event("HAND_LOST", "WARNING", f"Vehicle automatically stopped: {reason}")
            log_command("NO_HAND", "STOP", 1.0, "SAFETY_BLOCKED", "SYSTEM", reason)

    def execute_gesture_command(
        self,
        gesture: str,
        confidence: float,
        is_stable: bool
    ) -> Tuple[bool, str, str]:
        """
        Translates stable gesture to vehicle command through safety gate.
        Returns: (success: bool, command: str, message: str)
        """
        # If in manual mode, ignore gesture commands unless it's EMERGENCY_STOP (highest safety priority)
        mapped_command = self.gesture_map.get(gesture, "NONE")

        # Emergency Stop always executes immediately regardless of mode or stability!
        if gesture == "CLOSED_FIST" or mapped_command == "EMERGENCY_STOP":
            self.vehicle.emergency_stop()
            self.safety_lockout = True
            self.last_safety_warning = "EMERGENCY STOP ENGAGED via CLOSED FIST"
            log_event("ESTOP", "CRITICAL", "Emergency stop triggered via hand gesture CLOSED_FIST.")
            log_command(gesture, "EMERGENCY_STOP", confidence, "SUCCESS", "GESTURE", "Priority Emergency Stop")
            return True, "EMERGENCY_STOP", "Emergency Stop Activated"

        if self.active_control_mode == "MANUAL":
            return False, mapped_command, "Ignored: System in MANUAL mode"

        if not is_stable:
            return False, mapped_command, "Ignored: Gesture unstable / in transition"

        # Check if vehicle is locked in Emergency Stop
        if self.vehicle.engine_state == "EMERGENCY_STOPPED":
            if mapped_command == "START_SIMULATION" or gesture == "THUMB_UP":
                # Thumb up re-enables system after E-stop
                self.vehicle.reset_emergency_stop()
                self.vehicle.start_engine()
                self.safety_lockout = False
                self.last_safety_warning = ""
                log_event("RECOVERY", "INFO", "System recovered and restarted after Emergency Stop via THUMB_UP.")
                log_command(gesture, "START_SIMULATION", confidence, "SUCCESS", "GESTURE", "Recovery from E-Stop")
                return True, "START_SIMULATION", "Emergency Stop Cleared. Engine Running."
            else:
                self.last_safety_warning = "Vehicle LOCKED in Emergency Stop. Show THUMB_UP to re-enable."
                return False, mapped_command, "Rejected: Vehicle locked in Emergency Stop"

        # Check vehicle activation requirement for movement commands
        movement_commands = ("FORWARD", "REVERSE", "TURN_LEFT", "TURN_RIGHT")
        if mapped_command in movement_commands and self.vehicle.engine_state != "RUNNING":
            self.last_safety_warning = "Movement locked: Start engine with THUMB_UP first."
            log_command(gesture, mapped_command, confidence, "SAFETY_BLOCKED", "GESTURE", "Engine not running")
            return False, mapped_command, "Movement rejected: Engine not started"

        # Execute mapped command
        success = False
        message = ""

        if mapped_command == "START_SIMULATION":
            success = self.vehicle.start_engine()
            message = "Simulation Engine Started"

        elif mapped_command == "STOP":
            success = self.vehicle.stop_vehicle()
            message = "Vehicle Stopped"

        elif mapped_command == "FORWARD":
            success = self.vehicle.forward()
            message = "Accelerating Forward"

        elif mapped_command == "REVERSE":
            success = self.vehicle.reverse()
            message = "Reversing"

        elif mapped_command == "TURN_LEFT":
            success = self.vehicle.turn_left()
            message = "Steering Left"

        elif mapped_command == "TURN_RIGHT":
            success = self.vehicle.turn_right()
            message = "Steering Right"

        elif mapped_command == "TOGGLE_LIGHTS":
            state = self.vehicle.toggle_headlights()
            success = True
            message = f"Headlights {'ON' if state else 'OFF'}"

        elif mapped_command == "CONFIRM_ACTION":
            # Horn chirp or action confirmation
            self.vehicle.set_horn(True)
            time.sleep(0.1)
            self.vehicle.set_horn(False)
            success = True
            message = "Action Confirmed via Held Palm"

        else:
            return False, mapped_command, f"No command mapped for gesture {gesture}"

        result_status = "SUCCESS" if success else "REJECTED"
        log_command(gesture, mapped_command, confidence, result_status, "GESTURE", message)
        return success, mapped_command, message

    def execute_manual_command(self, command: str, value: Any = None) -> Tuple[bool, str]:
        """
        Executes a manual command from dashboard or keyboard override.
        """
        success = False
        message = ""

        if command == "EMERGENCY_STOP":
            self.vehicle.emergency_stop()
            self.safety_lockout = True
            self.last_safety_warning = "MANUAL EMERGENCY STOP ENGAGED"
            log_event("ESTOP", "CRITICAL", "Manual Emergency Stop initiated from dashboard/keyboard.")
            log_command("MANUAL_KEY", "EMERGENCY_STOP", 1.0, "SUCCESS", "MANUAL", "Manual E-Stop")
            return True, "Emergency Stop Triggered"

        elif command == "RESET_ESTOP":
            success = self.vehicle.reset_emergency_stop()
            self.safety_lockout = False
            self.last_safety_warning = ""
            log_event("RECOVERY", "INFO", "Manual reset of Emergency Stop performed.")
            log_command("MANUAL_KEY", "MANUAL_RESET_ESTOP", 1.0, "SUCCESS", "MANUAL", "Reset E-Stop")
            return success, "Emergency Stop Cleared"

        # Check lockout
        if self.vehicle.engine_state == "EMERGENCY_STOPPED":
            return False, "Vehicle locked in Emergency Stop. Reset first."

        if command == "START":
            success = self.vehicle.start_engine()
            message = "Engine Started"
        elif command == "STOP":
            success = self.vehicle.stop_vehicle()
            message = "Vehicle Stopped"
        elif command == "FORWARD":
            success = self.vehicle.forward()
            message = "Moving Forward"
        elif command == "REVERSE":
            success = self.vehicle.reverse()
            message = "Reversing"
        elif command == "STEER_LEFT":
            success = self.vehicle.turn_left()
            message = "Steering Left"
        elif command == "STEER_RIGHT":
            success = self.vehicle.turn_right()
            message = "Steering Right"
        elif command == "STEER_STRAIGHT":
            success = self.vehicle.steer_straight()
            message = "Steering Centered"
        elif command == "TOGGLE_LIGHTS":
            state = self.vehicle.toggle_headlights()
            success = True
            message = f"Headlights {'ON' if state else 'OFF'}"
        elif command == "TOGGLE_LEFT_INDICATOR":
            state = self.vehicle.toggle_left_indicator()
            success = True
            message = f"Left Indicator {'ON' if state else 'OFF'}"
        elif command == "TOGGLE_RIGHT_INDICATOR":
            state = self.vehicle.toggle_right_indicator()
            success = True
            message = f"Right Indicator {'ON' if state else 'OFF'}"
        elif command == "TOGGLE_HAZARDS":
            state = self.vehicle.toggle_hazard_lights()
            success = True
            message = f"Hazards {'ON' if state else 'OFF'}"
        elif command == "HORN":
            is_active = bool(value)
            self.vehicle.set_horn(is_active)
            success = True
            message = "Horn Sounding" if is_active else "Horn Off"
        elif command == "SET_SPEED_MODE":
            mode = str(value)
            self.vehicle.set_speed_mode(mode)
            success = True
            message = f"Speed mode changed to {mode}"
        else:
            message = f"Unknown manual command: {command}"

        result_status = "SUCCESS" if success else "REJECTED"
        log_command("MANUAL_KEY", command, 1.0, result_status, "MANUAL", message)
        return success, message
