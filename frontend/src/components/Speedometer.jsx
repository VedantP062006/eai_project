import React from 'react';
import { useVehicle } from '../context/VehicleContext';

export const Speedometer = ({ size = 210 }) => {
  const { telemetry } = useVehicle();
  const speed = Math.abs(telemetry.speed || 0);
  const maxSpeed = telemetry.speed_mode === 'SPORT' ? 85 : telemetry.speed_mode === 'ECO' ? 25 : 50;

  // Percentage from 0.0 to 1.0
  const percentage = Math.min(1.0, speed / maxSpeed);

  // SVG Arc Geometry (from -135deg to +135deg = 270deg total sweep)
  const strokeRadius = (size / 2) - 18;
  const circumference = 2 * Math.PI * strokeRadius;
  const arcLength = circumference * 0.75; // 270 / 360 = 0.75
  const strokeDashoffset = arcLength - (arcLength * percentage);

  // Dynamic Neon Gauge Color
  const gaugeColor = percentage > 0.85 ? '#ff3366' : percentage > 0.6 ? '#f59e0b' : '#00f0ff';

  // Generate tick marks (11 ticks = 0% to 100% in 10% steps)
  const ticks = [];
  const startAngle = 135;
  const totalSweep = 270;
  for (let i = 0; i <= 10; i++) {
    const angle = (startAngle + (i / 10) * totalSweep) * (Math.PI / 180);
    const rInner = strokeRadius - 10;
    const rOuter = strokeRadius - 4;
    const cx = size / 2;
    const cy = size / 2;
    const x1 = cx + rInner * Math.cos(angle);
    const y1 = cy + rInner * Math.sin(angle);
    const x2 = cx + rOuter * Math.cos(angle);
    const y2 = cy + rOuter * Math.sin(angle);
    const isLit = (i / 10) <= percentage;
    ticks.push({ x1, y1, x2, y2, isLit });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Arc Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={strokeRadius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth="10"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(135deg)', transformOrigin: 'center' }}
        />

        {/* Tick Marks */}
        {ticks.map((t, idx) => (
          <line
            key={idx}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isLit ? gaugeColor : 'rgba(255, 255, 255, 0.15)'}
            strokeWidth={idx % 5 === 0 ? 2 : 1}
            style={{ transition: 'stroke 0.2s ease' }}
          />
        ))}

        {/* Active Speed Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={strokeRadius}
          fill="transparent"
          stroke={gaugeColor}
          strokeWidth="10"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(135deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 0.12s ease-out, stroke 0.25s ease',
            filter: `drop-shadow(0 0 10px ${gaugeColor})`,
          }}
        />
      </svg>

      {/* Speedometer Center Readout */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)', letterSpacing: '0.12em' }}>
          VELOCITY
        </div>
        <div
          style={{
            fontFamily: 'var(--font-hud)',
            fontSize: '2.6rem',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1,
            textShadow: `0 0 16px ${gaugeColor}`,
            marginTop: 2,
          }}
        >
          {Math.round(speed)}
        </div>
        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', color: 'var(--accent-cyan)', letterSpacing: '0.08em', marginTop: 2 }}>
          KM / H
        </div>

        {/* Drive Badges */}
        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(0, 240, 255, 0.18)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 240, 255, 0.35)',
            }}
          >
            {telemetry.gear}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.68rem',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-muted)',
            }}
          >
            {telemetry.speed_mode}
          </span>
        </div>
      </div>
    </div>
  );
};
