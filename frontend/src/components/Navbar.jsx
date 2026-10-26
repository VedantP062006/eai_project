import React from 'react';
import { useVehicle } from '../context/VehicleContext';
import {
  Car,
  Camera,
  Sliders,
  History,
  Settings,
  ShieldAlert,
  Radio,
  Zap,
  Activity,
  Cpu,
} from 'lucide-react';

export const Navbar = ({ activePage, setActivePage }) => {
  const { isConnected, telemetry, safety, vision, sendManualCommand } = useVehicle();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Car },
    { id: 'vision', label: 'AI Vision', icon: Camera },
    { id: 'controls', label: 'Controls', icon: Sliders },
    { id: 'history', label: 'Command Log', icon: History },
    { id: 'gestures', label: 'Gesture Map', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isEStop = telemetry.engine_state === 'EMERGENCY_STOPPED';

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        {/* Brand & System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setActivePage('dashboard')}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)' }}>
              <Car size={24} color="#050811" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-hud)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.06em', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                AURA <span style={{ color: 'var(--accent-cyan)' }}>VEHICLE AI</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                GESTURE-CONTROLLED SMART SYSTEM v2.0
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge ${isConnected ? 'badge-cyan' : 'badge-red'}`}>
              <Radio size={12} />
              {isConnected ? 'WS CONNECTED' : 'DISCONNECTED'}
            </span>

            <span className={`badge ${
              isEStop ? 'badge-red' : telemetry.engine_state === 'RUNNING' ? 'badge-green' : 'badge-amber'
            }`}>
              <Zap size={12} />
              {telemetry.engine_state}
            </span>

            <span className="badge badge-cyan">
              <Activity size={12} />
              {safety.control_mode}
            </span>

            {vision.demo_mode && (
              <span className="badge badge-amber">
                DEMO MODE
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  background: isActive ? 'rgba(0, 240, 255, 0.14)' : 'transparent',
                  border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 0 12px rgba(0, 240, 255, 0.2)' : 'none',
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Quick Emergency Stop Button */}
        <div>
          {isEStop ? (
            <button
              onClick={() => sendManualCommand('RESET_ESTOP')}
              className="btn-neon"
              style={{ background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#10b981' }}
            >
              <Zap size={16} />
              RESET E-STOP
            </button>
          ) : (
            <button
              onClick={() => sendManualCommand('EMERGENCY_STOP')}
              className="btn-emergency"
              style={{ padding: '8px 18px', fontSize: '0.82rem' }}
            >
              <ShieldAlert size={18} />
              E-STOP
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
