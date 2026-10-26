import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { playHorn, playIndicatorClick, playEngineStart, playEmergencyBeep } from '../utils/audio';

const VehicleContext = createContext(null);

export const VehicleProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState({
    engine_state: 'STOPPED',
    gear: 'P',
    speed_mode: 'NORMAL',
    speed: 0,
    target_speed: 0,
    steering_angle: 0,
    heading: 0,
    x: 400,
    y: 300,
    odometer: 0,
    headlights: false,
    left_indicator: false,
    right_indicator: false,
    hazard_lights: false,
    brake_lights: false,
    horn: false,
    indicator_blink_active: false,
    last_command: 'IDLE',
  });

  const [vision, setVision] = useState({
    raw_gesture: 'NO_HAND',
    stable_gesture: 'NO_HAND',
    confidence: 0,
    stability_count: 0,
    required_frames: 4,
    hold_progress: 0,
    hand_detected: false,
    fps: 0,
    camera_connected: false,
    demo_mode: false,
    demo_gesture: 'OPEN_PALM',
    landmarks: null,
  });

  const [safety, setSafety] = useState({
    control_mode: 'GESTURE',
    safety_lockout: false,
    safety_warning: '',
    engine_state: 'STOPPED',
  });

  const [hardware, setHardware] = useState({
    enabled: false,
    connected: false,
    mock_mode: true,
    port: 'COM3',
    baud_rate: 115200,
    last_command: 'NONE',
    available_ports: [],
    mock_tx_recent: [],
  });

  const [recentCommands, setRecentCommands] = useState([]);
  const wsRef = useRef(null);
  const prevTelemetryRef = useRef(telemetry);

  // Connect to WebSocket with reconnect logic
  useEffect(() => {
    let reconnectTimeout = null;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '127.0.0.1'
        : window.location.hostname;
      const wsUrl = `${protocol}//${hostname}:8000/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('[WebSocket] Connected to Vehicle System backend.');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TELEMETRY_UPDATE') {
            if (data.vehicle) {
              const prev = prevTelemetryRef.current;

              // Sound effects
              if (!prev.horn && data.vehicle.horn) {
                playHorn();
              }
              if (
                data.vehicle.indicator_blink_active !== prev.indicator_blink_active &&
                data.vehicle.indicator_blink_active
              ) {
                playIndicatorClick();
              }
              if (prev.engine_state === 'STOPPED' && data.vehicle.engine_state === 'RUNNING') {
                playEngineStart();
              }
              if (prev.engine_state !== 'EMERGENCY_STOPPED' && data.vehicle.engine_state === 'EMERGENCY_STOPPED') {
                playEmergencyBeep();
              }

              prevTelemetryRef.current = data.vehicle;
              setTelemetry(data.vehicle);
            }

            if (data.vision) setVision(data.vision);
            if (data.safety) setSafety(data.safety);
            if (data.hardware) setHardware(data.hardware);

            // Log recent commands
            if (data.vehicle?.last_command && data.vehicle.last_command !== 'IDLE') {
              setRecentCommands((prevList) => {
                const latest = {
                  id: Date.now(),
                  time: new Date().toLocaleTimeString(),
                  command: data.vehicle.last_command,
                  gesture: data.vision?.stable_gesture || 'MANUAL',
                  confidence: data.vision?.confidence || 1.0,
                  status: data.vehicle.engine_state === 'EMERGENCY_STOPPED' ? 'ALERT' : 'ACTIVE',
                };
                if (prevList.length > 0 && prevList[0].command === latest.command) {
                  return prevList;
                }
                return [latest, ...prevList.slice(0, 30)];
              });
            }
          }
        } catch (err) {
          console.error('[WebSocket] Parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Error, reconnecting in 2s...', err);
        ws.close();
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectWS, 2000);
      };
    };

    connectWS();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Send manual action via WebSocket or REST fallback
  const sendManualCommand = async (command, value = null) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MANUAL_COMMAND',
          command,
          value,
        })
      );
    } else {
      try {
        await fetch('http://localhost:8000/api/manual_command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command, value }),
        });
      } catch (e) {
        console.error('Failed to dispatch manual command:', e);
      }
    }
  };

  const setDemoGesture = (gesture) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SET_DEMO_GESTURE',
          gesture,
        })
      );
    }
  };

  const setControlMode = (mode) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SET_CONTROL_MODE',
          mode,
        })
      );
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') {
        e.preventDefault();
        sendManualCommand('FORWARD');
      } else if (key === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        sendManualCommand('REVERSE');
      } else if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        sendManualCommand('STEER_LEFT');
      } else if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        sendManualCommand('STEER_RIGHT');
      } else if (e.code === 'Space') {
        e.preventDefault();
        sendManualCommand('EMERGENCY_STOP');
      } else if (key === 'x') {
        e.preventDefault();
        sendManualCommand('STOP');
      } else if (key === 'h') {
        e.preventDefault();
        sendManualCommand('HORN', true);
      } else if (key === 'l') {
        e.preventDefault();
        sendManualCommand('TOGGLE_LIGHTS');
      } else if (key === 'q') {
        e.preventDefault();
        sendManualCommand('TOGGLE_LEFT_INDICATOR');
      } else if (key === 'e') {
        e.preventDefault();
        sendManualCommand('TOGGLE_RIGHT_INDICATOR');
      } else if (key === 'r') {
        e.preventDefault();
        sendManualCommand('RESET_ESTOP');
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'd' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        sendManualCommand('STEER_STRAIGHT');
      } else if (key === 'h') {
        sendManualCommand('HORN', false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <VehicleContext.Provider
      value={{
        isConnected,
        telemetry,
        vision,
        safety,
        hardware,
        recentCommands,
        sendManualCommand,
        setDemoGesture,
        setControlMode,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = () => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
};
