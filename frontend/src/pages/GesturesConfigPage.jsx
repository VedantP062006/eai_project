import React, { useState, useEffect } from 'react';
import { Cpu, Sliders, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';

export const GesturesConfigPage = () => {
  const [gestureMap, setGestureMap] = useState({});
  const [settings, setSettings] = useState({
    confidence_threshold: 0.65,
    stability_frame_count: 4,
    hold_confirmation_sec: 1.5,
    deadman_timeout_sec: 0.6,
  });
  const [savedAlert, setSavedAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  const availableCommands = [
    { id: 'START_SIMULATION', label: 'Start / Enable Simulation' },
    { id: 'STOP', label: 'Stop Vehicle (Normal Brake)' },
    { id: 'EMERGENCY_STOP', label: 'Emergency Stop (Highest Priority)' },
    { id: 'FORWARD', label: 'Move Forward' },
    { id: 'REVERSE', label: 'Reverse Backwards' },
    { id: 'TURN_LEFT', label: 'Turn / Steer Left' },
    { id: 'TURN_RIGHT', label: 'Turn / Steer Right' },
    { id: 'TOGGLE_LIGHTS', label: 'Toggle Headlights' },
    { id: 'TOGGLE_LEFT_INDICATOR', label: 'Toggle Left Turn Signal' },
    { id: 'TOGGLE_RIGHT_INDICATOR', label: 'Toggle Right Turn Signal' },
    { id: 'TOGGLE_HAZARDS', label: 'Toggle Hazard Lights' },
    { id: 'CONFIRM_ACTION', label: 'Confirm Action / Horn Chirp' },
    { id: 'NONE', label: 'None (Ignore Gesture)' },
  ];

  const gestureLabels = {
    OPEN_PALM: { title: 'Open Palm', defaultCmd: 'STOP' },
    CLOSED_FIST: { title: 'Closed Fist', defaultCmd: 'EMERGENCY_STOP' },
    THUMB_UP: { title: 'Thumb Pointing Up', defaultCmd: 'START_SIMULATION' },
    INDEX_FORWARD: { title: 'Index Finger Pointing Forward', defaultCmd: 'FORWARD' },
    INDEX_BACKWARD: { title: 'Index / Thumb Pointing Backward', defaultCmd: 'REVERSE' },
    TILT_LEFT: { title: 'Hand Tilted Left', defaultCmd: 'TURN_LEFT' },
    TILT_RIGHT: { title: 'Hand Tilted Right', defaultCmd: 'TURN_RIGHT' },
    VICTORY_TWO_FINGERS: { title: 'Two Fingers Raised (V-Sign)', defaultCmd: 'TOGGLE_LIGHTS' },
    OPEN_PALM_HELD: { title: 'Open Palm Held (Duration Confirmation)', defaultCmd: 'CONFIRM_ACTION' },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resMap, resSet] = await Promise.all([
          fetch('http://localhost:8000/api/gesture_map'),
          fetch('http://localhost:8000/api/settings'),
        ]);
        const mapData = await resMap.json();
        const setData = await resSet.json();

        setGestureMap(mapData.gesture_map || {});
        if (setData.settings) {
          setSettings({
            confidence_threshold: setData.settings.confidence_threshold ?? 0.65,
            stability_frame_count: setData.settings.stability_frame_count ?? 4,
            hold_confirmation_sec: setData.settings.hold_confirmation_sec ?? 1.5,
            deadman_timeout_sec: setData.settings.deadman_timeout_sec ?? 0.6,
          });
        }
      } catch (err) {
        console.error('Failed to load gesture configurations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCommandChange = (gestureId, newCommand) => {
    setGestureMap((prev) => ({
      ...prev,
      [gestureId]: newCommand,
    }));
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        fetch('http://localhost:8000/api/gesture_map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gestureMap),
        }),
        fetch('http://localhost:8000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        }),
      ]);
      setSavedAlert(true);
      setTimeout(() => setSavedAlert(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleResetDefaults = () => {
    const defaultMap = {};
    Object.keys(gestureLabels).forEach((g) => {
      defaultMap[g] = gestureLabels[g].defaultCmd;
    });
    setGestureMap(defaultMap);
    setSettings({
      confidence_threshold: 0.65,
      stability_frame_count: 4,
      hold_confirmation_sec: 1.5,
      deadman_timeout_sec: 0.6,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em' }}>
            GESTURE MAPPING & <span style={{ color: 'var(--accent-cyan)' }}>SENSITIVITY CONFIGURATION</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Reconfigure gesture triggers, validation thresholds, and hold durations persisted to SQLite
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleResetDefaults} className="btn-secondary">
            <RotateCcw size={16} />
            RESTORE DEFAULTS
          </button>
          <button onClick={handleSave} className="btn-neon">
            <Save size={16} />
            SAVE CONFIGURATION
          </button>
        </div>
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
          <span>Configuration saved successfully and updated in live runtime!</span>
        </div>
      )}

      {/* Grid: Gesture Mapping Table & Sensitivity Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        {/* Gesture Mapping Table */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div className="hud-title" style={{ marginBottom: 16 }}>
            <Cpu size={18} className="highlight" />
            <span>CUSTOM GESTURE-TO-COMMAND MAP</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.keys(gestureLabels).map((gestureId) => (
              <div
                key={gestureId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                    {gestureLabels[gestureId].title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                    {gestureId}
                  </div>
                </div>

                <select
                  value={gestureMap[gestureId] || 'NONE'}
                  onChange={(e) => handleCommandChange(gestureId, e.target.value)}
                  style={{
                    padding: '8px 14px',
                    background: '#0d1424',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableCommands.map((cmd) => (
                    <option key={cmd.id} value={cmd.id} style={{ background: '#0d1424', color: '#fff' }}>
                      {cmd.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Sensitivity Sliders Card */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="hud-title">
            <Sliders size={18} className="highlight" />
            <span>AI CONFIDENCE & STABILITY THRESHOLDS</span>
          </div>

          {/* Confidence Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 8 }}>
              <span>Minimum Confidence Threshold</span>
              <span style={{ fontFamily: 'var(--font-hud)', color: 'var(--accent-cyan)' }}>
                {Math.round(settings.confidence_threshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={settings.confidence_threshold}
              onChange={(e) => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Higher values reduce false positives; lower values recognize gestures in low light.
            </div>
          </div>

          {/* Consecutive Stability Frames */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 8 }}>
              <span>Stability Consecutive Frames</span>
              <span style={{ fontFamily: 'var(--font-hud)', color: 'var(--accent-cyan)' }}>
                {settings.stability_frame_count} Frames
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={settings.stability_frame_count}
              onChange={(e) => setSettings({ ...settings, stability_frame_count: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Requires gesture to be held stable across N consecutive frames before vehicle activates.
            </div>
          </div>

          {/* Hold Duration for Action Confirmation */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 8 }}>
              <span>Held Palm Confirmation Duration</span>
              <span style={{ fontFamily: 'var(--font-hud)', color: '#fbbf24' }}>
                {settings.hold_confirmation_sec} Seconds
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.25"
              value={settings.hold_confirmation_sec}
              onChange={(e) => setSettings({ ...settings, hold_confirmation_sec: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#fbbf24' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Duration of continuous open palm required to trigger action confirmation.
            </div>
          </div>

          {/* Deadman's Switch Timeout */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 8 }}>
              <span>Deadman Hand Lost Auto-Stop Timeout</span>
              <span style={{ fontFamily: 'var(--font-hud)', color: '#ff3366' }}>
                {settings.deadman_timeout_sec} Seconds
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.1"
              value={settings.deadman_timeout_sec}
              onChange={(e) => setSettings({ ...settings, deadman_timeout_sec: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#ff3366' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
              If user hand leaves camera frame for this duration, vehicle brakes automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
