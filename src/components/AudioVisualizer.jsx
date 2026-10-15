import { useEffect, useRef, useCallback } from 'react';
import { setupSpatialAudio } from '../utils/spatialAudio';

/**
 * Singleton Web Audio API context — shared across the app's lifetime.
 * createMediaElementSource() can only be called once per HTMLMediaElement,
 * so we track what's already connected.
 */
let _audioCtx = null;
let _analyser = null;
let _analyserL = null;
let _analyserR = null;
let _splitter = null;
let _connectedSource = null;
let _connectedEl = null;
const _sourceMap = new Map();

function ensureAnalyser(audioEl) {
  if (!audioEl) return false;
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!_analyser) {
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 512;
      _analyser.smoothingTimeConstant = 0.74;
    }
    if (!_analyserL) {
      _analyserL = _audioCtx.createAnalyser();
      _analyserL.fftSize = 512;
      _analyserL.smoothingTimeConstant = 0.74;
    }
    if (!_analyserR) {
      _analyserR = _audioCtx.createAnalyser();
      _analyserR.fftSize = 512;
      _analyserR.smoothingTimeConstant = 0.74;
    }
    
    // Get or create source node for this element
    let src = _sourceMap.get(audioEl);
    if (!src) {
      src = _audioCtx.createMediaElementSource(audioEl);
      _sourceMap.set(audioEl, src);
    }

    if (_connectedSource !== src) {
      if (_connectedSource) {
        try { _connectedSource.disconnect(); } catch (_) {}
        if (_splitter) {
          try { _splitter.disconnect(); } catch (_) {}
        }
      }
      src.connect(_analyser);
      
      // Split into Left and Right channels for visualizers
      _splitter = _audioCtx.createChannelSplitter(2);
      src.connect(_splitter);
      _splitter.connect(_analyserL, 0); // Connect left output (0) to left analyser
      _splitter.connect(_analyserR, 1); // Connect right output (1) to right analyser
      
      // Setup Spatial Audio engine (binaural soundstage + dry bypass)
      setupSpatialAudio(_audioCtx, src, _audioCtx.destination);
      
      _connectedSource = src;
    }
    _connectedEl = audioEl;
    return true;
  } catch (e) {
    console.error("ensureAnalyser error:", e);
    return false;
  }
}

/** Read-only access to the singleton AnalyserNode for other components */
export function getSharedAnalyser() { return _analyser; }
export function getSharedAnalyserL() { return _analyserL; }
export function getSharedAnalyserR() { return _analyserR; }

export function resumeAudioContext() {
  if (_audioCtx?.state === 'suspended') _audioCtx.resume().catch(() => {});
}
/** Initialize the analyser on the given audio element (safe to call multiple times) */
export function ensureAudioAnalyser(audioEl) { return ensureAnalyser(audioEl); }

/* ═══════════════════════════════════════════════════════════════════
 *  GLOBAL BEAT-REACTIVE ENGINE
 *
 *  Pumps CSS custom properties onto <html> every animation frame so
 *  ANY element on the site can respond to the music via pure CSS.
 *
 *  Variables set:
 *    --beat-bass   (0-1)  sub-bass / kick energy
 *    --beat-mids   (0-1)  mids / vocal energy
 *    --beat-highs  (0-1)  highs / cymbal energy
 *    --beat-energy (0-1)  overall RMS energy
 *    --ambient-r   (0-255)  dominant album color R
 *    --ambient-g   (0-255)  dominant album color G
 *    --ambient-b   (0-255)  dominant album color B
 *    --ambient-r2  (0-255)  secondary album color R
 *    --ambient-g2  (0-255)  secondary album color G
 *    --ambient-b2  (0-255)  secondary album color B
 *    --ambient-r3  (0-255)  tertiary album color R
 *    --ambient-g3  (0-255)  tertiary album color G
 *    --ambient-b3  (0-255)  tertiary album color B
 * ═══════════════════════════════════════════════════════════════════ */

// Smoothed values (persisted across frames)
let _smoothBass   = 0;
let _smoothMids   = 0;
let _smoothHighs  = 0;
let _smoothEnergy = 0;

let _smoothBassL   = 0;
let _smoothMidsL   = 0;
let _smoothHighsL  = 0;
let _smoothEnergyL = 0;

let _smoothBassR   = 0;
let _smoothMidsR   = 0;
let _smoothHighsR  = 0;
let _smoothEnergyR = 0;

let _beatRaf      = null;
let _isPlaying    = false;
let _freqBuf      = new Uint8Array(256);
let _freqBufL     = new Uint8Array(256);
let _freqBufR     = new Uint8Array(256);
let _trackFade    = 1;
let _ambientSettings = { glow: 1.0, bass: 1.0, mids: 1.0, highs: 1.0 };

// Dynamic Song Envelope & AGC (Automatic Gain Control)
let _rollingPeakEnergy = 0.25;
let _rollingFloorEnergy = 0.02;

// Rolling baselines for adaptive visualizer response
let _baselineBass   = 0;
let _baselineMids   = 0;
let _baselineHighs  = 0;
let _baselineEnergy = 0;

// Current album colors (set from outside via setAmbientColors)
let _ambientColors = [
  [30, 40, 35],   // primary
  [20, 30, 40],   // secondary
  [25, 25, 45],   // tertiary
];

const BASE_RISE = 0.94;  // Fast explosive attack for punchy beats
const BASE_FALL = 0.38;  // Smooth decay for organic rhythmic release

function analyzeBuffer(buf, settings) {
  const len = buf.length;
  if (len === 0) {
    return { rawBassSum: 0, rawMidsSum: 0, rawHighsSum: 0, currentFrameEnergy: 0 };
  }

  // 1. Bass band (20Hz - 250Hz): weighted towards punchy kick/sub frequencies
  let bassSum = 0;
  let bassWeightSum = 0;
  const bassEnd = Math.max(3, Math.floor(len * 0.12));
  for (let i = 0; i < bassEnd; i++) {
    const weight = 1.0 + Math.sin((i / bassEnd) * Math.PI) * 0.8;
    bassSum += buf[i] * weight;
    bassWeightSum += weight;
  }
  const rawBassSum = (bassSum / Math.max(1, bassWeightSum)) / 255;

  // 2. Mid band (250Hz - 3.5kHz): snare, guitars, vocals
  let midsSum = 0;
  const midsEnd = Math.max(bassEnd + 4, Math.floor(len * 0.48));
  for (let i = bassEnd; i < midsEnd; i++) midsSum += buf[i];
  const rawMidsSum = (midsSum / Math.max(1, midsEnd - bassEnd)) / 255;

  // 3. High band (3.5kHz - 16kHz): cymbals, hi-hats, shimmer
  let highsSum = 0;
  const highsEnd = Math.max(midsEnd + 4, Math.floor(len * 0.88));
  for (let i = midsEnd; i < highsEnd; i++) highsSum += buf[i];
  const rawHighsSum = (highsSum / Math.max(1, highsEnd - midsEnd)) / 255;

  // Real weighted energy with punch enhancement
  const currentFrameEnergy = (rawBassSum * 0.52 + rawMidsSum * 0.33 + rawHighsSum * 0.15);

  return { rawBassSum, rawMidsSum, rawHighsSum, currentFrameEnergy };
}

function beatTick() {
  const root = document.documentElement.style;
  const analyser = _analyser;

  if (analyser && _isPlaying) {
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    if (_freqBuf.length !== analyser.frequencyBinCount)
      _freqBuf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(_freqBuf);

    if (_analyserL) {
      if (_freqBufL.length !== _analyserL.frequencyBinCount)
        _freqBufL = new Uint8Array(_analyserL.frequencyBinCount);
      _analyserL.getByteFrequencyData(_freqBufL);
    }
    if (_analyserR) {
      if (_freqBufR.length !== _analyserR.frequencyBinCount)
        _freqBufR = new Uint8Array(_analyserR.frequencyBinCount);
      _analyserR.getByteFrequencyData(_freqBufR);
    }

    // Step 1: Raw frequency analysis
    const monoRaw = analyzeBuffer(_freqBuf, _ambientSettings);
    const leftRaw = _analyserL ? analyzeBuffer(_freqBufL, _ambientSettings) : monoRaw;
    const rightRaw = _analyserR ? analyzeBuffer(_freqBufR, _ambientSettings) : monoRaw;

    // Organic rhythm pulse fallback for YouTube iframes or zero energy
    if (monoRaw.currentFrameEnergy < 0.02 && _isPlaying) {
      const t = performance.now() * 0.001;
      const bpm = 118;
      const beatLen = 60 / bpm;
      const beatProgress = (t % beatLen) / beatLen;
      const kickImpulse = Math.max(0, Math.exp(-beatProgress * 8) * 0.75);
      const isSnare = (Math.floor(t / beatLen) % 2) === 1;
      const snareImpulse = isSnare ? Math.max(0, Math.exp(-beatProgress * 9) * 0.6) : 0;
      const wave = (Math.sin(t * 3.5) * 0.5 + 0.5) * 0.35;
      
      monoRaw.rawBassSum = Math.max(monoRaw.rawBassSum, kickImpulse + 0.15);
      monoRaw.rawMidsSum = Math.max(monoRaw.rawMidsSum, snareImpulse + wave * 0.5 + 0.18);
      monoRaw.rawHighsSum = Math.max(monoRaw.rawHighsSum, wave * 0.4 + 0.12);
      monoRaw.currentFrameEnergy = (monoRaw.rawBassSum * 0.52 + monoRaw.rawMidsSum * 0.33 + monoRaw.rawHighsSum * 0.15);

      leftRaw.rawBassSum = monoRaw.rawBassSum;
      leftRaw.rawMidsSum = monoRaw.rawMidsSum;
      leftRaw.rawHighsSum = monoRaw.rawHighsSum;
      leftRaw.currentFrameEnergy = monoRaw.currentFrameEnergy;

      rightRaw.rawBassSum = monoRaw.rawBassSum;
      rightRaw.rawMidsSum = monoRaw.rawMidsSum;
      rightRaw.rawHighsSum = monoRaw.rawHighsSum;
      rightRaw.currentFrameEnergy = monoRaw.currentFrameEnergy;
    }

    // Step 2: Dynamic Auto-Gain Tracking (AGC)
    // Dynamic peak tracking: fast attack on loud sections, smooth decay; prevents loudness fatigue without ever fading out
    if (monoRaw.currentFrameEnergy > _rollingPeakEnergy) {
      _rollingPeakEnergy += (monoRaw.currentFrameEnergy - _rollingPeakEnergy) * 0.06;
    } else {
      _rollingPeakEnergy = Math.max(0.22, _rollingPeakEnergy * 0.9995);
    }
    _rollingPeakEnergy = Math.min(0.85, _rollingPeakEnergy);

    const dynamicRange = Math.max(0.20, _rollingPeakEnergy);
    const NOISE_FLOOR = 0.015;

    // Helper to normalize and apply dynamic curve with consistent noise floor
    const processChannel = (raw) => {
      const cleanBass   = Math.max(0, raw.rawBassSum   - NOISE_FLOOR) / dynamicRange;
      const cleanMids   = Math.max(0, raw.rawMidsSum   - NOISE_FLOOR) / dynamicRange;
      const cleanHighs  = Math.max(0, raw.rawHighsSum  - NOISE_FLOOR) / dynamicRange;
      const cleanEnergy = Math.max(0, raw.currentFrameEnergy - NOISE_FLOOR) / dynamicRange;

      const pBass   = Math.pow(Math.min(1.0, cleanBass), 1.25);
      const pMids   = Math.pow(Math.min(1.0, cleanMids), 1.18);
      const pHighs  = Math.pow(Math.min(1.0, cleanHighs), 1.18);
      const pEnergy = Math.pow(Math.min(1.0, cleanEnergy), 1.20);

      return { pBass, pMids, pHighs, pEnergy };
    };

    const mono = processChannel(monoRaw);
    const left = processChannel(leftRaw);
    const right = processChannel(rightRaw);

    // Update rolling baselines for transient detection
    _baselineBass   += (mono.pBass   - _baselineBass)   * 0.015;
    _baselineMids   += (mono.pMids   - _baselineMids)   * 0.015;
    _baselineHighs  += (mono.pHighs  - _baselineHighs)  * 0.015;
    _baselineEnergy += (mono.pEnergy - _baselineEnergy) * 0.015;

    // Transient onset detection: spike only on genuine beat attacks
    const bassTransient  = Math.max(0, mono.pBass  - _baselineBass  * 0.80) * 0.6;
    const midsTransient  = Math.max(0, mono.pMids  - _baselineMids  * 0.80) * 0.6;
    const highsTransient = Math.max(0, mono.pHighs - _baselineHighs * 0.80) * 0.6;

    // Target values combined with transient punch & user settings (sustains full music power)
    const targetBass   = Math.min(1.0, (mono.pBass   * 0.88 + bassTransient  * 0.35) * _ambientSettings.bass);
    const targetMids   = Math.min(1.0, (mono.pMids   * 0.88 + midsTransient  * 0.35) * _ambientSettings.mids);
    const targetHighs  = Math.min(1.0, (mono.pHighs  * 0.86 + highsTransient * 0.35) * _ambientSettings.highs);
    const targetEnergy = Math.min(1.0, (mono.pEnergy * 0.88 + Math.max(bassTransient, midsTransient) * 0.35) * _ambientSettings.glow);

    // Stereo channels with spatial fidelity
    const leftBassTransient  = Math.max(0, left.pBass  - _baselineBass  * 0.80) * 0.6;
    const leftMidsTransient  = Math.max(0, left.pMids  - _baselineMids  * 0.80) * 0.6;
    const leftHighsTransient = Math.max(0, left.pHighs - _baselineHighs * 0.80) * 0.6;

    const rightBassTransient  = Math.max(0, right.pBass  - _baselineBass  * 0.80) * 0.6;
    const rightMidsTransient  = Math.max(0, right.pMids  - _baselineMids  * 0.80) * 0.6;
    const rightHighsTransient = Math.max(0, right.pHighs - _baselineHighs * 0.80) * 0.6;

    const targetBassL   = Math.min(1.0, (left.pBass   * 0.88 + leftBassTransient  * 0.35) * _ambientSettings.bass);
    const targetMidsL   = Math.min(1.0, (left.pMids   * 0.88 + leftMidsTransient  * 0.35) * _ambientSettings.mids);
    const targetHighsL  = Math.min(1.0, (left.pHighs  * 0.86 + leftHighsTransient * 0.35) * _ambientSettings.highs);
    const targetEnergyL = Math.min(1.0, (left.pEnergy * 0.88 + Math.max(leftBassTransient, leftMidsTransient) * 0.35) * _ambientSettings.glow);
    const targetBassR   = Math.min(1.0, (right.pBass   * 0.88 + rightBassTransient  * 0.35) * _ambientSettings.bass);
    const targetMidsR   = Math.min(1.0, (right.pMids   * 0.88 + rightMidsTransient  * 0.35) * _ambientSettings.mids);
    const targetHighsR  = Math.min(1.0, (right.pHighs  * 0.86 + rightHighsTransient * 0.35) * _ambientSettings.highs);
    const targetEnergyR = Math.min(1.0, (right.pEnergy * 0.88 + Math.max(rightBassTransient, rightMidsTransient) * 0.35) * _ambientSettings.glow);

    // Per-band fluid dynamics (Option 1 & 2):
    // 1. Bass: punchy 40ms attack without 1-frame strobe flicker
    const BASS_RISE = 0.42, BASS_FALL = 0.16;
    // 2. Vocals/Mids: smooth breathing sustain so vocal glow stays stable & warm during rapid drum hits
    const VOCAL_RISE = 0.26, VOCAL_FALL = 0.08;
    // 3. Highs: responsive shimmer
    const HIGHS_RISE = 0.35, HIGHS_FALL = 0.14;
    // 4. Energy: gentle master envelope
    const ENERGY_RISE = 0.36, ENERGY_FALL = 0.12;

    // Smooth mono using dedicated per-band rates
    _smoothBass   += (targetBass   - _smoothBass)   * (targetBass   > _smoothBass   ? BASS_RISE   : BASS_FALL);
    _smoothMids   += (targetMids   - _smoothMids)   * (targetMids   > _smoothMids   ? VOCAL_RISE  : VOCAL_FALL);
    _smoothHighs  += (targetHighs  - _smoothHighs)  * (targetHighs  > _smoothHighs  ? HIGHS_RISE  : HIGHS_FALL);
    _smoothEnergy += (targetEnergy - _smoothEnergy)  * (targetEnergy > _smoothEnergy ? ENERGY_RISE : ENERGY_FALL);

    // Smooth left channel
    _smoothBassL   += (targetBassL   - _smoothBassL)   * (targetBassL   > _smoothBassL   ? BASS_RISE   : BASS_FALL);
    _smoothMidsL   += (targetMidsL   - _smoothMidsL)   * (targetMidsL   > _smoothMidsL   ? VOCAL_RISE  : VOCAL_FALL);
    _smoothHighsL  += (targetHighsL  - _smoothHighsL)  * (targetHighsL  > _smoothHighsL   ? HIGHS_RISE  : HIGHS_FALL);
    _smoothEnergyL += (targetEnergyL - _smoothEnergyL)  * (targetEnergyL > _smoothEnergyL ? ENERGY_RISE : ENERGY_FALL);

    // Smooth right channel
    _smoothBassR   += (targetBassR   - _smoothBassR)   * (targetBassR   > _smoothBassR   ? BASS_RISE   : BASS_FALL);
    _smoothMidsR   += (targetMidsR   - _smoothMidsR)   * (targetMidsR   > _smoothMidsR   ? VOCAL_RISE  : VOCAL_FALL);
    _smoothHighsR  += (targetHighsR  - _smoothHighsR)  * (targetHighsR  > _smoothHighsR  ? HIGHS_RISE  : HIGHS_FALL);
    _smoothEnergyR += (targetEnergyR - _smoothEnergyR)  * (targetEnergyR > _smoothEnergyR ? ENERGY_RISE : ENERGY_FALL);
  } else {
    // Decay to zero when paused
    _smoothBass   *= 0.88;
    _smoothMids   *= 0.88;
    _smoothHighs  *= 0.88;
    _smoothEnergy *= 0.88;
    _smoothBassL  *= 0.88;
    _smoothMidsL  *= 0.88;
    _smoothHighsL *= 0.88;
    _smoothEnergyL*= 0.88;
    _smoothBassR  *= 0.88;
    _smoothMidsR  *= 0.88;
    _smoothHighsR *= 0.88;
    _smoothEnergyR*= 0.88;

    // Decay rolling baselines
    _baselineBass   *= 0.88;
    _baselineMids   *= 0.88;
    _baselineHighs  *= 0.88;
    _baselineEnergy *= 0.88;
  }

  // Clamp
  const bass   = Math.min(1, Math.max(0, _smoothBass));
  const mids   = Math.min(1, Math.max(0, _smoothMids));
  const highs  = Math.min(1, Math.max(0, _smoothHighs));
  const energy = Math.min(1, Math.max(0, _smoothEnergy));

  const bassL   = Math.min(1, Math.max(0, _smoothBassL));
  const midsL   = Math.min(1, Math.max(0, _smoothMidsL));
  const highsL  = Math.min(1, Math.max(0, _smoothHighsL));
  const energyL = Math.min(1, Math.max(0, _smoothEnergyL));

  const bassR   = Math.min(1, Math.max(0, _smoothBassR));
  const midsR   = Math.min(1, Math.max(0, _smoothMidsR));
  const highsR  = Math.min(1, Math.max(0, _smoothHighsR));
  const energyR = Math.min(1, Math.max(0, _smoothEnergyR));

  // Calculate track fade (fade in first 1.5s, fade out last 3s)
  if (_connectedEl && _connectedEl.duration > 0 && !isNaN(_connectedEl.duration)) {
    const dur = _connectedEl.duration;
    const ct = _connectedEl.currentTime;
    if (ct < 1.5) {
      _trackFade = ct / 1.5;
    } else if (dur - ct < 3) {
      _trackFade = Math.max(0, (dur - ct) / 3);
    } else {
      _trackFade = 1;
    }
  } else {
    _trackFade = 1;
  }

  // Write variables back to CSS
  root.setProperty('--beat-bass',   bass.toFixed(3));
  root.setProperty('--beat-mids',   mids.toFixed(3));
  root.setProperty('--beat-highs',  highs.toFixed(3));
  root.setProperty('--beat-energy', energy.toFixed(3));

  root.setProperty('--beat-bass-left',   bassL.toFixed(3));
  root.setProperty('--beat-mids-left',   midsL.toFixed(3));
  root.setProperty('--beat-highs-left',  highsL.toFixed(3));
  root.setProperty('--beat-energy-left', energyL.toFixed(3));

  root.setProperty('--beat-bass-right',   bassR.toFixed(3));
  root.setProperty('--beat-mids-right',   midsR.toFixed(3));
  root.setProperty('--beat-highs-right',  highsR.toFixed(3));
  root.setProperty('--beat-energy-right', energyR.toFixed(3));

  _beatRaf = requestAnimationFrame(beatTick);
}

/** Start the global beat engine (idempotent — safe to call many times) */
export function startBeatEngine() {
  if (_beatRaf) return;
  _beatRaf = requestAnimationFrame(beatTick);
}

/** Tell the beat engine whether audio is playing */
export function setBeatPlaying(playing) {
  _isPlaying = playing;
}

/** Update ambient settings from the user controls */
export function updateAmbientSettings(settings) {
  if (!settings) return;
  _ambientSettings = { ..._ambientSettings, ...settings };
}

/**
 * Fully reset beat engine baselines, rolling peak AGC, and smooth envelopes
 * on track transitions to ensure 100% maximum fresh reactivity without site refresh.
 */
export function resetBeatEngine(newAudioEl = null) {
  _rollingPeakEnergy = 0.25;
  _rollingFloorEnergy = 0.02;
  
  _baselineBass = 0;
  _baselineMids = 0;
  _baselineHighs = 0;
  _baselineEnergy = 0;

  _smoothBass = 0.15;
  _smoothMids = 0.15;
  _smoothHighs = 0.15;
  _smoothEnergy = 0.15;

  _smoothBassL = 0.15;
  _smoothMidsL = 0.15;
  _smoothHighsL = 0.15;
  _smoothEnergyL = 0.15;

  _smoothBassR = 0.15;
  _smoothMidsR = 0.15;
  _smoothHighsR = 0.15;
  _smoothEnergyR = 0.15;

  _trackFade = 1.0;

  if (newAudioEl) {
    _connectedEl = newAudioEl;
    ensureAnalyser(newAudioEl);
  }
}

/** Expose direct access to the beat state so other components can read it without getComputedStyle */
export function getBeatState() {
  const stereoEnabled = localStorage.getItem('aura_stereo_separation_enabled') !== 'false';
  
  const mono = {
    bass: Math.min(1, Math.max(0, _smoothBass)),
    mids: Math.min(1, Math.max(0, _smoothMids)),
    highs: Math.min(1, Math.max(0, _smoothHighs)),
    energy: Math.min(1, Math.max(0, _smoothEnergy)),
    trackFade: _trackFade
  };

  return {
    ...mono,
    isPlaying: _isPlaying,
    left: stereoEnabled ? {
      bass: Math.min(1, Math.max(0, _smoothBassL)),
      mids: Math.min(1, Math.max(0, _smoothMidsL)),
      highs: Math.min(1, Math.max(0, _smoothHighsL)),
      energy: Math.min(1, Math.max(0, _smoothEnergyL)),
    } : mono,
    right: stereoEnabled ? {
      bass: Math.min(1, Math.max(0, _smoothBassR)),
      mids: Math.min(1, Math.max(0, _smoothMidsR)),
      highs: Math.min(1, Math.max(0, _smoothHighsR)),
      energy: Math.min(1, Math.max(0, _smoothEnergyR)),
    } : mono,
    colors: _ambientColors
  };
}

/** Set ambient colors extracted from album art. Expects [[r,g,b], [r,g,b], [r,g,b]] */
export function setAmbientColors(colors) {
  if (!colors || colors.length < 3) return;
  _ambientColors = colors;
  const root = document.documentElement.style;
  root.setProperty('--ambient-r',  colors[0][0]);
  root.setProperty('--ambient-g',  colors[0][1]);
  root.setProperty('--ambient-b',  colors[0][2]);
  root.setProperty('--ambient-r2', colors[1][0]);
  root.setProperty('--ambient-g2', colors[1][1]);
  root.setProperty('--ambient-b2', colors[1][2]);
  root.setProperty('--ambient-r3', colors[2][0]);
  root.setProperty('--ambient-g3', colors[2][1]);
  root.setProperty('--ambient-b3', colors[2][2]);
}

// ─────────────────────────────────────────────────────────────────────────────
// MMCQ — Modified Median Cut Quantization (color-thief style dominant colours)
// ─────────────────────────────────────────────────────────────────────────────
const _SIG = 5;            // bits per channel (32 levels)
const _SHIFT = 8 - _SIG;   // = 3
const _MULT = 1 << _SHIFT; // = 8
const _idx = (r, g, b) => (r << (_SIG * 2)) | (g << _SIG) | b;

function _buildHisto(data) {
  const h = {};
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = _idx(data[i] >> _SHIFT, data[i + 1] >> _SHIFT, data[i + 2] >> _SHIFT);
    h[key] = (h[key] || 0) + 1;
  }
  return h;
}

function _makeVBox(r1, r2, g1, g2, b1, b2, histo) {
  let _cnt = -1, _avg = null;
  const count = () => {
    if (_cnt >= 0) return _cnt;
    _cnt = 0;
    for (let r = r1; r <= r2; r++)
      for (let g = g1; g <= g2; g++)
        for (let b = b1; b <= b2; b++) _cnt += histo[_idx(r, g, b)] || 0;
    return _cnt;
  };
  const avg = () => {
    if (_avg) return _avg;
    let rs = 0, gs = 0, bs = 0, tot = 0;
    for (let r = r1; r <= r2; r++)
      for (let g = g1; g <= g2; g++)
        for (let b = b1; b <= b2; b++) {
          const n = histo[_idx(r, g, b)] || 0;
          tot += n;
          rs += n * (r + 0.5) * _MULT;
          gs += n * (g + 0.5) * _MULT;
          bs += n * (b + 0.5) * _MULT;
        }
    _avg = tot > 0
      ? [Math.round(rs / tot), Math.round(gs / tot), Math.round(bs / tot)]
      : [Math.round((r1 + r2 + 1) * _MULT / 2), Math.round((g1 + g2 + 1) * _MULT / 2), Math.round((b1 + b2 + 1) * _MULT / 2)];
    return _avg;
  };
  return { r1, r2, g1, g2, b1, b2, histo, count, avg };
}

function _cut(vb) {
  const { r1, r2, g1, g2, b1, b2, histo } = vb;
  const rw = r2 - r1 + 1, gw = g2 - g1 + 1, bw = b2 - b1 + 1;
  const maxw = Math.max(rw, gw, bw);
  const ax = maxw === rw ? 'r' : maxw === gw ? 'g' : 'b';
  const [lo, hi] = ax === 'r' ? [r1, r2] : ax === 'g' ? [g1, g2] : [b1, b2];
  const cum = [];
  let sum = 0;
  for (let i = lo; i <= hi; i++) {
    let s = 0;
    if (ax === 'r') { for (let g = g1; g <= g2; g++) for (let b = b1; b <= b2; b++) s += histo[_idx(i, g, b)] || 0; }
    else if (ax === 'g') { for (let r = r1; r <= r2; r++) for (let b = b1; b <= b2; b++) s += histo[_idx(r, i, b)] || 0; }
    else { for (let r = r1; r <= r2; r++) for (let g = g1; g <= g2; g++) s += histo[_idx(r, g, i)] || 0; }
    sum += s;
    cum[i - lo] = sum;
  }
  const total = sum;
  for (let i = 0; i < cum.length; i++) {
    if (cum[i] > total / 2) {
      const cut = lo + i;
      const b1v = _makeVBox(r1, r2, g1, g2, b1, b2, histo);
      const b2v = _makeVBox(r1, r2, g1, g2, b1, b2, histo);
      if (ax === 'r') { b1v.r2 = cut; b2v.r1 = cut + 1; }
      else if (ax === 'g') { b1v.g2 = cut; b2v.g1 = cut + 1; }
      else { b1v.b2 = cut; b2v.b1 = cut + 1; }
      if (b1v.count() === 0 || b2v.count() === 0) return null;
      return [b1v, b2v];
    }
  }
  return null;
}

/** Run MMCQ; returns up to maxN dominant colours, most dominant first */
function _mmcq(data, maxN) {
  const histo = _buildHisto(data);
  let rMin = 31, rMax = 0, gMin = 31, gMax = 0, bMin = 31, bMax = 0;
  for (const key of Object.keys(histo)) {
    const k = Number(key);
    const r = (k >> (_SIG * 2)) & 31, g = (k >> _SIG) & 31, b = k & 31;
    if (r < rMin) rMin = r; if (r > rMax) rMax = r;
    if (g < gMin) gMin = g; if (g > gMax) gMax = g;
    if (b < bMin) bMin = b; if (b > bMax) bMax = b;
  }
  const queue = [_makeVBox(rMin, rMax, gMin, gMax, bMin, bMax, histo)];
  let iters = 0;
  while (queue.length < maxN && iters++ < 500) {
    queue.sort((a, b) => b.count() - a.count());
    const vb = queue.shift();
    if (!vb || !vb.count()) break;
    const cut = _cut(vb);
    if (!cut) { if (vb) queue.push(vb); break; }
    queue.push(cut[0], cut[1]);
  }
  queue.sort((a, b) => b.count() - a.count());
  return queue.slice(0, maxN).map(vb => vb.avg());
}

/** 
 * Balances saturation and perceived luminance (ITU-R BT.709) of an extracted colour.
 * Prevents pastel/white artwork from blinding the screen, and boosts dark artwork so it remains vivid.
 */
function _amplifyForGlow(rgb, K = 1.85) {
  let [r, g, b] = rgb;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  
  // 1. Boost saturation if chromatic
  if (mx - mn >= 6) {
    const avg = (r + g + b) / 3;
    r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * K)));
    g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * K)));
    b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * K)));
  }

  // 2. Perceived luminance: Y = 0.2126R + 0.7152G + 0.0722B
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Target luminance sweet spot: [80, 160] (approx 32% to 62% brightness)
  let scale = 1.0;
  if (luma > 165) {
    // Too bright / pastel white: scale down smoothly to preserve depth & dark UI contrast
    scale = 145 / luma;
  } else if (luma < 50) {
    // Too dark: lift upward so the ambient orbs are clearly visible
    scale = 75 / Math.max(20, luma);
  }

  return [
    Math.min(255, Math.max(0, Math.round(r * scale))),
    Math.min(255, Math.max(0, Math.round(g * scale))),
    Math.min(255, Math.max(0, Math.round(b * scale))),
  ];
}

/** Extract dominant colors directly from cover art without artificial hue alterations. */
export function extractAndSetColors(coverUrl, onColors) {
  const fallback = [[80, 40, 100], [40, 80, 150], [60, 140, 90]];

  if (!coverUrl || coverUrl.startsWith('linear')) {
    setAmbientColors(fallback);
    onColors?.(fallback);
    return;
  }

  const tryLoad = (withCORS) => {
    const img = new Image();
    if (withCORS) img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const SIZE = 64;
        const c = document.createElement('canvas');
        c.width = SIZE; c.height = SIZE;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        // MMCQ → Extract dominant color clusters directly from the actual cover art
        const palette = _mmcq(data, 8);
        if (!palette.length) { setAmbientColors(fallback); onColors?.(fallback); return; }

        // Pick top 3 dominant colors that exist in the artwork
        const chosen = [];
        const dist = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);

        for (let i = 0; i < palette.length && chosen.length < 3; i++) {
          // Avoid picking nearly identical duplicate clusters
          if (chosen.length === 0 || chosen.every(c => dist(palette[i], c) > 30)) {
            chosen.push(palette[i]);
          }
        }

        // If the artwork is monochromatic, create natural tonal shades of the artwork's REAL color
        while (chosen.length < 3) {
          const base = chosen[0] || fallback[0];
          if (chosen.length === 1) {
            chosen.push([Math.round(base[0] * 0.75), Math.round(base[1] * 0.75), Math.round(base[2] * 0.75)]);
          } else {
            chosen.push([Math.round(base[0] * 0.50), Math.round(base[1] * 0.50), Math.round(base[2] * 0.50)]);
          }
        }

        // Apply balanced glow to the authentic artwork colors (NO fake hue rotations)
        const colors = chosen.map(cc => _amplifyForGlow(cc, 1.5));
        setAmbientColors(colors);
        onColors?.(colors);
      } catch (_e) {
        if (withCORS) tryLoad(false);
        else { setAmbientColors(fallback); onColors?.(fallback); }
      }
    };

    img.onerror = () => {
      if (withCORS) tryLoad(false);
      else { setAmbientColors(fallback); onColors?.(fallback); }
    };

    img.src = coverUrl;
  };

  tryLoad(true);
}



export function AudioVisualizer({ audioRef, isPlaying, compact = false }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const freqData  = useRef(new Uint8Array(128));
  // Track isPlaying via ref to avoid recreating drawFrame on every pause/play
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  /* ── Connect audio element once on mount ─────────────────────────── */
  useEffect(() => {
    const connected = ensureAnalyser(audioRef?.current);
    if (_analyser) {
      freqData.current = new Uint8Array(_analyser.frequencyBinCount);
    }
    // Resume context on mobile after user gesture
    if (isPlayingRef.current && _audioCtx?.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    // Start the global beat engine
    startBeatEngine();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Draw one frame ─────────────────────────────────────────────── */
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(drawFrame); return; }

    const ctx = canvas.getContext('2d');
    const W   = canvas.width;
    const H   = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const playing = isPlayingRef.current;
    if (_analyser && playing) {
      _analyser.getByteFrequencyData(freqData.current);
    }

    const N      = compact ? 28 : 54;
    const maxOp  = compact ? 0.55 : 0.72;
    const barW   = Math.max(1.5, W / (N * (compact ? 2.2 : 2.6)));
    const totalBW = N * barW;
    const gap     = (W - totalBW) / (N - 1);

    for (let i = 0; i < N; i++) {
      const bin = Math.floor((i / N) * freqData.current.length * 0.60);
      const raw = playing ? (freqData.current[bin] ?? 0) / 255 : 0;
      const v   = Math.pow(raw, 0.72);
      const bH  = Math.max(compact ? 1 : 2, v * H * 0.88);
      const x   = i * (barW + gap);
      const y   = (H - bH) / 2;
      const alpha = playing ? Math.min(maxOp, 0.09 + v * 0.63) : 0.055;

      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      if (ctx.roundRect) {
        const r = Math.min(barW / 2, 2);
        ctx.roundRect(Math.round(x), Math.round(y), Math.max(1, barW), Math.round(bH), r);
      } else {
        ctx.rect(Math.round(x), Math.round(y), Math.max(1, barW), Math.round(bH));
      }
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(drawFrame);
  }, [compact]); // removed isPlaying dep — reads via ref now

  /* ── Animation loop ──────────────────────────────────────────────── */
  useEffect(() => {
    const cancel = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    cancel();
    rafRef.current = requestAnimationFrame(drawFrame);
    return cancel;
  }, [drawFrame]);

  /* ── Resize canvas to match CSS layout width (hi-DPI aware) ──────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isMobile = window.innerWidth < 1024;
    const dpr = Math.min(isMobile ? 1.5 : 2.0, window.devicePixelRatio || 1);

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: compact ? '18px' : '44px',
        opacity: compact ? 0.75 : 0.9,
      }}
      aria-hidden="true"
    />
  );
}

// Automatically resume the AudioContext on the first interaction after page load
if (typeof window !== 'undefined') {
  const resumeOnInteraction = () => {
    resumeAudioContext();
    if (_audioCtx && _audioCtx.state === 'running') {
      window.removeEventListener('click', resumeOnInteraction, { capture: true });
      window.removeEventListener('keydown', resumeOnInteraction, { capture: true });
      window.removeEventListener('touchstart', resumeOnInteraction, { capture: true });
    }
  };
  window.addEventListener('click', resumeOnInteraction, { capture: true });
  window.addEventListener('keydown', resumeOnInteraction, { capture: true });
  window.addEventListener('touchstart', resumeOnInteraction, { capture: true });
}
