import React, { useState, useEffect } from 'react';
import { useVehicle } from '../context/VehicleContext';
import { Settings, Cpu, HardDrive, Radio, Check, Save, Terminal, Shield } from 'lucide-react';

export const SettingsPage = () => {
  const { hardware } = useVehicle();
  const [settings, setSettings] = useState({
    camera_index: 0,
    demo_mode: false,
    hardware_enabled: false,
    hardware_port: 'COM3',
    hardware_baud: 115200,
    hardware_mock_mode: true,
    max_speed_eco: 25.0,
    max_speed_normal: 50.0,
    max_speed_sport: 85.0,
    max_reverse_speed: 22.0,
    acceleration_rate: 18.0,
    braking_rate: 38.0,
    natural_friction: 8.0,
    max_steer_angle: 35.0,
  });

  const [savedAlert, setSavedAlert] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/settings');
        const data = await res.json();
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await fetch('http://localhost:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSavedAlert(true);
      setTimeout(() => setSavedAlert(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em' }}>
            SYSTEM & <span style={{ color: 'var(--accent-cyan)' }}>HARDWARE INTEGRATION</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Configure camera inputs, vehicle physics simulation, and optional Arduino / ESP32 serial robotics
          </p>
        </div>

        <button onClick={handleSave} className="btn-neon">
          <Save size={16} />
          SAVE ALL SETTINGS
        </button>
      </div>

      {savedAlert && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 18px',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Check size={18} />
          <span>System configuration updated and applied immediately!</span>
        </div>
      )}

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Arduino / ESP32 Hardware Integration */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="hud-title">
              <Cpu size={18} className="highlight" />
              <span>ARDUINO / ESP32 ROBOTIC BRIDGE</span>
            </div>
            <span className={`badge ${hardware.connected ? 'badge-green' : 'badge-amber'}`}>
              {hardware.connected ? (hardware.mock_mode ? 'MOCK SERIAL' : 'SERIAL CONNECTED') : 'OFFLINE'}
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Enables sending synchronized motor commands (`CMD:FORWARD\n`, `CMD:STOP\n`) over USB/UART Serial
            to an educational robot chassis with safety heartbeat watchdog.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem' }}>Enable Hardware Bridge</span>
              <input
                type="checkbox"
                checked={settings.hardware_enabled}
                onChange={(e) => setSettings({ ...settings, hardware_enabled: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-cyan)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem' }}>Mock Serial Mode (Virtual Hardware Test)</span>
              <input
                type="checkbox"
                checked={settings.hardware_mock_mode}
                onChange={(e) => setSettings({ ...settings, hardware_mock_mode: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-cyan)' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>SERIAL PORT</div>
                <input
                  type="text"
                  value={settings.hardware_port}
                  onChange={(e) => setSettings({ ...settings, hardware_port: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>BAUD RATE</div>
                <select
                  value={settings.hardware_baud}
                  onChange={(e) => setSettings({ ...settings, hardware_baud: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0d1424',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                  }}
                >
                  <option value={9600}>9600 baud</option>
                  <option value={57600}>57600 baud</option>
                  <option value={115200}>115200 baud (Recommended)</option>
                </select>
              </div>
            </div>

            {/* Live Serial Monitor Output */}
            <div style={{ background: '#03060f', borderRadius: 'var(--radius-sm)', padding: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                <Terminal size={14} color="var(--accent-cyan)" />
                <span>SERIAL TX/RX MONITOR</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                LAST DISPATCH: {hardware.last_command || 'WAITING FOR COMMANDS...'}
              </div>
              {hardware.mock_tx_recent?.length > 0 && (
                <div style={{ marginTop: 6, fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                  Recent: {hardware.mock_tx_recent.join(' → ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera & Vision Hardware */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="hud-title">
            <Radio size={18} className="highlight" />
            <span>CAMERA & VISION SOURCE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>CAMERA DEVICE INDEX</div>
              <select
                value={settings.camera_index}
                onChange={(e) => setSettings({ ...settings, camera_index: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0d1424',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                }}
              >
                <option value={0}>Camera 0 (Default Integrated Webcam)</option>
                <option value={1}>Camera 1 (External USB Camera)</option>
                <option value={2}>Camera 2 (Secondary / Wide Angle)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '0.85rem' }}>Enable Demo / Virtual Mode</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Generates synthetic hand landmark frames if webcam is unavailable
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.demo_mode}
                onChange={(e) => setSettings({ ...settings, demo_mode: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-cyan)' }}
              />
            </label>
          </div>

          {/* Vehicle Physics Simulation Parameters */}
          <div className="hud-title" style={{ marginTop: 10 }}>
            <Settings size={18} className="highlight" />
            <span>VEHICLE KINEMATICS PHYSICS</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ACCELERATION RATE</div>
              <input
                type="number"
                value={settings.acceleration_rate}
                onChange={(e) => setSettings({ ...settings, acceleration_rate: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: '#fff' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>BRAKING RATE</div>
              <input
                type="number"
                value={settings.braking_rate}
                onChange={(e) => setSettings({ ...settings, braking_rate: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: '#fff' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MAX STEERING ANGLE (DEG)</div>
              <input
                type="number"
                value={settings.max_steer_angle}
                onChange={(e) => setSettings({ ...settings, max_steer_angle: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: '#fff' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>NATURAL FRICTION DRAG</div>
              <input
                type="number"
                value={settings.natural_friction}
                onChange={(e) => setSettings({ ...settings, natural_friction: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: '#fff' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
