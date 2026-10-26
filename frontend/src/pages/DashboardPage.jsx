import React from 'react';
import { useVehicle } from '../context/VehicleContext';
import { VehicleCanvas } from '../components/VehicleCanvas';
import { Speedometer } from '../components/Speedometer';
import { WebcamFeed } from '../components/WebcamFeed';
import { TelemetryCard } from '../components/TelemetryCard';
import { SafetyBanner } from '../components/SafetyBanner';
import {
  Car,
  Zap,
  Activity,
  History,
  Shield,
  Gauge,
  Key,
} from 'lucide-react';

export const DashboardPage = () => {
  const { telemetry, vision, recentCommands, sendManualCommand } = useVehicle();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Safety Alert Banner */}
      <SafetyBanner />

      {/* Main Cockpit Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Left Column: Vehicle Simulation Canvas & Speedometer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 2D Canvas Container */}
          <div className="glass-panel" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="hud-title">
                <Car size={18} className="highlight" />
                <span>2D TOP-VIEW <span className="highlight">SIMULATION ENGINE</span></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => sendManualCommand('START')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  START (THUMB UP)
                </button>
                <button
                  onClick={() => sendManualCommand('STOP')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  STOP (OPEN PALM)
                </button>
              </div>
            </div>

            <div style={{ height: 380, width: '100%' }}>
              <VehicleCanvas width={780} height={380} />
            </div>
          </div>

          {/* Speedometer & Live Telemetry Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Speedometer Card */}
            <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="hud-title" style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                <Gauge size={16} className="highlight" />
                <span>SPEEDOMETER</span>
              </div>
              <Speedometer size={210} />
            </div>

            {/* Quick Stats HUD */}
            <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="hud-title">
                <Activity size={16} className="highlight" />
                <span>VEHICLE STATUS</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ENGINE STATUS</div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: telemetry.engine_state === 'RUNNING' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {telemetry.engine_state}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HEADING ANGLE</div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>
                    {Math.round(telemetry.heading)}°
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TRANSMISSION</div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    GEAR {telemetry.gear}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL DISTANCE</div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>
                    {telemetry.odometer} KM
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={14} color="var(--accent-cyan)" />
                <span>Keyboard: W/A/S/D to drive | Space for E-Stop | H for Horn | L for Lights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Vision Feed & Telemetry Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* AI Vision Panel */}
          <WebcamFeed showControls={true} />

          {/* Telemetry & Controls Panel */}
          <TelemetryCard />

          {/* Live Command Log Ticker */}
          <div className="glass-panel" style={{ padding: 16 }}>
            <div className="hud-title" style={{ marginBottom: 10 }}>
              <History size={16} className="highlight" />
              <span>LIVE COMMAND AUDIT</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
              {recentCommands.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
                  No vehicle commands issued yet. Show gestures to webcam or use keyboard.
                </div>
              ) : (
                recentCommands.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      borderLeft: c.command === 'EMERGENCY_STOP' ? '3px solid #ff3366' : '3px solid var(--accent-cyan)',
                    }}
                  >
                    <div>
                      <span style={{ fontFamily: 'var(--font-hud)', fontWeight: 700, color: '#fff' }}>{c.command}</span>
                      <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>via {c.gesture}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-hud)' }}>
                        {Math.round(c.confidence * 100)}%
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{c.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
