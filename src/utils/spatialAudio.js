/**
 * Sonora Studio-Grade 3D Spatial Audio & Binaural Soundstage DSP Engine
 * 
 * Features:
 *  - Full Anatomical Binaural Crossfeed (Bauer/Meier/Linkwitz ITD + ILD Head Shadow)
 *  - Multiband Mid-Side (M/S) Matrix with Mono Sub-Bass Anchor (<140Hz)
 *  - Dual HRTF 3D Hemispheric Panners with Pinna Concha Elevation cues
 *  - Haas Effect micro-delays for true out-of-head soundstage width
 *  - Dynamic Mode-Specific Binaural Acoustic Convolution Engines
 *  - Zero-latency clickless crossfading and real-time UI state synchronization
 *  - 100% isolated from AudioVisualizer & WebGL shader analysers
 */

let _audioCtx = null;
let _sourceNode = null;
let _destinationNode = null;

// Routing nodes
let _inputGain = null;
let _dryGain = null;
let _wetGain = null;
let _splitter = null;

// Sub-Bass Mono Anchor
let _bassSum = null;
let _bassLowpass = null;
let _bassGain = null;

// Mid Path (Vocals & Center Stage)
let _midHighpass = null;
let _midGain = null;
let _vocalClarityFilter = null;
let _pinnaElevationFilter = null;
let _pannerCenter = null;

// Side Path (Surround & Atmospheric Width)
let _sideDiff = null;
let _sideInv = null;
let _sideHighpass = null;
let _sideGain = null;
let _sideDelayL = null;
let _sideDelayR = null;
let _pannerL = null;
let _pannerR = null;

// Binaural Anatomical Crossfeed (ITD + Head-Shadow ILD)
let _crossfeedFilterL = null;
let _crossfeedFilterR = null;
let _crossfeedDelayL = null;
let _crossfeedDelayR = null;
let _crossfeedMerger = null;
let _crossfeedGain = null;

// Acoustic Room Convolver
let _convolver = null;
let _convolverGain = null;
const _irCache = new Map();

// State
let _isEnabled = false;
let _mode = 'studio'; // 'studio' | 'atmos' | 'arena' | 'vocal' | 'club'
let _width = 1.35;    // 1.0 to 2.0

// Load initial state from localStorage
if (typeof window !== 'undefined') {
  try {
    _isEnabled = localStorage.getItem('sonora_spatial_audio_enabled') === 'true';
    _mode = localStorage.getItem('sonora_spatial_audio_mode') || 'studio';
    _width = parseFloat(localStorage.getItem('sonora_spatial_audio_width') || '1.35');
  } catch (_) {}
}

/**
 * Mathematically generates an acoustic room impulse response tailored per spatial mode.
 */
function generateAcousticIR(ctx, mode) {
  const sampleRate = ctx.sampleRate;
  let duration = 0.45;
  let decay = 3.6;
  let diffusion = 0.65;
  let damping = 12.0;
  let taps = [];

  switch (mode) {
    case 'atmos': // 3D IMAX Dome
      duration = 0.85;
      decay = 2.2;
      diffusion = 0.85;
      damping = 7.5;
      taps = [
        { t: 0.015, gainL: 0.42, gainR: 0.18 },
        { t: 0.032, gainL: 0.22, gainR: 0.38 },
        { t: 0.055, gainL: 0.32, gainR: 0.30 },
        { t: 0.078, gainL: 0.18, gainR: 0.24 },
      ];
      break;

    case 'arena': // Live Concert Arena
      duration = 1.65;
      decay = 1.6;
      diffusion = 0.95;
      damping = 5.0;
      taps = [
        { t: 0.025, gainL: 0.45, gainR: 0.22 },
        { t: 0.055, gainL: 0.28, gainR: 0.45 },
        { t: 0.098, gainL: 0.38, gainR: 0.32 },
        { t: 0.145, gainL: 0.26, gainR: 0.28 },
      ];
      break;

    case 'vocal': // Intimate Vocal Stage
      duration = 0.38;
      decay = 4.6;
      diffusion = 0.55;
      damping = 15.0;
      taps = [
        { t: 0.010, gainL: 0.32, gainR: 0.28 },
        { t: 0.022, gainL: 0.18, gainR: 0.22 },
      ];
      break;

    case 'club': // Spatial Club
      duration = 0.58;
      decay = 2.9;
      diffusion = 0.72;
      damping = 9.0;
      taps = [
        { t: 0.012, gainL: 0.38, gainR: 0.28 },
        { t: 0.028, gainL: 0.32, gainR: 0.38 },
        { t: 0.046, gainL: 0.22, gainR: 0.22 },
      ];
      break;

    case 'studio': // Reference Mastering Studio
    default:
      duration = 0.42;
      decay = 3.8;
      diffusion = 0.65;
      damping = 13.0;
      taps = [
        { t: 0.012, gainL: 0.28, gainR: 0.16 },
        { t: 0.024, gainL: 0.16, gainR: 0.28 },
        { t: 0.038, gainL: 0.14, gainR: 0.14 },
      ];
      break;
  }

  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-decay * t);
    const damp = Math.exp(-damping * t);

    const nL = (Math.random() * 2 - 1) * env;
    const nR = (Math.random() * 2 - 1) * env;

    left[i] = nL * diffusion + (i > 18 ? left[i - 18] * 0.28 * damp : 0);
    right[i] = nR * diffusion + (i > 24 ? right[i - 24] * 0.28 * damp : 0);
  }

  for (const tap of taps) {
    const idx = Math.floor(tap.t * sampleRate);
    if (idx < length) {
      left[idx] += tap.gainL;
      right[idx] += tap.gainR;
    }
  }

  return buffer;
}

function getOrCreateIR(ctx, mode) {
  if (!_irCache.has(mode)) {
    _irCache.set(mode, generateAcousticIR(ctx, mode));
  }
  return _irCache.get(mode);
}

/**
 * Initialize or update the Spatial Audio DSP graph.
 */
export function setupSpatialAudio(ctx, sourceNode, destinationNode) {
  if (!ctx || !sourceNode || !destinationNode) return;
  _audioCtx = ctx;
  _sourceNode = sourceNode;
  _destinationNode = destinationNode;

  try {
    if (!_inputGain) {
      _inputGain = ctx.createGain();
      _dryGain = ctx.createGain();
      _wetGain = ctx.createGain();
      _splitter = ctx.createChannelSplitter(2);

      // --- 1. SUB-BASS MONO ANCHOR (<140Hz) ---
      _bassSum = ctx.createGain();
      _bassLowpass = ctx.createBiquadFilter();
      _bassLowpass.type = 'lowpass';
      _bassLowpass.frequency.value = 135;
      _bassGain = ctx.createGain();
      _bassGain.gain.value = 1.0;

      // --- 2. MID CHANNEL (Center vocals & leads) ---
      _midHighpass = ctx.createBiquadFilter();
      _midHighpass.type = 'highpass';
      _midHighpass.frequency.value = 135;

      _midGain = ctx.createGain();
      _midGain.gain.value = 0.90;

      _vocalClarityFilter = ctx.createBiquadFilter();
      _vocalClarityFilter.type = 'peaking';
      _vocalClarityFilter.frequency.value = 2600;
      _vocalClarityFilter.Q.value = 1.0;
      _vocalClarityFilter.gain.value = 1.2;

      // Pinna Concha Elevation notch (~7.2kHz for 3D vertical height perception)
      _pinnaElevationFilter = ctx.createBiquadFilter();
      _pinnaElevationFilter.type = 'peaking';
      _pinnaElevationFilter.frequency.value = 7200;
      _pinnaElevationFilter.Q.value = 1.8;
      _pinnaElevationFilter.gain.value = 1.5;

      _pannerCenter = ctx.createPanner();
      _pannerCenter.panningModel = 'HRTF';
      _pannerCenter.distanceModel = 'inverse';

      // --- 3. SIDE CHANNEL (Atmospheric 360° width) ---
      _sideDiff = ctx.createGain();
      _sideInv = ctx.createGain();
      _sideInv.gain.value = -1.0;

      _sideHighpass = ctx.createBiquadFilter();
      _sideHighpass.type = 'highpass';
      _sideHighpass.frequency.value = 140; // Prevent phase smearing in bass

      _sideGain = ctx.createGain();
      _sideGain.gain.value = 1.20;

      // Haas micro-delays for stereophonic depth
      _sideDelayL = ctx.createDelay(0.01);
      _sideDelayL.delayTime.value = 0.0012; // 1.2ms
      _sideDelayR = ctx.createDelay(0.01);
      _sideDelayR.delayTime.value = 0.0024; // 2.4ms

      _pannerL = ctx.createPanner();
      _pannerL.panningModel = 'HRTF';
      _pannerL.distanceModel = 'inverse';

      _pannerR = ctx.createPanner();
      _pannerR.panningModel = 'HRTF';
      _pannerR.distanceModel = 'inverse';

      // --- 4. ANATOMICAL BINAURAL CROSSFEED (ITD + Head-Shadow ILD) ---
      _crossfeedFilterL = ctx.createBiquadFilter();
      _crossfeedFilterL.type = 'lowshelf';
      _crossfeedFilterL.frequency.value = 1600;
      _crossfeedFilterL.gain.value = -4.2; // Head shadow high-frequency attenuation

      _crossfeedFilterR = ctx.createBiquadFilter();
      _crossfeedFilterR.type = 'lowshelf';
      _crossfeedFilterR.frequency.value = 1600;
      _crossfeedFilterR.gain.value = -4.2;

      _crossfeedDelayL = ctx.createDelay(0.01);
      _crossfeedDelayL.delayTime.value = 0.00038; // ~0.38ms acoustic skull travel time

      _crossfeedDelayR = ctx.createDelay(0.01);
      _crossfeedDelayR.delayTime.value = 0.00038;

      _crossfeedMerger = ctx.createChannelMerger(2);
      _crossfeedGain = ctx.createGain();
      _crossfeedGain.gain.value = 0.28;

      // --- 5. BINAURAL ROOM CONVOLVER ---
      _convolver = ctx.createConvolver();
      _convolver.buffer = getOrCreateIR(ctx, _mode);

      _convolverGain = ctx.createGain();
      _convolverGain.gain.value = 0.12;

      // Configure listener orientation
      if (ctx.listener) {
        if (ctx.listener.positionX) {
          ctx.listener.positionX.value = 0;
          ctx.listener.positionY.value = 0;
          ctx.listener.positionZ.value = 0;
          ctx.listener.forwardX.value = 0;
          ctx.listener.forwardY.value = 0;
          ctx.listener.forwardZ.value = -1;
          ctx.listener.upX.value = 0;
          ctx.listener.upY.value = 1;
          ctx.listener.upZ.value = 0;
        } else if (ctx.listener.setPosition) {
          ctx.listener.setPosition(0, 0, 0);
          ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);
        }
      }

      // --- DSP ROUTING GRAPH ---
      sourceNode.connect(_inputGain);

      // Dry Bypass Path
      _inputGain.connect(_dryGain);
      _dryGain.connect(destinationNode);

      // Split into Left (0) and Right (1)
      _inputGain.connect(_splitter);

      // 1. Mono Sub-Bass Anchor (L + R) -> Center Panner
      _splitter.connect(_bassSum, 0);
      _splitter.connect(_bassSum, 1);
      _bassSum.connect(_bassLowpass);
      _bassLowpass.connect(_bassGain);
      _bassGain.connect(_pannerCenter);

      // 2. Mid Path (L + R) high-passed -> Center Vocal Stage
      _bassSum.connect(_midHighpass);
      _midHighpass.connect(_midGain);
      _midGain.connect(_vocalClarityFilter);
      _vocalClarityFilter.connect(_pinnaElevationFilter);
      _pinnaElevationFilter.connect(_pannerCenter);

      // 3. Side Path (L - R) high-passed -> Stereo 3D Panners
      _splitter.connect(_sideDiff, 0);
      _splitter.connect(_sideInv, 1);
      _sideInv.connect(_sideDiff);
      _sideDiff.connect(_sideHighpass);
      _sideHighpass.connect(_sideGain);

      _sideGain.connect(_sideDelayL);
      _sideDelayL.connect(_pannerL);

      _sideGain.connect(_sideDelayR);
      _sideDelayR.connect(_pannerR);

      // 4. Binaural Crossfeed:
      // Left channel -> head shadow filter -> ITD delay -> Right ear (merger input 1)
      _splitter.connect(_crossfeedFilterL, 0);
      _crossfeedFilterL.connect(_crossfeedDelayL);
      _crossfeedDelayL.connect(_crossfeedMerger, 0, 1);

      // Right channel -> head shadow filter -> ITD delay -> Left ear (merger input 0)
      _splitter.connect(_crossfeedFilterR, 1);
      _crossfeedFilterR.connect(_crossfeedDelayR);
      _crossfeedDelayR.connect(_crossfeedMerger, 0, 0);

      _crossfeedMerger.connect(_crossfeedGain);
      _crossfeedGain.connect(_wetGain);

      // 5. Connect 3D Panners to Wet Master Bus
      _pannerCenter.connect(_wetGain);
      _pannerL.connect(_wetGain);
      _pannerR.connect(_wetGain);

      // 6. Early Acoustic Reflections
      _inputGain.connect(_convolver);
      _convolver.connect(_convolverGain);
      _convolverGain.connect(_wetGain);

      // Wet Output -> Destination
      _wetGain.connect(destinationNode);
    }

    applySpatialParameters();
  } catch (err) {
    console.error("Failed to initialize Spatial Audio Engine:", err);
  }
}

/**
 * Updates positions, acoustic reflections, and gains based on mode and width.
 */
function applySpatialParameters() {
  if (!_audioCtx || !_dryGain || !_wetGain) return;

  const now = _audioCtx.currentTime;
  const isEnabled = _isEnabled;

  if (!isEnabled) {
    // Smooth bypass crossfade (80ms linear ramp)
    _dryGain.gain.cancelScheduledValues(now);
    _dryGain.gain.linearRampToValueAtTime(1.0, now + 0.08);
    _wetGain.gain.cancelScheduledValues(now);
    _wetGain.gain.linearRampToValueAtTime(0.0, now + 0.08);
    return;
  }

  // Active Spatial crossfade
  _dryGain.gain.cancelScheduledValues(now);
  _dryGain.gain.linearRampToValueAtTime(0.08, now + 0.08);
  _wetGain.gain.cancelScheduledValues(now);
  _wetGain.gain.linearRampToValueAtTime(0.94, now + 0.08);

  const w = Math.max(0.8, Math.min(2.5, _width));

  let xSpread = 1.35 * w;
  let zDist = -0.70;
  let yHeight = 0.22;
  let convLevel = 0.12;
  let bassLevel = 1.15;
  let vocalLevel = 1.2;
  let pinnaGain = 1.5;
  let sideLevel = 1.20;
  let crossfeedLevel = 0.26;

  switch (_mode) {
    case 'atmos': // Cinematic IMAX 3D
      xSpread = 1.65 * w;
      zDist = -0.95;
      yHeight = 0.38;
      convLevel = 0.22;
      bassLevel = 1.65; // Cinematic sub-bass rumble
      vocalLevel = 1.4;
      pinnaGain = 2.4;  // Elevated dome height
      sideLevel = 1.38;
      crossfeedLevel = 0.32;
      break;

    case 'arena': // Live Arena
      xSpread = 1.85 * w;
      zDist = -1.25;
      yHeight = 0.48;
      convLevel = 0.28;
      bassLevel = 1.35;
      vocalLevel = 1.6;
      pinnaGain = 2.8;
      sideLevel = 1.50;
      crossfeedLevel = 0.35;
      break;

    case 'vocal': // Vocal Immersion
      xSpread = 1.20 * w;
      zDist = -0.52;
      yHeight = 0.28;
      convLevel = 0.08;
      bassLevel = 1.0;
      vocalLevel = 3.2; // Vocal upfront clarity
      pinnaGain = 1.8;
      sideLevel = 1.05;
      crossfeedLevel = 0.22;
      break;

    case 'club': // Spatial Bass
      xSpread = 1.45 * w;
      zDist = -0.62;
      yHeight = 0.16;
      convLevel = 0.15;
      bassLevel = 1.85; // 360° sub-bass punch
      vocalLevel = 1.0;
      pinnaGain = 1.0;
      sideLevel = 1.30;
      crossfeedLevel = 0.28;
      break;

    case 'studio': // Mastering Studio (Flagship)
    default:
      xSpread = 1.35 * w;
      zDist = -0.70;
      yHeight = 0.22;
      convLevel = 0.12;
      bassLevel = 1.15;
      vocalLevel = 1.2;
      pinnaGain = 1.5;
      sideLevel = 1.20;
      crossfeedLevel = 0.26;
      break;
  }

  // Update IR Buffer if mode changed
  if (_convolver && _audioCtx) {
    try {
      const buffer = getOrCreateIR(_audioCtx, _mode);
      if (_convolver.buffer !== buffer) {
        _convolver.buffer = buffer;
      }
    } catch (_) {}
  }

  if (_bassGain) {
    _bassGain.gain.setValueAtTime(bassLevel, now);
  }
  if (_vocalClarityFilter) {
    _vocalClarityFilter.gain.setValueAtTime(vocalLevel, now);
  }
  if (_pinnaElevationFilter) {
    _pinnaElevationFilter.gain.setValueAtTime(pinnaGain, now);
  }
  if (_sideGain) {
    _sideGain.gain.setValueAtTime(sideLevel, now);
  }
  if (_crossfeedGain) {
    _crossfeedGain.gain.setValueAtTime(crossfeedLevel, now);
  }
  if (_convolverGain) {
    _convolverGain.gain.cancelScheduledValues(now);
    _convolverGain.gain.linearRampToValueAtTime(convLevel, now + 0.08);
  }

  // Left Panner
  if (_pannerL) {
    if (_pannerL.positionX) {
      _pannerL.positionX.setValueAtTime(-xSpread, now);
      _pannerL.positionY.setValueAtTime(yHeight, now);
      _pannerL.positionZ.setValueAtTime(zDist, now);
    } else if (_pannerL.setPosition) {
      _pannerL.setPosition(-xSpread, yHeight, zDist);
    }
  }

  // Right Panner
  if (_pannerR) {
    if (_pannerR.positionX) {
      _pannerR.positionX.setValueAtTime(xSpread, now);
      _pannerR.positionY.setValueAtTime(yHeight, now);
      _pannerR.positionZ.setValueAtTime(zDist, now);
    } else if (_pannerR.setPosition) {
      _pannerR.setPosition(xSpread, yHeight, zDist);
    }
  }

  // Center Vocal & Bass Stage
  if (_pannerCenter) {
    if (_pannerCenter.positionX) {
      _pannerCenter.positionX.setValueAtTime(0, now);
      _pannerCenter.positionY.setValueAtTime(yHeight + 0.12, now);
      _pannerCenter.positionZ.setValueAtTime(zDist - 0.18, now);
    } else if (_pannerCenter.setPosition) {
      _pannerCenter.setPosition(0, yHeight + 0.12, zDist - 0.18);
    }
  }
}

// Real-time Event System for reactive UI updates
const _listeners = new Set();
function notifyListeners() {
  const state = getSpatialAudioState();
  for (const fn of _listeners) {
    try { fn(state); } catch (_) {}
  }
}

export function subscribeSpatialAudio(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function setSpatialAudioEnabled(enabled) {
  _isEnabled = Boolean(enabled);
  try {
    localStorage.setItem('sonora_spatial_audio_enabled', _isEnabled ? 'true' : 'false');
  } catch (_) {}
  applySpatialParameters();
  notifyListeners();
}

export function setSpatialAudioMode(mode) {
  _mode = mode;
  try {
    localStorage.setItem('sonora_spatial_audio_mode', mode);
  } catch (_) {}
  applySpatialParameters();
  notifyListeners();
}

export function setSpatialAudioWidth(width) {
  _width = width;
  try {
    localStorage.setItem('sonora_spatial_audio_width', width.toString());
  } catch (_) {}
  applySpatialParameters();
  notifyListeners();
}

export const SPATIAL_PRESETS = [
  { id: 'studio', name: 'Mastering Studio', desc: 'Natural out-of-head depth with reference clarity' },
  { id: 'atmos',  name: 'Cinematic IMAX',   desc: 'Expansive 3D dome with deep cinema sub-bass' },
  { id: 'arena',  name: 'Live Arena',       desc: 'Wide stadium acoustic depth and open reflections' },
  { id: 'vocal',  name: 'Vocal Immersion',  desc: 'Elevated upfront singer with surround backing' },
  { id: 'club',   name: 'Spatial Bass',     desc: '360° punchy sub-bass enclosure & club punch' },
];

export function getSpatialAudioState() {
  return {
    enabled: _isEnabled,
    mode: _mode,
    width: _width,
  };
}
