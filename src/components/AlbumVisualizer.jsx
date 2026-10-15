import { useEffect, useRef, useCallback } from 'react';
import { getSharedAnalyser, getSharedAnalyserL, getSharedAnalyserR } from './AudioVisualizer';
import { usePlayer } from '../context/PlayerContext';

/**
 * AlbumVisualizer — renders 4 canvas strips (top, bottom, left, right)
 * around the album art that react to audio frequency data.
 * Uses the shared AudioContext analyser so it works with both local and
 * global-search songs seamlessly.
 */

const BAR_COUNT = 24;       // bars per side
const RISE_SPEED = 0.80;    // fast responsive attack for punchy beats
const FALL_SPEED = 0.22;    // fluid spring decay
const MAX_BAR_H = 28;       // max bar height in px (outward from album edge)
const BAR_GAP_RATIO = 2.2;  // spacing ratio between bars
const GLOW_BLUR = 10;       // px glow on active bars
const CORNER_RADIUS = 2;    // bar corner radius

export function AlbumVisualizer({ isPlaying, waveColors = ['200 210 220', '180 195 215', '165 180 210'] }) {
  const { ambientSettings, stereoSeparationEnabled } = usePlayer();
  const topRef    = useRef(null);
  const bottomRef = useRef(null);
  const leftRef   = useRef(null);
  const rightRef  = useRef(null);
  const rafRef    = useRef(null);
  const freqBuf   = useRef(new Uint8Array(256));
  const freqBufL  = useRef(new Uint8Array(256));
  const freqBufR  = useRef(new Uint8Array(256));
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = topRef.current;
    if (!canvas || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisibleRef.current = entry.isIntersecting;
      });
    }, { threshold: 0.01 });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Smoothed bar values per side — each side reads different frequency bands
  const barsTop    = useRef(new Float32Array(BAR_COUNT));
  const barsBottom = useRef(new Float32Array(BAR_COUNT));
  const barsLeft   = useRef(new Float32Array(BAR_COUNT));
  const barsRight  = useRef(new Float32Array(BAR_COUNT));

  const liveRef = useRef({ isPlaying, waveColors });
  liveRef.current = { isPlaying, waveColors };

  // Cache sizes to avoid DOM layout reads in render loop (prevents layout thrashing)
  const canvasSizes = useRef({
    top: { w: 0, h: 0, dpr: 1 },
    bottom: { w: 0, h: 0, dpr: 1 },
    left: { w: 0, h: 0, dpr: 1 },
    right: { w: 0, h: 0, dpr: 1 }
  });

  const resizeAll = useCallback(() => {
    const isMobile = window.innerWidth < 1024;
    const dpr = Math.min(isMobile ? 1.5 : 2.0, window.devicePixelRatio || 1);
    const sides = ['top', 'bottom', 'left', 'right'];
    const refs = { top: topRef, bottom: bottomRef, left: leftRef, right: rightRef };

    sides.forEach(side => {
      const canvas = refs[side].current;
      if (!canvas) return;
      const w = canvas.clientWidth || canvas.offsetWidth || 0;
      const h = canvas.clientHeight || canvas.offsetHeight || 0;
      if (w < 1 || h < 1) return;

      const tw = Math.round(w * dpr);
      const th = Math.round(h * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }
      canvasSizes.current[side] = { w, h, dpr };
    });
  }, []);

  useEffect(() => {
    resizeAll();
    const timer = setTimeout(resizeAll, 100);
    window.addEventListener('resize', resizeAll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeAll);
    };
  }, [resizeAll]);

  /** Draw bars on one side.
   *  @param {"top"|"bottom"|"left"|"right"} side
   *  @param {HTMLCanvasElement} canvas
   *  @param {Float32Array} bars — smoothed bar heights
   *  @param {number} freqOffset — where in the frequency spectrum to start reading
   *  @param {number} freqSpan — how much of the spectrum to use
   *  @param {number} multiplier — user defined sensitivity
   */
  const drawSide = useCallback((side, canvas, bars, freqOffset, freqSpan, playing, waveColors, time, multiplier = 1.0, currentFreqBuf) => {
    if (!canvas) return;
    
    const size = canvasSizes.current[side];
    if (!size || size.w < 1 || size.h < 1) return;

    const { w: cssW, h: cssH, dpr } = size;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const N = BAR_COUNT;
    const isHoriz = (side === 'top' || side === 'bottom');
    const length = isHoriz ? cssW : cssH; // along the strip
    const depth  = isHoriz ? cssH : cssW; // perpendicular (bar height grows into this)

    // Calculate bar dimensions
    const barW = Math.max(2, length / (N * BAR_GAP_RATIO));
    const totalBarsW = N * barW;
    const gap = N > 1 ? (length - totalBarsW) / (N - 1) : 0;

    // Create a gradient for the playing state
    let grad = null;
    if (isHoriz) {
      grad = ctx.createLinearGradient(0, 0, length, 0);
    } else {
      grad = ctx.createLinearGradient(0, 0, 0, length);
    }

    for (let i = 0; i < N; i++) {
      // Map bar index to a frequency bin
      const binIdx = Math.floor(freqOffset + (i / N) * freqSpan);
      let target;
      
      if (playing && currentFreqBuf) {
        const rawVal = (currentFreqBuf[binIdx] ?? 0) / 255;
        target = Math.pow(rawVal, 0.58) * multiplier;
      } else {
        // Subtle idle breathing animation — different phase per bar
        const phase = (i / N) * Math.PI * 2 + time * 0.0008;
        target = 0.06 + Math.sin(phase) * 0.04;
      }

      // Smooth: rise fast, fall slow
      const alpha = target > bars[i] ? RISE_SPEED : FALL_SPEED;
      bars[i] = bars[i] * (1 - alpha) + target * alpha;

      const v = bars[i];
      const barH = Math.max(2, v * Math.min(MAX_BAR_H, depth * 0.88));
      const pos = i * (barW + gap);

      // Bar alpha: faint when idle, vivid when loud
      const barAlpha = playing
        ? Math.min(0.95, 0.12 + v * 0.83)
        : Math.min(0.14, 0.04 + v * 0.6);

      // Color per bar — smooth gradient across the strip
      const t = i / (N - 1);
      let color;
      if (t < 0.5) {
        const mix = t * 2;
        color = lerpColor(waveColors[0], waveColors[1], mix);
      } else {
        const mix = (t - 0.5) * 2;
        color = lerpColor(waveColors[1], waveColors[2], mix);
      }

      ctx.fillStyle = `rgba(${color},${barAlpha.toFixed(3)})`;

      // Add glow for loud bars — Disabled on mobile/tablet/native apps for performance
      const isNative = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
      const isLowPower = window.innerWidth < 1024 || isNative;
      if (v > 0.25 && playing && !isLowPower) {
        ctx.shadowColor = `rgba(${color},${(v * 0.55).toFixed(2)})`;
        ctx.shadowBlur = GLOW_BLUR * v;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();

      let x, y, w, h;
      if (side === 'top') {
        // Bars grow downward from top edge of canvas
        x = pos;
        y = depth - barH;
        w = barW;
        h = barH;
      } else if (side === 'bottom') {
        // Bars grow upward from bottom edge
        x = pos;
        y = 0;
        w = barW;
        h = barH;
      } else if (side === 'left') {
        // Bars grow rightward from left edge
        x = depth - barH;
        y = pos;
        w = barH;
        h = barW;
      } else {
        // Bars grow leftward from right edge
        x = 0;
        y = pos;
        w = barH;
        h = barW;
      }

      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, CORNER_RADIUS);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }, []);

  useEffect(() => {
    let raf = null;

    const draw = (timestamp) => {
      if (!isVisibleRef.current) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const { isPlaying, waveColors } = liveRef.current;
      const analyser = getSharedAnalyser();
      const analyserL = getSharedAnalyserL();
      const analyserR = getSharedAnalyserR();

      const useStereo = stereoSeparationEnabled && analyserL && analyserR;

      // Pull frequency data once per frame
      if (isPlaying) {
        if (useStereo) {
          if (freqBufL.current.length !== analyserL.frequencyBinCount)
            freqBufL.current = new Uint8Array(analyserL.frequencyBinCount);
          analyserL.getByteFrequencyData(freqBufL.current);

          if (freqBufR.current.length !== analyserR.frequencyBinCount)
            freqBufR.current = new Uint8Array(analyserR.frequencyBinCount);
          analyserR.getByteFrequencyData(freqBufR.current);
        } else if (analyser) {
          if (freqBuf.current.length !== analyser.frequencyBinCount)
            freqBuf.current = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(freqBuf.current);
        }
      }

      const activeBufL = useStereo ? freqBufL.current : freqBuf.current;
      const activeBufR = useStereo ? freqBufR.current : freqBuf.current;
      const len = activeBufL.length;

      // Each side reads a different band of the spectrum for variety:
      // Top: low-mids (bass punch) — bins 0–30%
      drawSide('top',    topRef.current,    barsTop.current,    0,              Math.floor(len * 0.30), isPlaying, waveColors, timestamp, ambientSettings.bass, activeBufL);
      // Bottom: mids (vocals) — bins 20–55%
      drawSide('bottom', bottomRef.current, barsBottom.current, Math.floor(len * 0.20), Math.floor(len * 0.35), isPlaying, waveColors, timestamp, ambientSettings.mids, activeBufR);
      // Left: low (sub-bass) — bins 0–25%
      drawSide('left',   leftRef.current,   barsLeft.current,   0,              Math.floor(len * 0.25), isPlaying, waveColors, timestamp, ambientSettings.bass, activeBufL);
      // Right: hi-mids + highs (cymbals, hi-hats) — bins 35–70%
      drawSide('right',  rightRef.current,  barsRight.current,  Math.floor(len * 0.35), Math.floor(len * 0.35), isPlaying, waveColors, timestamp, ambientSettings.highs, activeBufR);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    rafRef.current = raf;

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [drawSide, ambientSettings]);

  const STRIP = MAX_BAR_H + 4; // total strip offset from album edge

  return (
    <>
      {/* Top strip */}
      <canvas
        ref={topRef}
        aria-hidden="true"
        style={{
          display: 'block',
          pointerEvents: 'none',
          position: 'absolute',
          top: `-${STRIP}px`,
          left: '6px',
          right: '6px',
          height: `${MAX_BAR_H + 2}px`,
          width: 'calc(100% - 12px)',
        }}
      />
      {/* Bottom strip */}
      <canvas
        ref={bottomRef}
        aria-hidden="true"
        style={{
          display: 'block',
          pointerEvents: 'none',
          position: 'absolute',
          bottom: `-${STRIP}px`,
          left: '6px',
          right: '6px',
          height: `${MAX_BAR_H + 2}px`,
          width: 'calc(100% - 12px)',
        }}
      />
      {/* Left strip */}
      <canvas
        ref={leftRef}
        aria-hidden="true"
        style={{
          display: 'block',
          pointerEvents: 'none',
          position: 'absolute',
          left: `-${STRIP}px`,
          top: '6px',
          bottom: '6px',
          width: `${MAX_BAR_H + 2}px`,
          height: 'calc(100% - 12px)',
        }}
      />
      {/* Right strip */}
      <canvas
        ref={rightRef}
        aria-hidden="true"
        style={{
          display: 'block',
          pointerEvents: 'none',
          position: 'absolute',
          right: `-${STRIP}px`,
          top: '6px',
          bottom: '6px',
          width: `${MAX_BAR_H + 2}px`,
          height: 'calc(100% - 12px)',
        }}
      />
    </>
  );
}

/** Linearly interpolate between two "R G B" color strings, return "R,G,B" */
function lerpColor(a, b, t) {
  const pa = a.split(' ').map(Number);
  const pb = b.split(' ').map(Number);
  return [
    Math.round(pa[0] + (pb[0] - pa[0]) * t),
    Math.round(pa[1] + (pb[1] - pa[1]) * t),
    Math.round(pa[2] + (pb[2] - pa[2]) * t),
  ].join(',');
}
