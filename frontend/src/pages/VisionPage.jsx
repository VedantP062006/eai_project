import React, { useState } from 'react';
import { useVehicle } from '../context/VehicleContext';
import { Camera, Eye, Cpu, Activity, CheckCircle, Crosshair, Sparkles } from 'lucide-react';

export const VisionPage = () => {
  const { vision, setDemoGesture, setControlMode } = useVehicle();
  const [showRawLandmarks, setShowRawLandmarks] = useState(false);

  const gestures = [
    { id: 'THUMB_UP', name: 'Thumb Up', command: 'START_SIMULATION', desc: 'Starts simulation / re-enables engine' },
    { id: 'INDEX_FORWARD', name: 'Index Pointing Forward', command: 'FORWARD', desc: 'Accelerates vehicle forward' },
    { id: 'INDEX_BACKWARD', name: 'Index Pointing Backward', command: 'REVERSE', desc: 'Reverses vehicle backwards' },
    { id: 'TILT_LEFT', name: 'Hand Tilted Left', command: 'TURN_LEFT', desc: 'Steers wheels to the left' },
    { id: 'TILT_RIGHT', name: 'Hand Tilted Right', command: 'TURN_RIGHT', desc: 'Steers wheels to the right' },
    { id: 'OPEN_PALM', name: 'Open Palm', command: 'STOP', desc: 'Brakes vehicle to safe stop' },
    { id: 'CLOSED_FIST', name: 'Closed Fist', command: 'EMERGENCY_STOP', desc: 'Instant highest-priority E-Stop' },
    { id: 'VICTORY_TWO_FINGERS', name: 'Two Fingers Raised (V)', command: 'TOGGLE_LIGHTS', desc: 'Switches headlights ON/OFF' },
    { id: 'OPEN_PALM_HELD', name: 'Held Open Palm', command: 'CONFIRM_ACTION', desc: 'Confirms action with horn chirp' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em' }}>
            AI COMPUTER VISION & <span style={{ color: 'var(--accent-cyan)' }}>GESTURE STUDIO</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            MediaPipe 21 Hand Landmark Tracking & Geometric Multi-Class Classification Pipeline
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowRawLandmarks(!showRawLandmarks)}
            className="btn-secondary"
          >
            <Eye size={16} />
            {showRawLandmarks ? 'HIDE RAW LANDMARKS' : 'INSPECT 21 LANDMARKS'}
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Left Column: Live Feed & Video HUD */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="hud-title">
              <Camera size={18} className="highlight" />
              <span>LIVE MEDIA PIPELINE</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-cyan">{vision.fps} FPS</span>
              <span className={`badge ${vision.hand_detected ? 'badge-green' : 'badge-red'}`}>
                {vision.hand_detected ? 'HAND TRACKED' : 'NO HAND'}
              </span>
            </div>
          </div>

          {/* Large Video Screen */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              background: '#040711',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <img
              src={vision.image || "http://127.0.0.1:8000/api/video_feed"}
              alt="AI Video Feed"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Target Reticle */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 120,
                height: 120,
                border: '1px dashed rgba(0, 240, 255, 0.3)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Active Gesture Banner */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)' }}>
                CLASSIFIED GESTURE
              </div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {vision.stable_gesture}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)' }}>
                CONFIDENCE SCORE
              </div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
                {Math.round(vision.confidence * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Metrics & Interactive Gesture Tester */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stability & Deadman Meter */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div className="hud-title" style={{ marginBottom: 14 }}>
              <Activity size={18} className="highlight" />
              <span>TEMPORAL STABILITY & SAFETY FILTER</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                  <span>Consecutive Frame Lock</span>
                  <span style={{ fontFamily: 'var(--font-hud)', color: 'var(--accent-cyan)' }}>
                    {vision.stability_count} / {vision.required_frames} frames
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (vision.stability_count / vision.required_frames) * 100)}%`,
                      background: vision.stability_count >= vision.required_frames ? '#10b981' : '#00f0ff',
                      transition: 'width 0.15s ease',
                    }}
                  />
                </div>
              </div>

              {/* Hold Progress (Open Palm Held Confirmation) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                  <span>Hold Action Confirmation (1.5s)</span>
                  <span style={{ fontFamily: 'var(--font-hud)', color: '#fbbf24' }}>
                    {Math.round(vision.hold_progress * 100)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${vision.hold_progress * 100}%`,
                      background: '#fbbf24',
                      transition: 'width 0.1s linear',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Gesture Simulator Cards */}
          <div className="glass-panel" style={{ padding: 20, flex: 1 }}>
            <div className="hud-title" style={{ marginBottom: 14 }}>
              <Cpu size={18} className="highlight" />
              <span>TEST SUPPORTED GESTURES (CLICK TO SIMULATE)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
              {gestures.map((g) => {
                const isActive = vision.stable_gesture === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setDemoGesture(g.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.82rem', fontWeight: 700, color: isActive ? 'var(--accent-cyan)' : '#fff' }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {g.desc}
                      </div>
                    </div>
                    <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                      {g.command}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Raw 21 Landmark Coordinates Inspector Modal / Panel */}
      {showRawLandmarks && vision.landmarks && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div className="hud-title" style={{ marginBottom: 12 }}>
            <Eye size={18} className="highlight" />
            <span>RAW NORMALIZED 21 HAND LANDMARKS (3D X, Y, Z)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: '0.72rem', fontFamily: 'monospace' }}>
            {vision.landmarks.map((lm, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 8, borderRadius: 6 }}>
                <span style={{ color: 'var(--accent-cyan)' }}>PT #{idx}:</span> X:{lm.x.toFixed(3)} Y:{lm.y.toFixed(3)} Z:{lm.z?.toFixed(3) || '0.000'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
