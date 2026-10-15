import { useEffect, useRef, useState } from "react";
import { getBeatState } from "./AudioVisualizer";
import { usePlayer } from "../context/PlayerContext";

// ─── Vertex shader ────────────────────────────────────────────────────────────
const VERT_SRC = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

// ─── Fragment shader ──────────────────────────────────────────────────────────
const FRAG_SRC = `
  precision mediump float;
  varying vec2 v_uv;

  uniform vec2  u_res;
  uniform float u_time;

  uniform float u_bass;
  uniform float u_midsL;
  uniform float u_midsR;
  uniform float u_highs;
  uniform float u_vocal;
  uniform float u_energy;

  uniform float u_trackFade;
  uniform float u_pauseFade;

  uniform vec3  u_c1;
  uniform vec3  u_c2;
  uniform vec3  u_c3;
  uniform vec3  u_cv;
  uniform vec3  u_themeBg;

  uniform float u_glow;
  uniform float u_boost;

  uniform sampler2D u_texPrev;
  uniform sampler2D u_texCurr;
  uniform float     u_texBlend;
  uniform float     u_hasArt;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float orbGrad(vec2 uv, vec2 center, float radius) {
    float d = length(uv - center);
    return exp(-(d * d) / (radius * radius * 0.45));
  }

  vec3 saturateColor(vec3 color, float saturation) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), color, saturation);
  }

  void main() {
    vec2 uv = v_uv;
    
    // Subtle beat-reactive fluid distortion for organic living liquid ambiance
    float fluidNoise = (noise(uv * 2.5 + vec2(u_time * 0.25, -u_time * 0.18)) - 0.5) * (0.04 + u_bass * 0.08);
    vec2 fluidUv = uv + vec2(fluidNoise * 0.8, fluidNoise * 1.2);
    
    // Period angular speeds
    float w1 = 0.4488, w2 = 0.3307, w3 = 0.2618;
    
    // Stereo spatial distribution for middle frequencies
    float stereoShift = clamp((u_midsR - u_midsL) * 0.25, -0.20, 0.20);
    
    // 2. Orbital center paths reacting dynamically to music frequencies
    float angle1 = u_time * w1 + u_bass * 1.8;
    vec2 center1 = vec2(0.22, 0.78) + vec2(cos(angle1), sin(angle1)) * (0.09 + u_bass * 0.16);
    
    float angle2 = u_time * w2 + u_vocal * 1.6;
    vec2 center2 = vec2(0.78 + stereoShift, 0.22) + vec2(sin(angle2), cos(angle2)) * (0.09 + u_vocal * 0.15);
    
    float angle3 = u_time * w3 + u_highs * 1.6;
    vec2 center3 = vec2(0.50 - stereoShift * 0.5, 0.50) + vec2(cos(angle3), -sin(angle3)) * (0.07 + u_highs * 0.12);
    
    // 3. Amplified orb scale (radius) reactions for explosive dynamic sizing
    float r1 = 0.48 * (1.0 + u_bass * 0.75);
    float r2 = 0.42 * (1.0 + u_vocal * 0.65);
    float r3 = 0.38 * (1.0 + u_highs * 0.55);
    
    // Calculate gradients with soft Gaussian falloff using fluid UVs
    float g1 = orbGrad(fluidUv, center1, r1);
    float orbOpa1 = (0.18 + u_bass * 0.82) * u_trackFade * u_glow;
    vec3 col1 = u_c1 * g1 * orbOpa1;
    
    float g2 = orbGrad(fluidUv, center2, r2);
    float orbOpa2 = (0.15 + u_vocal * 0.85) * u_trackFade * u_glow;
    vec3 col2 = u_c2 * g2 * orbOpa2;
    
    float g3 = orbGrad(fluidUv, center3, r3);
    float orbOpa3 = (0.14 + u_highs * 0.86) * u_trackFade * u_glow;
    vec3 col3 = u_c3 * g3 * orbOpa3;
    
    // Dynamic color boost driven by energy and sub-bass transients
    float finalBoost = u_boost * (1.0 + u_energy * 0.32 + u_bass * 0.18);
    vec3 color = (col1 + col2 + col3) * finalBoost;
    
    // Saturation and contrast boost for Now Playing (high intensity mode when u_boost > 1.0)
    float highIntensityFactor = clamp((u_boost - 1.0) / 0.45, 0.0, 1.0);
    vec3 saturatedColorVal = saturateColor(color, 1.55 + u_energy * 0.30);
    vec3 contrastedColorVal = pow(saturatedColorVal, vec3(1.10)) * 1.20;
    color = mix(color, contrastedColorVal, highIntensityFactor);
    
    // Art overlay if available
    if (u_hasArt > 0.5) {
      vec2 artUv = clamp((uv - vec2(0.5)) / 1.18 + vec2(0.5), 0.0, 1.0);
      
      // Calculate beat-reactive chromatic aberration displacement
      float chromaticOffset = 0.012 * u_bass;
      
      // Sample RGB channels with offsets
      float rCurr = texture2D(u_texCurr, clamp(artUv + vec2(chromaticOffset, 0.0), 0.0, 1.0)).r;
      float gCurr = texture2D(u_texCurr, artUv).g;
      float bCurr = texture2D(u_texCurr, clamp(artUv - vec2(chromaticOffset, 0.0), 0.0, 1.0)).b;
      
      float rPrev = texture2D(u_texPrev, clamp(artUv + vec2(chromaticOffset, 0.0), 0.0, 1.0)).r;
      float gPrev = texture2D(u_texPrev, artUv).g;
      float bPrev = texture2D(u_texPrev, clamp(artUv - vec2(chromaticOffset, 0.0), 0.0, 1.0)).b;
      
      vec3 colPrev = saturateColor(vec3(rPrev, gPrev, bPrev), 2.2);
      vec3 colCurr = saturateColor(vec3(rCurr, gCurr, bCurr), 2.2);
      vec3 artCol = mix(colPrev, colCurr, u_texBlend);
      
      float artWeight = 0.36 + u_energy * 0.16;
      color = mix(color, artCol, clamp(artWeight, 0.20, 0.60) * u_trackFade);
    }
    
    vec3 finalColor = mix(u_themeBg, color, u_trackFade);
    
    // Vignette - use physical coordinates v_uv with beat-reactive breathing
    float vigPulse = 1.0 + u_bass * 0.20;
    float radD = length(v_uv - vec2(0.5)) * 1.4142 * vigPulse;
    float vigOpa = (0.92 - u_energy * 0.45) * u_pauseFade;
    float vigFactor = clamp(radD * radD, 0.0, 1.0) * 0.80 * vigOpa;
    
    // 1. Linear gradient bottom layer (darker at bottom for controls readability, clearer at top)
    finalColor = mix(finalColor, u_themeBg, mix(0.85, 0.30, v_uv.y) * vigOpa);
    // 2. Radial theme edges layer (seamless, smooth quadratic decay with no sharp boundaries)
    finalColor = mix(finalColor, u_themeBg, vigFactor);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const THEME_COLORS = {
  midnight: { r: 195, g: 208, b: 184 },
  abyss:    { r: 255, g: 255, b: 255 },
  aura:     { r: 167, g: 139, b: 250 },
  forest:   { r: 74,  g: 222, b: 128 },
  sunset:   { r: 251, g: 146, b: 60  },
};

function compileShader(gl, src, type) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

const MAX_DIM = 512;
function handleResize(canvas, gl) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min(1.0, MAX_DIM / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  gl.viewport(0, 0, canvas.width, canvas.height);
}

export function WebGLAmbientBackground({ glow = 1.0, boost = 1.0 }) {
  const { currentTrack, theme, backgroundAmbiancePlay } = usePlayer();
  
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  
  const texturePrevRef = useRef(null);
  const textureCurrRef = useRef(null);
  
  const hasArtRef = useRef(0.0);
  const texBlendRef = useRef(1.0);
  const pauseFadeRef = useRef(1.0);
  const interpolatedColorsRef = useRef([[30,40,35], [20,30,40], [25,25,45]]);

  const [canvasOpacity, setCanvasOpacity] = useState(1);
  const isTickPausedRef = useRef(false);
  const tickRef = useRef(null);
  
  const backgroundAmbiancePlayRef = useRef(backgroundAmbiancePlay);
  useEffect(() => {
    backgroundAmbiancePlayRef.current = backgroundAmbiancePlay;
    
    // If the setting is toggled off (saver disabled) while hidden, resume running immediately
    if (!backgroundAmbiancePlay && isTickPausedRef.current) {
      isTickPausedRef.current = false;
      if (tickRef.current) {
        requestAnimationFrame(tickRef.current);
      }
      setCanvasOpacity(1);
    }
  }, [backgroundAmbiancePlay]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      
      if (isHidden && backgroundAmbiancePlayRef.current) {
        // Fade out transition
        setCanvasOpacity(0);
        
        // After fade duration (800ms), pause the animation frame loop
        const timer = setTimeout(() => {
          isTickPausedRef.current = true;
        }, 800);
        return () => clearTimeout(timer);
      } else {
        // Resume ticking first so frames are updated before fading back in
        if (isTickPausedRef.current) {
          isTickPausedRef.current = false;
          if (tickRef.current) {
            requestAnimationFrame(tickRef.current);
          }
        }
        setCanvasOpacity(1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  
  // Offscreen canvas for one-time GPU blurred texture upload
  const offscreenCanvasRef = useRef(null);
  const offscreenCtxRef = useRef(null);

  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      offscreenCanvasRef.current = c;
      offscreenCtxRef.current = c.getContext("2d");
    }
  }, []);

  // Handle Cover Art texture updates
  useEffect(() => {
    const gl = glRef.current;
    const offscreenCtx = offscreenCtxRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!gl || !offscreenCtx || !offscreenCanvas) return;
    
    const cover = currentTrack?.cover;
    if (!cover || cover.startsWith('linear')) {
      hasArtRef.current = 0.0;
      return;
    }
    
    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!active) return;
      
      // Swap textures
      const temp = texturePrevRef.current;
      texturePrevRef.current = textureCurrRef.current;
      textureCurrRef.current = temp;
      
      // Upload new blurred image to textureCurr
      gl.bindTexture(gl.TEXTURE_2D, textureCurrRef.current);
      offscreenCtx.clearRect(0, 0, 256, 256);
      offscreenCtx.filter = "blur(12px)";
      offscreenCtx.drawImage(img, 0, 0, 256, 256);
      
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      
      hasArtRef.current = 1.0;
      texBlendRef.current = 0.0; // Reset blend to start cross-fade
    };
    img.onerror = () => {
      console.warn("Failed to load cover image as texture:", cover);
    };
    img.src = cover;
    
    return () => {
      active = false;
    };
  }, [currentTrack?.cover]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.error("WebGL context could not be initialized");
      return;
    }
    glRef.current = gl;
    
    // Compile shaders
    const vs = compileShader(gl, VERT_SRC, gl.VERTEX_SHADER);
    const fs = compileShader(gl, FRAG_SRC, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;
    gl.useProgram(program);
    
    // Setup quad buffer
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const a_pos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(a_pos);
    gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);
    
    // Create textures
    const createTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    
    texturePrevRef.current = createTex();
    textureCurrRef.current = createTex();
    
    // Resize handler
    const onResize = () => handleResize(canvas, gl);
    onResize();
    window.addEventListener("resize", onResize);
    
    // Start tick
    let active = true;
    const startTime = Date.now();
    let lastTime = Date.now();
    
    const tick = () => {
      if (!active) return;
      if (isTickPausedRef.current) return;
      
      const now = Date.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      
      const beatState = getBeatState();
      
      // Update pause fade
      pauseFadeRef.current += (((beatState.isPlaying !== false) ? 1.0 : 0.0) - pauseFadeRef.current) * 0.15;
      
      // Interpolate colors towards target colors
      const targetColors = beatState.colors || [[30,40,35], [20,30,40], [25,25,45]];
      const interpolated = interpolatedColorsRef.current;
      const LERP_FACTOR = 0.1;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          interpolated[i][j] += (targetColors[i][j] - interpolated[i][j]) * LERP_FACTOR;
        }
      }
      
      // Apply theme mix
      let r = interpolated[0][0], g = interpolated[0][1], b = interpolated[0][2];
      let r2 = interpolated[1][0], g2 = interpolated[1][1], b2 = interpolated[1][2];
      let r3 = interpolated[2][0], g3 = interpolated[2][1], b3 = interpolated[2][2];
      
      const hasCoverArt = currentTrack?.cover && !currentTrack.cover.startsWith('linear');
      if (theme && theme !== 'none' && THEME_COLORS[theme]) {
        const tc = THEME_COLORS[theme];
        // Skip theme dilution entirely if we have cover art or if we are in Now Playing screen
        const mix = (hasCoverArt || boost > 1.05) ? 0.0 : 0.65;
        if (mix > 0.0) {
          r = r * (1 - mix) + tc.r * mix;
          g = g * (1 - mix) + tc.g * mix;
          b = b * (1 - mix) + tc.b * mix;
          r2 = r2 * (1 - mix) + tc.r * mix * 0.8;
          g2 = g2 * (1 - mix) + tc.g * mix * 0.8;
          b2 = b2 * (1 - mix) + tc.b * mix * 0.8;
          r3 = r3 * (1 - mix) + tc.r * mix * 0.6;
          g3 = g3 * (1 - mix) + tc.g * mix * 0.6;
          b3 = b3 * (1 - mix) + tc.b * mix * 0.6;
        }
      }
      
      // Spotlight color (cv) - brighter blend
      const cvR = Math.min(1.0, (r + r2) / 2.0 / 255.0 * 1.3);
      const cvG = Math.min(1.0, (g + g2) / 2.0 / 255.0 * 1.3);
      const cvB = Math.min(1.0, (b + b2) / 2.0 / 255.0 * 1.3);
      
      // Theme background color
      const themeBgStr = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-rgb') || '9, 10, 9';
      const [bgR, bgG, bgB] = themeBgStr.split(',').map(v => parseInt(v.trim(), 10) / 255.0);
      
      // Update uniforms
      gl.useProgram(program);
      
      const bass = beatState.left?.bass ?? beatState.bass ?? 0;
      const midsL = beatState.left?.mids ?? beatState.mids ?? 0;
      const midsR = beatState.right?.mids ?? beatState.mids ?? 0;
      const highs = beatState.right?.highs ?? beatState.highs ?? 0;
      const energy = beatState.energy ?? 0;
      const trackFade = beatState.trackFade ?? 1;
      
      gl.uniform2f(gl.getUniformLocation(program, "u_res"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, "u_time"), (Date.now() - startTime) / 1000);
      
      gl.uniform1f(gl.getUniformLocation(program, "u_bass"), bass);
      gl.uniform1f(gl.getUniformLocation(program, "u_midsL"), midsL);
      gl.uniform1f(gl.getUniformLocation(program, "u_midsR"), midsR);
      gl.uniform1f(gl.getUniformLocation(program, "u_highs"), highs);
      gl.uniform1f(gl.getUniformLocation(program, "u_vocal"), (midsL + midsR) / 2);
      gl.uniform1f(gl.getUniformLocation(program, "u_energy"), energy);
      
      gl.uniform1f(gl.getUniformLocation(program, "u_trackFade"), trackFade * pauseFadeRef.current);
      gl.uniform1f(gl.getUniformLocation(program, "u_pauseFade"), pauseFadeRef.current);
      
      gl.uniform3f(gl.getUniformLocation(program, "u_c1"), r / 255.0, g / 255.0, b / 255.0);
      gl.uniform3f(gl.getUniformLocation(program, "u_c2"), r2 / 255.0, g2 / 255.0, b2 / 255.0);
      gl.uniform3f(gl.getUniformLocation(program, "u_c3"), r3 / 255.0, g3 / 255.0, b3 / 255.0);
      gl.uniform3f(gl.getUniformLocation(program, "u_cv"), cvR, cvG, cvB);
      gl.uniform3f(gl.getUniformLocation(program, "u_themeBg"), bgR, bgG, bgB);
      
      gl.uniform1f(gl.getUniformLocation(program, "u_glow"), glow);
      gl.uniform1f(gl.getUniformLocation(program, "u_boost"), boost);
      
      // Update textures blending
      if (texBlendRef.current < 1.0) {
        texBlendRef.current = Math.min(1.0, texBlendRef.current + 0.04);
      }
      gl.uniform1f(gl.getUniformLocation(program, "u_texBlend"), texBlendRef.current);
      gl.uniform1f(gl.getUniformLocation(program, "u_hasArt"), hasArtRef.current);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texturePrevRef.current);
      gl.uniform1i(gl.getUniformLocation(program, "u_texPrev"), 0);
      
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textureCurrRef.current);
      gl.uniform1i(gl.getUniformLocation(program, "u_texCurr"), 1);
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      requestAnimationFrame(tick);
    };
    
    tickRef.current = tick;
    requestAnimationFrame(tick);
    
    return () => {
      active = false;
      window.removeEventListener("resize", onResize);
      if (gl) {
        if (texturePrevRef.current) gl.deleteTexture(texturePrevRef.current);
        if (textureCurrRef.current) gl.deleteTexture(textureCurrRef.current);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        filter: "blur(64px)",
        transform: "scale(1.12)",
        opacity: canvasOpacity,
        transition: "opacity 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)",
      }}
    />
  );
}
