import React, { useEffect, useRef } from 'react';

export function LogoAnimation({ onComplete, isTransitioning, playIntro = true }) {
  const canvasRef = useRef(null);
  const animStartRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = 220, H = 52;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let hasCompleted = false;
    const DURATION = playIntro ? 2200 : 0;

    const drawLogo = (progress, glowIntensity) => {
      ctx.clearRect(0, 0, W, H);

      const fontSize = 28;
      ctx.font = `700 ${fontSize}px "Outfit", "Inter", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      const text = 'SONORA';
      const fullW = ctx.measureText(text).width;
      const startX = (W - fullW) / 2;
      const midY = H / 2;

      // How many chars to reveal (0 → 6)
      const revealed = Math.min(text.length, Math.ceil(progress * (text.length + 1)));

      let curX = startX;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const chW = ctx.measureText(ch).width;
        const charProgress = Math.max(0, Math.min(1, (progress * (text.length + 1) - i)));

        if (charProgress <= 0) { curX += chW; continue; }

        const alpha = Math.min(1, charProgress * 3);
        const yOff = charProgress >= 1 ? 0 : (1 - charProgress) * 8;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(curX + chW / 2, midY + yOff);

        // Glow layers
        const glow = glowIntensity * alpha;
        if (glow > 0) {
          ctx.shadowColor = `rgba(52, 211, 153, ${glow})`;
          ctx.shadowBlur = 18 * glow;
          ctx.fillStyle = `rgba(255,255,255,${0.92 + 0.08 * glow})`;
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 0;
        }

        ctx.fillText(ch, -chW / 2, 0);

        // Second glow pass for intensity
        if (glow > 0.4) {
          ctx.shadowColor = `rgba(167, 243, 208, ${glow * 0.5})`;
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(255,255,255,${0.6 * glow})`;
          ctx.fillText(ch, -chW / 2, 0);
        }

        ctx.restore();
        curX += chW;
      }

      // Underline accent line (fades in after letters)
      if (progress > 0.6) {
        const lineP = Math.min(1, (progress - 0.6) / 0.4);
        const lineW = fullW * lineP;
        const lineY = midY + fontSize * 0.55;

        ctx.save();
        ctx.globalAlpha = lineP * 0.7;
        const grad = ctx.createLinearGradient(startX, lineY, startX + fullW, lineY);
        grad.addColorStop(0, 'rgba(52,211,153,0)');
        grad.addColorStop(0.3, 'rgba(52,211,153,0.9)');
        grad.addColorStop(0.7, 'rgba(167,243,208,0.9)');
        grad.addColorStop(1, 'rgba(52,211,153,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(52,211,153,0.8)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(startX, lineY);
        ctx.lineTo(startX + lineW, lineY);
        ctx.stroke();
        ctx.restore();
      }
    };

    const tick = (now) => {
      if (!animStartRef.current) {
        animStartRef.current = now;
      }

      const elapsed = now - animStartRef.current;
      let t;

      if (!playIntro || DURATION === 0) {
        t = 1;
      } else {
        t = Math.min(elapsed / DURATION, 1);
      }

      // Ease in-out
      const progress = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Glow pulses once fully revealed
      const cycle = elapsed / 2000;
      const glowIntensity = t >= 1
        ? (isTransitioning ? 0.4 : 0.3 + 0.2 * Math.sin(cycle * Math.PI))
        : progress * 0.5;

      drawLogo(progress, glowIntensity);

      if (!hasCompleted && t >= 0.9 && onComplete) {
        hasCompleted = true;
        onComplete();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete, isTransitioning, playIntro]);

  return (
    <canvas
      ref={canvasRef}
      className="block select-none pointer-events-none will-change-transform"
      style={{ width: '220px', height: '52px' }}
    />
  );
}
