import React from 'react';
import { useVehicle } from '../context/VehicleContext';
import {
  Compass,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Volume2,
  Navigation,
  Gauge,
} from 'lucide-react';

export const TelemetryCard = () => {
  const { telemetry, sendManualCommand } = useVehicle();

  const gears = ['P', 'R', 'N', 'D'];
  const speedModes = ['ECO', 'NORMAL', 'SPORT'];

  return (
    <div className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="hud-title">
        <Gauge size={18} className="highlight" />
        <span>VEHICLE <span className="highlight">TELEMETRY & CONTROLS</span></span>
      </div>

      {/* Primary Cockpit Indicators: Steering & Gears */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Animated Steering Wheel Angle */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-sm)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)', marginBottom: 8 }}>
            STEERING ANGLE
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '4px solid #38bdf8',
              borderTopColor: '#00f0ff',
              position: 'relative',
              transform: `rotate(${telemetry.steering_angle * 1.5}deg)`,
              transition: 'transform 0.15s ease-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
            }}
          >
            <div style={{ width: 4, height: 20, background: '#00f0ff', position: 'absolute', top: 2, borderRadius: 2 }} />
            <div style={{ width: 34, height: 4, background: '#38bdf8', borderRadius: 2 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1.1rem', fontWeight: 700, marginTop: 8, color: '#fff' }}>
            {telemetry.steering_angle > 0 ? `+${telemetry.steering_angle}°` : `${telemetry.steering_angle}°`}
          </div>
        </div>

        {/* Transmission Gear Selector */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-sm)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)' }}>
            TRANSMISSION
          </div>
          <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
            {gears.map((g) => (
              <div
                key={g}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px 0',
                  borderRadius: 6,
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 800,
                  fontSize: '1rem',
                  background: telemetry.gear === g ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                  color: telemetry.gear === g ? '#050811' : 'var(--text-muted)',
                  boxShadow: telemetry.gear === g ? '0 0 14px rgba(0, 240, 255, 0.6)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {g}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>ODOMETER:</span>
            <span style={{ fontFamily: 'var(--font-hud)', color: '#fff' }}>{telemetry.odometer} KM</span>
          </div>
        </div>
      </div>

      {/* Speed Mode Selector */}
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)', marginBottom: 6 }}>
          DRIVE MODE (SPEED LIMIT)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {speedModes.map((m) => (
            <button
              key={m}
              onClick={() => sendManualCommand('SET_SPEED_MODE', m)}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-hud)',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: telemetry.speed_mode === m ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: telemetry.speed_mode === m ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                color: telemetry.speed_mode === m ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Lighting & Signals Control Bar */}
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)', marginBottom: 6 }}>
          LIGHTS & SIGNALS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {/* Headlights */}
          <button
            onClick={() => sendManualCommand('TOGGLE_LIGHTS')}
            style={{
              padding: '10px 6px',
              borderRadius: 'var(--radius-sm)',
              border: telemetry.headlights ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
              background: telemetry.headlights ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: telemetry.headlights ? '#38bdf8' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-hud)',
            }}
          >
            <Lightbulb size={18} />
            <span>HEADLIGHTS</span>
          </button>

          {/* Left Indicator */}
          <button
            onClick={() => sendManualCommand('TOGGLE_LEFT_INDICATOR')}
            style={{
              padding: '10px 6px',
              borderRadius: 'var(--radius-sm)',
              border: telemetry.left_indicator ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
              background: telemetry.left_indicator ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: telemetry.left_indicator ? '#f59e0b' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-hud)',
            }}
          >
            <ArrowLeft size={18} className={telemetry.left_indicator && telemetry.indicator_blink_active ? 'blinking-indicator' : ''} />
            <span>LEFT TURN</span>
          </button>

          {/* Right Indicator */}
          <button
            onClick={() => sendManualCommand('TOGGLE_RIGHT_INDICATOR')}
            style={{
              padding: '10px 6px',
              borderRadius: 'var(--radius-sm)',
              border: telemetry.right_indicator ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
              background: telemetry.right_indicator ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: telemetry.right_indicator ? '#f59e0b' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-hud)',
            }}
          >
            <ArrowRight size={18} className={telemetry.right_indicator && telemetry.indicator_blink_active ? 'blinking-indicator' : ''} />
            <span>RIGHT TURN</span>
          </button>

          {/* Hazard Lights */}
          <button
            onClick={() => sendManualCommand('TOGGLE_HAZARDS')}
            style={{
              padding: '10px 6px',
              borderRadius: 'var(--radius-sm)',
              border: telemetry.hazard_lights ? '1px solid #ff3366' : '1px solid var(--border-subtle)',
              background: telemetry.hazard_lights ? 'rgba(255, 51, 102, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: telemetry.hazard_lights ? '#ff3366' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-hud)',
            }}
          >
            <AlertTriangle size={18} className={telemetry.hazard_lights && telemetry.indicator_blink_active ? 'blinking-indicator' : ''} />
            <span>HAZARDS</span>
          </button>
        </div>
      </div>

      {/* Horn Button */}
      <button
        onMouseDown={() => sendManualCommand('HORN', true)}
        onMouseUp={() => sendManualCommand('HORN', false)}
        onTouchStart={() => sendManualCommand('HORN', true)}
        onTouchEnd={() => sendManualCommand('HORN', false)}
        className="btn-secondary"
        style={{
          justifyContent: 'center',
          padding: '12px',
          fontFamily: 'var(--font-hud)',
          fontWeight: 700,
          background: telemetry.horn ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)',
          borderColor: telemetry.horn ? 'var(--accent-cyan)' : 'var(--border-subtle)',
          color: telemetry.horn ? 'var(--accent-cyan)' : '#fff',
        }}
      >
        <Volume2 size={18} />
        {telemetry.horn ? 'HORN ACTIVE (BLARING)' : 'PRESS AND HOLD HORN (KEY: H)'}
      </button>
    </div>
  );
};
