import React, { useRef, useEffect } from 'react';
import { useVehicle } from '../context/VehicleContext';

export const VehicleCanvas = ({ width = 760, height = 400 }) => {
  const canvasRef = useRef(null);
  const { telemetry, sendManualCommand } = useVehicle();
  const tracksRef = useRef([]);
  const roadOffsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      const {
        x = 380,
        y = 200,
        heading = 0,
        speed = 0,
        steering_angle = 0,
        headlights = false,
        brake_lights = false,
        indicator_blink_active = false,
        left_indicator = false,
        right_indicator = false,
        hazard_lights = false,
        horn = false,
        gear = 'P',
        engine_state = 'STOPPED',
      } = telemetry;

      // Clear Canvas with Obsidian Asphalt Gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.7);
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(1, '#050811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Track road animation offset
      roadOffsetRef.current = (roadOffsetRef.current + speed * 0.15) % 40;

      // Draw Grid / Asphalt Road Network
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let gx = 0; gx < width; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Outer Oval Circuit Track
      const trackRadiusX = width * 0.38;
      const trackRadiusY = height * 0.35;
      const centerX = width / 2;
      const centerY = height / 2;

      // Track Asphalt Base
      ctx.strokeStyle = '#0e1628';
      ctx.lineWidth = 60;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, trackRadiusX, trackRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Outer Neon Track Border
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, trackRadiusX + 30, trackRadiusY + 30, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Neon Track Border
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, trackRadiusX - 30, trackRadiusY - 30, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Center Dashed Yellow Circuit Line
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([14, 12]);
      ctx.lineDashOffset = -roadOffsetRef.current;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, trackRadiusX, trackRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Manage and Draw Tire Smoke / Tracks
      if (Math.abs(speed) > 1.5) {
        tracksRef.current.push({
          x,
          y,
          heading,
          life: 1.0,
          isSteering: Math.abs(steering_angle) > 12,
        });
      }
      if (tracksRef.current.length > 70) {
        tracksRef.current.shift();
      }

      ctx.save();
      tracksRef.current.forEach((tr) => {
        tr.life -= 0.015;
        if (tr.life > 0) {
          ctx.save();
          ctx.translate(tr.x, tr.y);
          ctx.rotate((tr.heading * Math.PI) / 180);
          ctx.fillStyle = tr.isSteering
            ? `rgba(0, 240, 255, ${tr.life * 0.2})`
            : `rgba(255, 255, 255, ${tr.life * 0.08})`;
          ctx.fillRect(-15, 18, 4, 10);
          ctx.fillRect(11, 18, 4, 10);
          ctx.restore();
        }
      });
      ctx.restore();

      // Horn Acoustic Pulse Wave
      if (horn) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
        ctx.lineWidth = 2.5;
        const pulse = ((Date.now() / 6) % 80) + 15;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, pulse * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // --- Draw Vehicle ---
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((heading * Math.PI) / 180);

      // Neon Underglow LEDs
      const isEstop = engine_state === 'EMERGENCY_STOPPED';
      const underglowColor = isEstop
        ? 'rgba(255, 51, 102, 0.6)'
        : headlights
        ? 'rgba(0, 240, 255, 0.55)'
        : 'rgba(56, 189, 248, 0.3)';

      ctx.shadowColor = underglowColor;
      ctx.shadowBlur = 24;
      ctx.fillStyle = underglowColor;
      ctx.beginPath();
      ctx.roundRect(-16, -26, 32, 52, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 1. Headlight Cones (Volumetric Beams)
      if (headlights) {
        const beamLength = 180;
        const beamSpread = 42;

        // Left Headlight Cone
        const gradL = ctx.createRadialGradient(-13, -28, 4, -22, -28 - beamLength, beamSpread * 1.5);
        gradL.addColorStop(0, 'rgba(255, 255, 245, 0.85)');
        gradL.addColorStop(0.25, 'rgba(0, 240, 255, 0.45)');
        gradL.addColorStop(1, 'rgba(0, 240, 255, 0)');

        ctx.fillStyle = gradL;
        ctx.beginPath();
        ctx.moveTo(-13, -28);
        ctx.lineTo(-13 - beamSpread, -28 - beamLength);
        ctx.lineTo(-13 + beamSpread * 0.35, -28 - beamLength);
        ctx.closePath();
        ctx.fill();

        // Right Headlight Cone
        const gradR = ctx.createRadialGradient(13, -28, 4, 22, -28 - beamLength, beamSpread * 1.5);
        gradR.addColorStop(0, 'rgba(255, 255, 245, 0.85)');
        gradR.addColorStop(0.25, 'rgba(0, 240, 255, 0.45)');
        gradR.addColorStop(1, 'rgba(0, 240, 255, 0)');

        ctx.fillStyle = gradR;
        ctx.beginPath();
        ctx.moveTo(13, -28);
        ctx.lineTo(13 - beamSpread * 0.35, -28 - beamLength);
        ctx.lineTo(13 + beamSpread, -28 - beamLength);
        ctx.closePath();
        ctx.fill();
      }

      // 2. Alloy Wheels with Brake Calipers
      const drawWheel = (wx, wy, angle) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate((angle * Math.PI) / 180);
        // Rubber Tire
        ctx.fillStyle = '#090e17';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-4.5, -9, 9, 18, 3);
        ctx.fill();
        ctx.stroke();
        // Rim Highlight
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(-1.5, -4, 3, 8);
        ctx.restore();
      };

      // Front Wheels rotate with steering angle
      drawWheel(-18, -19, steering_angle);
      drawWheel(18, -19, steering_angle);
      // Rear Wheels
      drawWheel(-18, 19, 0);
      drawWheel(18, 19, 0);

      // 3. Cybernetic Aerodynamic Body
      const carW = 34;
      const carH = 70;

      // Chassis Body Gradient
      const bodyGrad = ctx.createLinearGradient(0, -carH / 2, 0, carH / 2);
      bodyGrad.addColorStop(0, '#0369a1');
      bodyGrad.addColorStop(0.2, '#0284c7');
      bodyGrad.addColorStop(0.6, '#0f172a');
      bodyGrad.addColorStop(1, '#0284c7');

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      ctx.roundRect(-carW / 2, -carH / 2, carW, carH, [10, 10, 8, 8]);
      ctx.fill();
      ctx.stroke();

      // Front Hood Scoop / Vent
      ctx.fillStyle = '#040d1a';
      ctx.beginPath();
      ctx.moveTo(-10, -26);
      ctx.lineTo(10, -26);
      ctx.lineTo(6, -16);
      ctx.lineTo(-6, -16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.stroke();

      // Cockpit Tinted Canopy (Glass)
      ctx.fillStyle = '#060c18';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-12, -12, 24, 30, 5);
      ctx.fill();
      ctx.stroke();

      // Canopy Glass Highlight
      ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(-9, -9);
      ctx.lineTo(9, -9);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();

      // Rear Diffuser / Wing
      ctx.fillStyle = '#082f49';
      ctx.fillRect(-16, 29, 32, 4);

      // 4. Headlight Bulbs
      ctx.fillStyle = headlights ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
      ctx.shadowColor = headlights ? '#00f0ff' : 'transparent';
      ctx.shadowBlur = headlights ? 14 : 0;
      ctx.fillRect(-14, -carH / 2, 6, 3);
      ctx.fillRect(8, -carH / 2, 6, 3);

      // 5. Taillight / Brake LED Light Bar
      const isBraking = brake_lights || isEstop;
      ctx.fillStyle = isBraking ? '#ff0033' : 'rgba(220, 20, 50, 0.4)';
      ctx.shadowColor = isBraking ? '#ff0033' : 'transparent';
      ctx.shadowBlur = isBraking ? 20 : 0;
      ctx.fillRect(-14, carH / 2 - 3, 28, 3.5);

      // 6. Indicators (Amber Blinkers)
      const isLeftBlink = indicator_blink_active && (left_indicator || hazard_lights);
      const isRightBlink = indicator_blink_active && (right_indicator || hazard_lights);

      if (isLeftBlink) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 16;
        ctx.fillRect(-carW / 2 - 2, -carH / 2 + 2, 4, 6);
        ctx.fillRect(-carW / 2 - 2, carH / 2 - 8, 4, 6);
      }
      if (isRightBlink) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 16;
        ctx.fillRect(carW / 2 - 2, -carH / 2 + 2, 4, 6);
        ctx.fillRect(carW / 2 - 2, carH / 2 - 8, 4, 6);
      }

      ctx.restore();

      // Interactive HUD Corner Overlays
      ctx.font = '11px Orbitron, monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
      ctx.fillText(`VELOCITY: ${Math.round(Math.abs(speed))} KM/H [GEAR ${gear}]`, 16, 26);
      ctx.fillText(`HEADING: ${Math.round(heading)}° | STEER: ${Math.round(steering_angle)}°`, 16, 44);

      // Controls quick help bar on canvas
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.fillText('W/S: Drive | A/D: Steer | Space: E-Stop | Thumb Up: Start', 16, height - 14);

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [telemetry, width, height]);

  // Click on canvas to steer or set position
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // If clicked forward of car, move forward, else steer towards click
    sendManualCommand('START');
  };

  return (
    <div
      onClick={handleCanvasClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        cursor: 'crosshair',
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Floating Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 14,
          background: 'rgba(6, 10, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-hud)',
          fontSize: '0.74rem',
          color: telemetry.engine_state === 'RUNNING' ? '#10b981' : '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: telemetry.engine_state === 'RUNNING' ? '#10b981' : '#f59e0b',
            boxShadow: `0 0 10px ${telemetry.engine_state === 'RUNNING' ? '#10b981' : '#f59e0b'}`,
          }}
        />
        {telemetry.engine_state}
      </div>
    </div>
  );
};
