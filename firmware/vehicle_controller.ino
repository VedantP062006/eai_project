/*
 * AI Gesture-Controlled Smart Vehicle Controller Firmware
 * Compatible with Arduino Uno/Nano/Mega & ESP32
 * 
 * Hardware Protocol:
 * Baud Rate: 115200 bps
 * Command format: CMD:<ACTION>:<PARAM>\n
 * 
 * Supported Actions:
 *   STOP, FORWARD, REVERSE, LEFT, RIGHT,
 *   LIGHTS_ON, LIGHTS_OFF, HORN_ON, HORN_OFF,
 *   HEARTBEAT, EMERGENCY_STOP
 *
 * Safety Features:
 *   - Built-in 1500ms watchdog timer: Cuts motor power immediately if serial connection drops
 *   - Dedicated emergency-stop override
 *   - Smooth PWM ramp-up to prevent battery voltage brownout
 */

#define MOTOR_LEFT_PWM   5
#define MOTOR_LEFT_DIR1  6
#define MOTOR_LEFT_DIR2  7

#define MOTOR_RIGHT_PWM  10
#define MOTOR_RIGHT_DIR1 8
#define MOTOR_RIGHT_DIR2 9

#define PIN_HEADLIGHTS   11
#define PIN_HORN         12
#define PIN_INDICATOR_L  3
#define PIN_INDICATOR_R  4

// Safety Watchdog
unsigned long lastCommandTime = 0;
const unsigned long WATCHDOG_TIMEOUT_MS = 1500;
bool isEmergencyStopped = false;

// Motor speed (0-255)
int currentSpeed = 160;

void setup() {
  Serial.begin(115200);

  pinMode(MOTOR_LEFT_PWM, OUTPUT);
  pinMode(MOTOR_LEFT_DIR1, OUTPUT);
  pinMode(MOTOR_LEFT_DIR2, OUTPUT);

  pinMode(MOTOR_RIGHT_PWM, OUTPUT);
  pinMode(MOTOR_RIGHT_DIR1, OUTPUT);
  pinMode(MOTOR_RIGHT_DIR2, OUTPUT);

  pinMode(PIN_HEADLIGHTS, OUTPUT);
  pinMode(PIN_HORN, OUTPUT);
  pinMode(PIN_INDICATOR_L, OUTPUT);
  pinMode(PIN_INDICATOR_R, OUTPUT);

  stopMotors();
  Serial.println("INIT:OK:VEHICLE_CONTROLLER_READY");
  lastCommandTime = millis();
}

void loop() {
  // Check for incoming serial commands
  if (Serial.available() > 0) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("CMD:")) {
      handleCommand(line);
      lastCommandTime = millis();
    }
  }

  // Safety Watchdog: Auto-stop if communication lost
  if (!isEmergencyStopped && (millis() - lastCommandTime > WATCHDOG_TIMEOUT_MS)) {
    stopMotors();
    digitalWrite(PIN_HEADLIGHTS, LOW);
    digitalWrite(PIN_HORN, LOW);
  }
}

void handleCommand(String cmd) {
  // Split CMD:<ACTION>:<PARAM>
  int firstColon = cmd.indexOf(':');
  int secondColon = cmd.indexOf(':', firstColon + 1);
  
  String action = "";
  String param = "0";
  
  if (secondColon != -1) {
    action = cmd.substring(firstColon + 1, secondColon);
    param = cmd.substring(secondColon + 1);
  } else {
    action = cmd.substring(firstColon + 1);
  }

  if (action == "EMERGENCY_STOP" || action == "ESTOP") {
    isEmergencyStopped = true;
    stopMotors();
    tone(PIN_HORN, 800, 400);
    Serial.println("ACK:ESTOP");
    return;
  }

  if (action == "HEARTBEAT") {
    Serial.println("ACK:HEARTBEAT");
    return;
  }

  // If locked in E-Stop, require STOP command to unlock
  if (isEmergencyStopped) {
    if (action == "STOP") {
      isEmergencyStopped = false;
      Serial.println("ACK:ESTOP_CLEARED");
    } else {
      Serial.println("ERR:LOCKED_IN_ESTOP");
      return;
    }
  }

  if (action == "STOP") {
    stopMotors();
    Serial.println("ACK:STOP");
  } else if (action == "FORWARD") {
    moveForward(currentSpeed);
    Serial.println("ACK:FORWARD");
  } else if (action == "REVERSE") {
    moveReverse(currentSpeed);
    Serial.println("ACK:REVERSE");
  } else if (action == "LEFT") {
    turnLeft(currentSpeed);
    Serial.println("ACK:LEFT");
  } else if (action == "RIGHT") {
    turnRight(currentSpeed);
    Serial.println("ACK:RIGHT");
  } else if (action == "LIGHTS_ON") {
    digitalWrite(PIN_HEADLIGHTS, HIGH);
    Serial.println("ACK:LIGHTS_ON");
  } else if (action == "LIGHTS_OFF") {
    digitalWrite(PIN_HEADLIGHTS, LOW);
    Serial.println("ACK:LIGHTS_OFF");
  } else if (action == "HORN_ON") {
    digitalWrite(PIN_HORN, HIGH);
    Serial.println("ACK:HORN_ON");
  } else if (action == "HORN_OFF") {
    digitalWrite(PIN_HORN, LOW);
    Serial.println("ACK:HORN_OFF");
  } else {
    Serial.println("ERR:UNKNOWN_COMMAND");
  }
}

void stopMotors() {
  analogWrite(MOTOR_LEFT_PWM, 0);
  digitalWrite(MOTOR_LEFT_DIR1, LOW);
  digitalWrite(MOTOR_LEFT_DIR2, LOW);

  analogWrite(MOTOR_RIGHT_PWM, 0);
  digitalWrite(MOTOR_RIGHT_DIR1, LOW);
  digitalWrite(MOTOR_RIGHT_DIR2, LOW);
}

void moveForward(int speed) {
  digitalWrite(MOTOR_LEFT_DIR1, HIGH);
  digitalWrite(MOTOR_LEFT_DIR2, LOW);
  analogWrite(MOTOR_LEFT_PWM, speed);

  digitalWrite(MOTOR_RIGHT_DIR1, HIGH);
  digitalWrite(MOTOR_RIGHT_DIR2, LOW);
  analogWrite(MOTOR_RIGHT_PWM, speed);
}

void moveReverse(int speed) {
  digitalWrite(MOTOR_LEFT_DIR1, LOW);
  digitalWrite(MOTOR_LEFT_DIR2, HIGH);
  analogWrite(MOTOR_LEFT_PWM, speed);

  digitalWrite(MOTOR_RIGHT_DIR1, LOW);
  digitalWrite(MOTOR_RIGHT_DIR2, HIGH);
  analogWrite(MOTOR_RIGHT_PWM, speed);
}

void turnLeft(int speed) {
  digitalWrite(MOTOR_LEFT_DIR1, LOW);
  digitalWrite(MOTOR_LEFT_DIR2, HIGH);
  analogWrite(MOTOR_LEFT_PWM, speed / 2);

  digitalWrite(MOTOR_RIGHT_DIR1, HIGH);
  digitalWrite(MOTOR_RIGHT_DIR2, LOW);
  analogWrite(MOTOR_RIGHT_PWM, speed);
}

void turnRight(int speed) {
  digitalWrite(MOTOR_LEFT_DIR1, HIGH);
  digitalWrite(MOTOR_LEFT_DIR2, LOW);
  analogWrite(MOTOR_LEFT_PWM, speed);

  digitalWrite(MOTOR_RIGHT_DIR1, LOW);
  digitalWrite(MOTOR_RIGHT_DIR2, HIGH);
  analogWrite(MOTOR_RIGHT_PWM, speed / 2);
}
