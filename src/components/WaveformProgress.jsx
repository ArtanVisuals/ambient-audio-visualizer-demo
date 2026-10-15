import { useEffect, useRef } from 'react';
import { getSharedAnalyser, resumeAudioContext } from './AudioVisualizer';

const LABEL_H = 18; // px reserved at bottom of canvas for timestamp labels

const fmt = (s) => {
  if (!s || isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export function WaveformProgress({
  progress     = 0,
  progressRef  = null,   // optional: mutable ref with real-time audio position
  totalSeconds = 0,
  isPlaying    = false,
  onSeek,
  waveColors   = ['200 210 220', '180 195 215', '165 180 210'],
  trackId      = 'default',
}) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const freqBuf   = useRef(new Uint8Array(128));
  const bars      = useRef(new Float32Array(64));
  const dragging  = useRef(false);
  const seekPct   = useRef(-1);

  // Keep all props accessible inside RAF loop without recreating drawFrame
  const live = useRef({ progress, totalSeconds, isPlaying, waveColors, progressRef });
  live.current = { progress, totalSeconds, isPlaying, waveColors, progressRef };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = null;

    const draw = () => {
      try {
        const isMobile = window.innerWidth < 1024;
        const dpr  = Math.min(isMobile ? 1.5 : 2.0, window.devicePixelRatio || 1);
        const cssW = canvas.offsetWidth;
        const cssH = canvas.offsetHeight;
        if (cssW < 2 || cssH < 2) { raf = requestAnimationFrame(draw); return; }

        // Resize canvas only when dimensions actually change
        const targetW = Math.round(cssW * dpr);
        const targetH = Math.round(cssH * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width  = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const isNeobrutalism = document.documentElement.getAttribute('data-morphism') === 'neobrutalism';

        const { isPlaying, progress: stateProgress, totalSeconds, waveColors, progressRef: pRef } = live.current;
        // Use real-time ref for smooth playhead; fall back to throttled state
        const progress = (pRef && typeof pRef.current === 'number') ? pRef.current : stateProgress;

        const W  = cssW;
        const H  = cssH - LABEL_H;
        const cy = H / 2;
        const N  = Math.min(64, Math.floor(W / 7));

        // Pull frequency data
        const analyser = getSharedAnalyser();
        if (analyser && isPlaying) {
          if (freqBuf.current.length !== analyser.frequencyBinCount)
            freqBuf.current = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(freqBuf.current);
        }

        // Smooth bars
        for (let i = 0; i < N; i++) {
          let target = 0;
          if (isPlaying && analyser) {
            const bin = Math.floor((i / N) * freqBuf.current.length * 0.70);
            target = Math.pow((freqBuf.current[bin] ?? 0) / 255, 0.65);
          }
          const alpha = target > bars.current[i] ? 0.30 : 0.12;
          bars.current[i] = bars.current[i] * (1 - alpha) + target * alpha;
        }

        // Progress position
        const pct    = seekPct.current >= 0
          ? seekPct.current
          : (totalSeconds > 0 ? Math.min(1, progress / totalSeconds) : 0);
        const splitX = W * pct;

        // Bar geometry
        const gap  = Math.max(1.5, W / (N * 6));
        const barW = Math.max(2, (W - gap * (N - 1)) / N);
        const step = barW + gap;
        const startX = (W - (step * N - gap)) / 2;

        // Played gradient
        const playedGrad = ctx.createLinearGradient(0, 0, splitX + 1, 0);
        playedGrad.addColorStop(0,   `rgb(${waveColors[0]})`);
        playedGrad.addColorStop(0.5, `rgb(${waveColors[1]})`);
        playedGrad.addColorStop(1,   `rgb(${waveColors[2]})`);

        ctx.shadowBlur = 0;
        for (let i = 0; i < N; i++) {
          const v    = bars.current[i];
          const half = Math.max(3, v * cy * 0.92);
          const x    = startX + i * step;
          const isPlayed = (x + barW / 2) <= splitX;

          ctx.beginPath();
          ctx.rect(x, cy - half, barW, half * 2);

          if (isPlayed) {
            ctx.fillStyle  = playedGrad;
          } else {
            ctx.fillStyle  = isNeobrutalism
              ? `rgba(0,0,0,${(0.12 + v * 0.1).toFixed(3)})`
              : `rgba(255,255,255,${(0.18 + v * 0.14).toFixed(3)})`;
          }
          ctx.fill();
        }

        // Playhead
        if (pct > 0.002 && pct < 0.998) {
          ctx.save();
          ctx.strokeStyle = isNeobrutalism ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,1)';
          ctx.lineWidth   = 2;
          ctx.beginPath();
          ctx.moveTo(splitX, 2);
          ctx.lineTo(splitX, H - 2);
          ctx.stroke();
          ctx.restore();
        }

        // Timestamps — drawn on canvas, no DOM re-renders
        ctx.font         = `500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle    = isNeobrutalism ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)';
        ctx.textBaseline = 'middle';
        const labelY     = H + LABEL_H / 2;
        ctx.textAlign = 'left';
        ctx.fillText(fmt(progress), 2, labelY);
        ctx.textAlign = 'right';
        ctx.fillText(fmt(totalSeconds), W - 2, labelY);

        ctx.restore();
      } catch (e) {
        // swallow draw errors silently
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    rafRef.current = { cancel: () => { if (raf) cancelAnimationFrame(raf); raf = null; } };
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []); // stable — all live data read via ref

  const getSeekSec = (e) => {
    const rc  = canvasRef.current.getBoundingClientRect();
    // Only seek within the waveform area (exclude label strip at bottom)
    const clampedY = Math.min(e.clientY - rc.top, rc.height - LABEL_H);
    if (clampedY < 0) return null;
    const pct = Math.max(0, Math.min(e.clientX - rc.left, rc.width)) / rc.width;
    return pct * (live.current.totalSeconds || 1);
  };

  const onDown = (e) => {
    resumeAudioContext();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = getSeekSec(e);
    if (s !== null) {
      seekPct.current = s / (live.current.totalSeconds || 1);
      onSeek?.(s);
    }
  };

  const onMove = (e) => {
    if (!dragging.current) return;
    const s = getSeekSec(e);
    if (s !== null) {
      seekPct.current = s / (live.current.totalSeconds || 1);
      onSeek?.(s);
    }
  };

  const onUp = (e) => {
    dragging.current = false;
    seekPct.current  = -1;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col w-full select-none">
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer touch-none rounded-sm"
        style={{ height: `clamp(66px, 7vw, 82px)`, display: 'block' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="Waveform progress bar"
      />
    </div>
  );
}
