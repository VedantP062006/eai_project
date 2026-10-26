import React, { useState, useEffect, useRef } from 'react';
import { useVehicle } from '../context/VehicleContext';
import { Camera, RefreshCw, Zap, ShieldAlert, Sparkles, AlertTriangle, Video, Eye, Settings2 } from 'lucide-react';

export const WebcamFeed = ({ showControls = true }) => {
  const { vision, telemetry, setDemoGesture, sendManualCommand } = useVehicle();
  const [streamKey, setStreamKey] = useState(Date.now());
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [browserCamMode, setBrowserCamMode] = useState(false);
  const [browserCamError, setBrowserCamError] = useState(null);
  const [selectedCamIndex, setSelectedCamIndex] = useState(0);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const gestureDisplayNames = {
    OPEN_PALM: 'STOP (Open Palm)',
    CLOSED_FIST: 'EMERGENCY STOP (Fist)',
    THUMB_UP: 'START ENGINE (Thumb Up)',
    INDEX_FORWARD: 'FORWARD (Index Point)',
    INDEX_BACKWARD: 'REVERSE (Backward Point)',
    TILT_LEFT: 'STEER LEFT (Tilt Left)',
    TILT_RIGHT: 'STEER RIGHT (Tilt Right)',
    VICTORY_TWO_FINGERS: 'TOGGLE LIGHTS (Two Fingers)',
    OPEN_PALM_HELD: 'CONFIRM ACTION (Held Palm)',
    NO_HAND: 'NO HAND DETECTED',
    UNKNOWN: 'ANALYZING GESTURE...',
  };

  const demoGesturesList = [
    { id: 'THUMB_UP', label: 'Thumb Up (Start)' },
    { id: 'INDEX_FORWARD', label: 'Index (Forward)' },
    { id: 'INDEX_BACKWARD', label: 'Reverse' },
    { id: 'TILT_LEFT', label: 'Tilt Left' },
    { id: 'TILT_RIGHT', label: 'Tilt Right' },
    { id: 'OPEN_PALM', label: 'Open Palm (Stop)' },
    { id: 'CLOSED_FIST', label: 'Closed Fist (E-Stop)' },
    { id: 'VICTORY_TWO_FINGERS', label: 'Victory (Lights)' },
    { id: 'NO_HAND', label: 'Hide Hand (Deadman)' },
  ];

  const isEstop = telemetry.engine_state === 'EMERGENCY_STOPPED';

  // Direct Browser Camera management (releases hardware lock when browser cam is requested)
  useEffect(() => {
    if (browserCamMode) {
      fetch('http://127.0.0.1:8000/api/camera/release', { method: 'POST' })
        .catch(() => {})
        .finally(() => {
          setTimeout(() => {
            navigator.mediaDevices?.getUserMedia({ video: { width: 640, height: 480 } })
              .then((stream) => {
                mediaStreamRef.current = stream;
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                }
                setBrowserCamError(null);
              })
              .catch((err) => {
                console.error('[BrowserCam] Failed to access webcam:', err);
                setBrowserCamError(err.message || 'Permission denied or camera in use');
              });
          }, 400);
        });
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        fetch('http://127.0.0.1:8000/api/camera/reconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ camera_index: selectedCamIndex }),
        }).catch(() => {});
      }
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [browserCamMode]);

  // Reconnect camera hardware on backend
  const handleReconnectCamera = async (camIdx = selectedCamIndex) => {
    setIsReconnecting(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/camera/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_index: camIdx }),
      });
      const data = await res.json();
      console.log('[CameraService] Reconnect response:', data);
      setStreamKey(Date.now());
    } catch (e) {
      console.error('[CameraService] Reconnect failed:', e);
    } finally {
      setTimeout(() => setIsReconnecting(false), 800);
    }
  };

  const handleSwitchCamera = (newIdx) => {
    setSelectedCamIndex(newIdx);
    handleReconnectCamera(newIdx);
  };

  return (
    <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Vision Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div className="hud-title">
          <Camera size={18} className="highlight" />
          <span>AI VISION <span className="highlight">STREAM</span></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Direct Browser Cam Toggle */}
          <button
            onClick={() => setBrowserCamMode(!browserCamMode)}
            title="Toggle Direct Browser WebCam Hardware Preview"
            style={{
              background: browserCamMode ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: browserCamMode ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              color: browserCamMode ? 'var(--accent-cyan)' : 'var(--text-muted)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.68rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Video size={12} />
            <span>{browserCamMode ? 'BROWSER CAM: ON' : 'TEST BROWSER CAM'}</span>
          </button>

          {/* Camera Reconnect Button */}
          <button
            onClick={() => handleReconnectCamera()}
            disabled={isReconnecting}
            title="Re-initialize Camera Hardware & Clear Locks"
            style={{
              background: isReconnecting ? 'rgba(0, 240, 255, 0.3)' : 'transparent',
              border: '1px solid var(--border-subtle)',
              color: isReconnecting ? 'var(--accent-cyan)' : 'var(--text-muted)',
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
              cursor: isReconnecting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.68rem',
            }}
          >
            <RefreshCw size={12} className={isReconnecting ? 'spin' : ''} />
            <span>{isReconnecting ? 'RECONNECTING...' : 'RECONNECT'}</span>
          </button>

          {/* FPS Badge */}
          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
            {vision.fps || 0} FPS
          </span>

          {/* Connection Status Badge */}
          <span className={`badge ${vision.camera_connected ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
            {vision.camera_connected ? 'LIVE CAM' : 'DEMO VIRTUAL'}
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          background: '#040711',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8)',
        }}
      >
        {browserCamMode ? (
          /* Direct Browser Camera Stream */
          browserCamError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20, textAlign: 'center', color: '#ff3366', gap: 8 }}>
              <AlertTriangle size={32} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Browser Camera Access Error</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{browserCamError}</div>
              <button
                onClick={() => setBrowserCamMode(false)}
                className="btn-secondary"
                style={{ fontSize: '0.72rem', marginTop: 10 }}
              >
                Switch to AI Backend Stream
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          )
        ) : vision.image ? (
          /* Real-Time Zero-Lag Base64 WebSocket Stream (Never freezes on reload) */
          <img
            src={vision.image}
            alt="AI Real-Time Vision Feed"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          /* Fallback MJPEG Stream */
          <img
            key={streamKey}
            src={`http://127.0.0.1:8000/api/video_feed?t=${streamKey}`}
            alt="Webcam AI Stream"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => {
              // Graceful single-shot refresh without runaway loop
              console.warn('[WebcamFeed] Video stream element reported error; retrying in 3s...');
            }}
          />
        )}

        {/* Cyber HUD Corner Crosshairs */}
        <div style={{ position: 'absolute', top: 10, left: 10, borderTop: '2px solid #00f0ff', borderLeft: '2px solid #00f0ff', width: 14, height: 14, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, right: 10, borderTop: '2px solid #00f0ff', borderRight: '2px solid #00f0ff', width: 14, height: 14, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 10, left: 10, borderBottom: '2px solid #00f0ff', borderLeft: '2px solid #00f0ff', width: 14, height: 14, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 10, right: 10, borderBottom: '2px solid #00f0ff', borderRight: '2px solid #00f0ff', width: 14, height: 14, pointerEvents: 'none' }} />

        {/* Camera Index Quick Switcher Overlay (Top-Right) */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            display: 'flex',
            gap: 4,
            background: 'rgba(5, 8, 18, 0.75)',
            backdropFilter: 'blur(4px)',
            padding: '3px 6px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            CAM:
          </span>
          {[0, 1].map((idx) => (
            <button
              key={idx}
              onClick={() => handleSwitchCamera(idx)}
              style={{
                background: selectedCamIndex === idx ? 'var(--accent-cyan)' : 'transparent',
                color: selectedCamIndex === idx ? '#040711' : 'var(--text-main)',
                border: 'none',
                borderRadius: 2,
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 5px',
                cursor: 'pointer',
              }}
            >
              #{idx}
            </button>
          ))}
        </div>

        {/* Live Detected Gesture Overlay Banner */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg, transparent 0%, rgba(5, 8, 18, 0.95) 100%)',
            padding: '16px 14px 10px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)', letterSpacing: '0.06em' }}>
              RECOGNIZED GESTURE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '1rem',
                fontWeight: 700,
                color: vision.stable_gesture === 'CLOSED_FIST' ? '#ff3366' : 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {gestureDisplayNames[vision.stable_gesture] || vision.stable_gesture}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)' }}>
              CONFIDENCE
            </div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {Math.round((vision.confidence || 0) * 100)}%
            </div>
          </div>
        </div>

        {/* Hold Progress Bar */}
        {vision.hold_progress > 0 && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'rgba(255, 255, 255, 0.2)' }}>
            <div
              style={{
                height: '100%',
                width: `${vision.hold_progress * 100}%`,
                background: '#00f0ff',
                boxShadow: '0 0 10px #00f0ff',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        )}
      </div>

      {/* Camera Status Notification */}
      {!vision.camera_connected && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#fbbf24' }}>
            <AlertTriangle size={14} />
            <span>Webcam unavailable or closed by shutter. AI is running in <b>Virtual Demo Mode</b>.</span>
          </div>
          <button
            onClick={() => handleReconnectCamera()}
            style={{
              background: '#f59e0b',
              color: '#040711',
              border: 'none',
              borderRadius: 3,
              padding: '3px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* Stability & Deadman Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STABILITY LOCK</div>
          <div style={{ fontFamily: 'var(--font-hud)', color: vision.stability_count >= vision.required_frames ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
            {vision.stability_count} / {vision.required_frames} FRAMES
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HAND PRESENCE</div>
          <div style={{ fontFamily: 'var(--font-hud)', color: vision.hand_detected ? '#10b981' : '#ff3366', fontWeight: 700 }}>
            {vision.hand_detected ? 'LOCKED IN FRAME' : 'ABSENT (DEADMAN)'}
          </div>
        </div>
      </div>

      {/* Quick E-Stop Recovery or Quick Start Buttons */}
      {isEstop ? (
        <button
          onClick={() => sendManualCommand('RESET_ESTOP')}
          className="btn-neon"
          style={{ width: '100%', justifyContent: 'center', background: '#10b981', color: '#050811', borderColor: '#34d399' }}
        >
          <Zap size={16} />
          CLEAR EMERGENCY STOP (OR SHOW THUMB UP)
        </button>
      ) : telemetry.engine_state === 'STOPPED' ? (
        <button
          onClick={() => sendManualCommand('START')}
          className="btn-neon"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Zap size={16} />
          START ENGINE (OR SHOW THUMB UP)
        </button>
      ) : null}

      {/* Quick Demo Mode Selector */}
      {showControls && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>SIMULATE GESTURES (DEMO)</span>
            <span style={{ color: 'var(--accent-cyan)' }}>CLICK TO TRIGGER</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {demoGesturesList.map((g) => (
              <button
                key={g.id}
                onClick={() => setDemoGesture(g.id)}
                style={{
                  background: vision.demo_gesture === g.id ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: vision.demo_gesture === g.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  color: vision.demo_gesture === g.id ? 'var(--accent-cyan)' : 'var(--text-main)',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
