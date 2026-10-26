import React from 'react';
import { useVehicle } from '../context/VehicleContext';
import {
  Sliders,
  Play,
  Square,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Volume2,
  RefreshCw,
  Key,
} from 'lucide-react';

export const ControlsPage = () => {
  const { telemetry, sendManualCommand } = useVehicle();
  const isEStop = telemetry.engine_state === 'EMERGENCY_STOPPED';

  const gears = ['P', 'R', 'N', 'D'];
  const speedModes = [
    { id: 'ECO', label: 'ECO', limit: '25 km/h' },
    { id: 'NORMAL', label: 'NORMAL', limit: '50 km/h' },
    { id: 'SPORT', label: 'SPORT', limit: '85 km/h' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em' }}>
          VEHICLE <span style={{ color: 'var(--accent-cyan)' }}>MANUAL CONTROLS</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Direct manual override cockpit with interactive virtual controls and keyboard shortcuts
        </p>
      </div>

      {/* Main Cockpit Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Driving Controls Card */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="hud-title">
            <Sliders size={18} className="highlight" />
            <span>PRIMARY FLIGHT & DRIVE PEDALS</span>
          </div>

          {/* Engine Start / Stop / Reset Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            {telemetry.engine_state === 'RUNNING' ? (
              <button
                onClick={() => sendManualCommand('STOP')}
                className="btn-secondary"
                style={{ flex: 1, padding: '14px', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#ef4444' }}
              >
                <Square size={18} />
                STOP VEHICLE (X)
              </button>
            ) : isEStop ? (
              <button
                onClick={() => sendManualCommand('RESET_ESTOP')}
                className="btn-neon"
                style={{ flex: 1, padding: '14px', justifyContent: 'center', background: '#10b981', color: '#050811' }}
              >
                <RefreshCw size={18} />
                RESET E-STOP (R)
              </button>
            ) : (
              <button
                onClick={() => sendManualCommand('START')}
                className="btn-neon"
                style={{ flex: 1, padding: '14px', justifyContent: 'center' }}
              >
                <Play size={18} />
                START ENGINE (W / THUMB UP)
              </button>
            )}

            <button
              onClick={() => sendManualCommand('EMERGENCY_STOP')}
              className="btn-emergency"
              style={{ flex: 1 }}
            >
              <ShieldAlert size={20} />
              EMERGENCY STOP (SPACE)
            </button>
          </div>

          {/* Drive & Steer D-Pad / Pedals */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
            {/* Forward Accelerator Pedal */}
            <button
              onMouseDown={() => sendManualCommand('FORWARD')}
              onMouseUp={() => sendManualCommand('STOP')}
              className="btn-secondary"
              style={{
                width: 140,
                padding: '16px 0',
                justifyContent: 'center',
                fontFamily: 'var(--font-hud)',
                fontWeight: 700,
                background: telemetry.speed > 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: telemetry.speed > 0 ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: telemetry.speed > 0 ? 'var(--accent-cyan)' : '#fff',
              }}
            >
              <ArrowUp size={22} />
              FORWARD (W)
            </button>

            {/* Steering Left / Straight / Right */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onMouseDown={() => sendManualCommand('STEER_LEFT')}
                onMouseUp={() => sendManualCommand('STEER_STRAIGHT')}
                className="btn-secondary"
                style={{
                  width: 130,
                  padding: '14px 0',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 700,
                  background: telemetry.steering_angle < 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: telemetry.steering_angle < 0 ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                }}
              >
                <ArrowLeft size={18} />
                LEFT (A)
              </button>

              <button
                onClick={() => sendManualCommand('STEER_STRAIGHT')}
                className="btn-secondary"
                style={{ width: 100, padding: '14px 0', justifyContent: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-hud)' }}
              >
                CENTER
              </button>

              <button
                onMouseDown={() => sendManualCommand('STEER_RIGHT')}
                onMouseUp={() => sendManualCommand('STEER_STRAIGHT')}
                className="btn-secondary"
                style={{
                  width: 130,
                  padding: '14px 0',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 700,
                  background: telemetry.steering_angle > 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: telemetry.steering_angle > 0 ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                }}
              >
                RIGHT (D)
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Reverse Pedal */}
            <button
              onMouseDown={() => sendManualCommand('REVERSE')}
              onMouseUp={() => sendManualCommand('STOP')}
              className="btn-secondary"
              style={{
                width: 140,
                padding: '16px 0',
                justifyContent: 'center',
                fontFamily: 'var(--font-hud)',
                fontWeight: 700,
                background: telemetry.speed < 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: telemetry.speed < 0 ? '#f59e0b' : 'var(--border-subtle)',
                color: telemetry.speed < 0 ? '#f59e0b' : '#fff',
              }}
            >
              <ArrowDown size={22} />
              REVERSE (S)
            </button>
          </div>
        </div>

        {/* Secondary Switches & Keyboard Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Gear Shifter & Drive Limits */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div className="hud-title" style={{ marginBottom: 14 }}>
              <Sliders size={18} className="highlight" />
              <span>SPEED LIMIT GOVERNOR</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {speedModes.map((sm) => (
                <button
                  key={sm.id}
                  onClick={() => sendManualCommand('SET_SPEED_MODE', sm.id)}
                  style={{
                    padding: '14px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: telemetry.speed_mode === sm.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: telemetry.speed_mode === sm.id ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    color: telemetry.speed_mode === sm.id ? 'var(--accent-cyan)' : '#fff',
                    fontFamily: 'var(--font-hud)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{sm.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{sm.limit}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Legend */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div className="hud-title" style={{ marginBottom: 14 }}>
              <Key size={18} className="highlight" />
              <span>KEYBOARD SHORTCUTS REFERENCE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>W / ↑</kbd>
                <span>Move Forward</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>S / ↓</kbd>
                <span>Reverse</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>A / ←</kbd>
                <span>Steer Left</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>D / →</kbd>
                <span>Steer Right</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', color: '#ff3366' }}>SPACE</kbd>
                <span>Emergency Stop</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', color: '#10b981' }}>R</kbd>
                <span>Reset E-Stop</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>H</kbd>
                <span>Honk Horn</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>L</kbd>
                <span>Headlights</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>Q / E</kbd>
                <span>Turn Indicators</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <kbd style={{ background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>X</kbd>
                <span>Stop Vehicle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
