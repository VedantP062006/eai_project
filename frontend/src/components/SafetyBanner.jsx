import React from 'react';
import { useVehicle } from '../context/VehicleContext';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Key } from 'lucide-react';

export const SafetyBanner = () => {
  const { telemetry, safety, vision, sendManualCommand } = useVehicle();
  const isEStop = telemetry.engine_state === 'EMERGENCY_STOPPED';

  if (!isEStop && !safety.safety_warning && vision.hand_detected) {
    return null; // All clear
  }

  return (
    <div
      style={{
        background: isEStop
          ? 'linear-gradient(90deg, rgba(225, 29, 72, 0.25) 0%, rgba(190, 18, 60, 0.4) 100%)'
          : 'rgba(245, 158, 11, 0.15)',
        border: isEStop ? '1px solid #ff3366' : '1px solid rgba(245, 158, 11, 0.4)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
        boxShadow: isEStop ? '0 0 20px rgba(255, 51, 102, 0.3)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {isEStop ? (
          <ShieldAlert size={26} color="#ff3366" />
        ) : (
          <AlertTriangle size={26} color="#f59e0b" />
        )}
        <div>
          <div style={{ fontFamily: 'var(--font-hud)', fontWeight: 800, fontSize: '0.92rem', color: isEStop ? '#ff3366' : '#fbbf24' }}>
            {isEStop
              ? 'EMERGENCY STOP LOCKOUT ENGAGED'
              : !vision.hand_detected
              ? "SAFETY NOTICE: HAND NOT IN FRAME (DEADMAN'S AUTO-STOP)"
              : 'SYSTEM SAFETY NOTICE'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isEStop
              ? 'Vehicle halted with maximum braking force. To resume driving, show THUMB UP gesture or click Reset.'
              : safety.safety_warning || 'Movement commands will remain stationary until hand returns or system is enabled.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isEStop && (
          <button
            onClick={() => sendManualCommand('RESET_ESTOP')}
            className="btn-neon"
            style={{
              background: '#10b981',
              color: '#050811',
              borderColor: '#34d399',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.5)',
            }}
          >
            <RefreshCw size={16} />
            RESET E-STOP LOCK (KEY: R)
          </button>
        )}
        {telemetry.engine_state === 'STOPPED' && (
          <button
            onClick={() => sendManualCommand('START')}
            className="btn-neon"
          >
            START ENGINE (THUMB UP)
          </button>
        )}
      </div>
    </div>
  );
};
