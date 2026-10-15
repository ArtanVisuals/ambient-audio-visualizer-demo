import { useEffect, useRef } from "react";
import { getBeatState } from "./AudioVisualizer";

export function InteractiveParticles() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    const isNative = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
    const NUM_PARTICLES = isNative ? 25 : 65;
    let particles = [];

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        baseSpeedX: (Math.random() - 0.5) * 0.45,
        baseSpeedY: (Math.random() - 0.5) * 0.45,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    // Initialize premium Glassmorphic Bokeh Particles
    let bokehParticles = [];
    const NUM_BOKEH = isNative ? 5 : 12;
    for (let i = 0; i < NUM_BOKEH; i++) {
      bokehParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        baseSpeedX: (Math.random() - 0.5) * 0.15,
        baseSpeedY: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 60 + 40, // size 40px to 100px
        alpha: Math.random() * 0.04 + 0.02, // faint glow opacity
        colorShift: Math.random() * 0.35, // secondary color mix ratio
      });
    }

    // Track mouse
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Dynamic color helper
    const getThemeColors = () => {
      const style = getComputedStyle(document.documentElement);
      const r = parseInt(style.getPropertyValue("--ambient-r")) || 167;
      const g = parseInt(style.getPropertyValue("--ambient-g")) || 139;
      const b = parseInt(style.getPropertyValue("--ambient-b")) || 250;
      return { r, g, b };
    };

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const beat = getBeatState();
      const energy = beat?.energy || 0;
      const bass = beat?.bass || 0;
      const mids = beat?.mids || 0;
      const highs = beat?.highs || 0;
      
      let r = 167, g = 139, b = 250;
      if (beat?.colors && beat.colors[0] && beat.colors[0].length >= 3) {
        r = beat.colors[0][0];
        g = beat.colors[0][1];
        b = beat.colors[0][2];
      } else {
        const themeColors = getThemeColors();
        r = themeColors.r;
        g = themeColors.g;
        b = themeColors.b;
      }
      
      const mouse = mouseRef.current;
      const repelRadius = 160;

      // 1. Render Glassmorphic Bokeh Particles (placed behind/underneath standard constellation particles)
      for (let i = 0; i < bokehParticles.length; i++) {
        const p = bokehParticles[i];
        const isLeft = p.x < canvas.width / 2;
        const pChannel = isLeft ? (beat?.left || beat) : (beat?.right || beat);
        const pBass   = pChannel?.bass || 0;
        const pHighs  = pChannel?.highs || 0;
        const pEnergy = pChannel?.energy || 0;

        // Apply friction
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Soft mouse repelling force
        if (mouse.active) {
          let dx = p.x - mouse.x;
          let dy = p.y - mouse.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) {
            const force = (220 - dist) / 220;
            p.vx += (dx / dist) * force * 0.4;
            p.vy += (dy / dist) * force * 0.4;
          }
        }

        const speedMultiplier = 1.0 + pBass * 1.5;
        p.x += p.vx + p.baseSpeedX * speedMultiplier;
        p.y += p.vy + p.baseSpeedY * speedMultiplier;

        // Wrapping boundaries
        if (p.x < -p.size) p.x = canvas.width + p.size;
        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = canvas.height + p.size;
        if (p.y > canvas.height + p.size) p.y = -p.size;

        // Pulse size and alpha based on music energy
        const currentSize = p.size * (1.0 + pEnergy * 0.45);
        const currentAlpha = Math.min(0.12, p.alpha * (1.0 + pBass * 0.8));

        // Mixed tone gradient coloring
        let br = r, bg = g, bb = b;
        if (beat?.colors && beat.colors[1] && p.colorShift > 0.15) {
          br = Math.round(r * (1.0 - p.colorShift) + beat.colors[1][0] * p.colorShift);
          bg = Math.round(g * (1.0 - p.colorShift) + beat.colors[1][1] * p.colorShift);
          bb = Math.round(b * (1.0 - p.colorShift) + beat.colors[1][2] * p.colorShift);
        }

        // Draw soft radial glow gradient
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
        grad.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, ${currentAlpha})`);
        grad.addColorStop(0.3, `rgba(${br}, ${bg}, ${bb}, ${currentAlpha * 0.4})`);
        grad.addColorStop(1, `rgba(${br}, ${bg}, ${bb}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render standard constellation particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Determine left vs right channel based on x coordinate
        const isLeft = p.x < canvas.width / 2;
        const pChannel = isLeft ? (beat?.left || beat) : (beat?.right || beat);
        const pBass   = pChannel?.bass || 0;
        const pHighs  = pChannel?.highs || 0;
        const pEnergy = pChannel?.energy || 0;

        // Apply base drifting speed
        let dx = p.x - mouse.x;
        let dy = p.y - mouse.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Interactive mouse force
        if (mouse.active && dist < repelRadius) {
          const force = (repelRadius - dist) / repelRadius;
          // Accelerate away from mouse
          p.vx += (dx / dist) * force * 0.9 * (1 + pEnergy * 0.5);
          p.vy += (dy / dist) * force * 0.9 * (1 + pEnergy * 0.5);
        }

        // Apply friction
        p.vx *= 0.93;
        p.vy *= 0.93;

        // Move particle with dynamic velocity driven by kicks/bass, and high-frequency random jitter turbulence
        const speedMultiplier = 1 + pBass * 2.2;
        const jitter = pHighs * 0.35;
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;

        p.x += p.vx + p.baseSpeedX * speedMultiplier + jx;
        p.y += p.vy + p.baseSpeedY * speedMultiplier + jy;

        // Boundary wrapping
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle with glowing aura
        const currentSize = p.size * (1.0 + pEnergy * 1.8);
        const currentAlpha = Math.min(1.0, p.alpha * (1.0 + pEnergy * 1.5));
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentAlpha})`;
        ctx.fill();

        // Connect nearby particles for a glowing constellation effect
        // Connection opacity and radius scale dynamically based on audio frequencies
        const lineMaxAlpha = 0.09 * (0.15 + pEnergy * 0.85);
        const connectionRadius = 75 + pBass * 20;
        const maxDistSq = connectionRadius * connectionRadius;
        
        // Optimised loop: only match each pair once (i vs j > i)
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          let odx = p.x - other.x;
          let ody = p.y - other.y;
          let odistSq = odx * odx + ody * ody;
          if (odistSq < maxDistSq) {
            let odist = Math.sqrt(odistSq);
            const lineAlpha = (1 - odist / connectionRadius) * lineMaxAlpha;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 pointer-events-none"
      style={{ mixBlendMode: "screen", opacity: 0.8 }}
    />
  );
}
