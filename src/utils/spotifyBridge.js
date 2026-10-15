/**
 * Sonora Spotify Smart Bridge & Remote Soundstage Sync Engine
 * 
 * Enables Sonora to connect to any Spotify account (Free, Modded, or Premium)
 * and act as the live audio sound output and visualizer hub:
 *  - Listens to active Spotify desktop/mobile playback in real-time
 *  - Automatically maps tracks to full lossless / high-quality audio streams
 *  - Powers WebGL Ambient Shaders, 3D Spatial Audio, and Live Synchronized Lyrics
 *  - Synchronizes Play/Pause, Next, Prev, and Seek between Sonora & Spotify
 */

let _token = null;
let _clientId = null;
let _pollingInterval = null;
let _lastSpotifyTrackId = null;
let _isPolling = false;
let _onTrackChangeCallback = null;
let _onStateChangeCallback = null;
let _lastDiagnostics = { status: 'idle', message: 'Waiting for playback' };

// Initial state from localStorage
if (typeof window !== 'undefined') {
  try {
    _token = localStorage.getItem('sonora_spotify_token') || null;
    _clientId = localStorage.getItem('sonora_spotify_client_id') || 'f11bf5a70ef04df2b4c10702677598c1';
  } catch (_) {}
}

const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state'
].join('%20');

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Register callbacks for real-time track and state changes
 */
export function registerSpotifyCallbacks(onTrackChange, onStateChange) {
  if (onTrackChange) _onTrackChangeCallback = onTrackChange;
  if (onStateChange) _onStateChangeCallback = onStateChange;
}

/**
 * Initiates Spotify OAuth PKCE Login flow
 */
export async function startSpotifyAuth(customClientId) {
  const cid = (customClientId || _clientId || 'f11bf5a70ef04df2b4c10702677598c1').trim();
  _clientId = cid;
  try {
    localStorage.setItem('sonora_spotify_client_id', cid);
  } catch (_) {}

  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  // Generate random state
  const state = generateRandomString(16);
  localStorage.setItem('sonora_spotify_auth_state', state);
  localStorage.setItem('sonora_spotify_code_verifier', codeVerifier);

  // Save current route to restore after authorization
  try {
    localStorage.setItem('sonora_spotify_pre_auth_path', window.location.pathname + window.location.search);
  } catch (_) {}

  // Always use the registered root URL with trailing slash (e.g. http://localhost:5173/)
  const redirectUri = encodeURIComponent(window.location.origin + '/');
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${cid}&response_type=code&redirect_uri=${redirectUri}&code_challenge_method=S256&code_challenge=${codeChallenge}&scope=${SPOTIFY_SCOPES}&state=${state}&show_dialog=true`;

  window.location.href = authUrl;
}

/**
 * Refreshes access token using refresh_token if expired
 */
export async function refreshSpotifyToken() {
  const refreshToken = localStorage.getItem('sonora_spotify_refresh_token');
  if (!refreshToken) return false;

  const cid = _clientId || localStorage.getItem('sonora_spotify_client_id') || 'f11bf5a70ef04df2b4c10702677598c1';

  try {
    console.log('[Spotify Bridge] 🔄 Refreshing Spotify access token...');
    const res = await fetch('/api/spotify/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, client_id: cid })
    });

    const data = await res.json();
    if (data.access_token) {
      _token = data.access_token;
      localStorage.setItem('sonora_spotify_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('sonora_spotify_refresh_token', data.refresh_token);
      }
      notifyStateChange();
      return true;
    }
  } catch (err) {
    console.error('[Spotify Bridge] Failed to refresh token:', err);
  }
  return false;
}

/**
 * Checks for OAuth authorization code on redirect and exchanges for access token
 */
export async function handleSpotifyAuthRedirect() {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) {
    // Check legacy hash fallback if present
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      try {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          setSpotifyToken(accessToken);
          window.history.replaceState(null, '', window.location.pathname);
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  const codeVerifier = localStorage.getItem('sonora_spotify_code_verifier');
  const cid = _clientId || localStorage.getItem('sonora_spotify_client_id') || 'f11bf5a70ef04df2b4c10702677598c1';
  const redirectUri = window.location.origin + '/';

  try {
    console.log('[Spotify Bridge] 🔄 Exchanging authorization code for access token via PKCE...');
    window.history.replaceState(null, '', window.location.pathname);

    const res = await fetch('/api/spotify/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        client_id: cid
      })
    });

    const data = await res.json();
    if (data.access_token) {
      console.log('[Spotify Bridge] 🟢 Successfully authenticated with Spotify!');
      _token = data.access_token;
      localStorage.setItem('sonora_spotify_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('sonora_spotify_refresh_token', data.refresh_token);
      }
      localStorage.setItem('sonora_spotify_bridge_active', 'true');
      localStorage.removeItem('sonora_spotify_code_verifier');
      localStorage.removeItem('sonora_spotify_auth_state');

      notifyStateChange();
      startSpotifyPolling();

      const preAuthPath = localStorage.getItem('sonora_spotify_pre_auth_path');
      if (preAuthPath && preAuthPath !== '/' && window.location.pathname === '/') {
        localStorage.removeItem('sonora_spotify_pre_auth_path');
        window.location.href = preAuthPath;
      }
      return true;
    } else {
      console.warn('[Spotify Bridge] Token exchange error:', data);
    }
  } catch (err) {
    console.error('[Spotify Bridge] Failed to exchange PKCE code:', err);
  }
  return false;
}

/**
 * Set Spotify access token manually
 */
export function setSpotifyToken(token) {
  _token = token ? token.trim() : null;
  if (_token) {
    localStorage.setItem('sonora_spotify_token', _token);
    localStorage.setItem('sonora_spotify_bridge_active', 'true');
    startSpotifyPolling();
  } else {
    localStorage.removeItem('sonora_spotify_token');
    localStorage.removeItem('sonora_spotify_refresh_token');
    localStorage.removeItem('sonora_spotify_bridge_active');
    stopSpotifyPolling();
  }
  notifyStateChange();
}

export function getSpotifyToken() {
  return _token;
}

export function isSpotifyBridgeEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('sonora_spotify_bridge_active') === 'true' && Boolean(_token);
}

export function setSpotifyBridgeEnabled(active) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sonora_spotify_bridge_active', active ? 'true' : 'false');
  if (active && _token) {
    startSpotifyPolling();
  } else {
    stopSpotifyPolling();
  }
  notifyStateChange();
}

export function getSpotifyDiagnostics() {
  return _lastDiagnostics;
}

/**
 * Fetches the currently playing track from Spotify
 */
export async function fetchCurrentlyPlaying() {
  if (!_token) {
    _lastDiagnostics = { status: 'disconnected', message: 'No access token available' };
    return null;
  }

  try {
    // Check currently playing endpoint
    let res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${_token}` }
    });

    if (res.status === 401) {
      console.warn('[Spotify Bridge] Access token expired, attempting refresh...');
      const refreshed = await refreshSpotifyToken();
      if (refreshed) {
        res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { 'Authorization': `Bearer ${_token}` }
        });
      } else {
        _lastDiagnostics = { status: 'error', message: 'Token expired. Please reconnect.' };
        return null;
      }
    }

    if (res.status === 204) {
      _lastDiagnostics = { status: 'idle', message: 'Spotify is open but no song is currently playing.' };
      return null;
    }

    if (!res.ok) {
      _lastDiagnostics = { status: 'error', message: `Spotify API status ${res.status}` };
      return null;
    }

    const data = await res.json();
    if (!data || !data.item) {
      _lastDiagnostics = { status: 'idle', message: 'No active track returned.' };
      return null;
    }

    const track = {
      id: data.item.id,
      title: data.item.name,
      artist: data.item.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
      album: data.item.album?.name || '',
      cover: data.item.album?.images?.[0]?.url || data.item.album?.images?.[1]?.url || '',
      durationMs: data.item.duration_ms,
      progressMs: data.progress_ms,
      isPlaying: data.is_playing,
      spotifyUri: data.item.uri,
      device: data.device || null
    };

    _lastDiagnostics = { 
      status: 'playing', 
      message: `Playing: "${track.title}" by ${track.artist} (${track.isPlaying ? 'Active' : 'Paused'})` 
    };

    return track;
  } catch (err) {
    console.error('Error fetching Spotify currently playing:', err);
    _lastDiagnostics = { status: 'error', message: err.message };
    return null;
  }
}

/**
 * Force manual sync check now
 */
export async function syncNow() {
  const track = await fetchCurrentlyPlaying();
  if (track) {
    if (_onStateChangeCallback) _onStateChangeCallback(track);
    if (_onTrackChangeCallback) _onTrackChangeCallback(track);
  }
  return _lastDiagnostics;
}

/**
 * Starts real-time polling to sync playback with Spotify Desktop / Mobile
 */
export function startSpotifyPolling(onTrackChange, onStateChange) {
  if (onTrackChange) _onTrackChangeCallback = onTrackChange;
  if (onStateChange) _onStateChangeCallback = onStateChange;

  if (_isPolling || !_token) return;
  _isPolling = true;

  console.log('[Spotify Bridge] 🚀 Starting real-time playback sync daemon...');

  const poll = async () => {
    if (!_isPolling || !_token) return;

    try {
      const state = await fetchCurrentlyPlaying();
      if (state) {
        if (_onStateChangeCallback) {
          _onStateChangeCallback(state);
        }

        // Detect track change
        if (state.id && state.id !== _lastSpotifyTrackId) {
          _lastSpotifyTrackId = state.id;
          console.log(`[Spotify Bridge] 🟢 Detected new Spotify track: "${state.title}" by ${state.artist}`);
          if (_onTrackChangeCallback) {
            _onTrackChangeCallback(state);
          }
        }
      }
    } catch (err) {
      console.warn('[Spotify Bridge] Sync polling glitch:', err);
    }
  };

  poll();
  _pollingInterval = setInterval(poll, 1500);
  notifyStateChange();
}

export function stopSpotifyPolling() {
  _isPolling = false;
  if (_pollingInterval) {
    clearInterval(_pollingInterval);
    _pollingInterval = null;
  }
  _lastSpotifyTrackId = null;
  notifyStateChange();
}

/**
 * Remote Control Commands to Spotify App
 */
export async function spotifyRemotePlay() {
  if (!_token) return;
  try {
    await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${_token}` }
    });
  } catch (e) {
    console.error('Spotify remote play failed:', e);
  }
}

export async function spotifyRemotePause() {
  if (!_token) return;
  try {
    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${_token}` }
    });
  } catch (e) {
    console.error('Spotify remote pause failed:', e);
  }
}

export async function spotifyRemoteNext() {
  if (!_token) return;
  try {
    await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${_token}` }
    });
    setTimeout(fetchCurrentlyPlaying, 350);
  } catch (e) {
    console.error('Spotify remote next failed:', e);
  }
}

export async function spotifyRemotePrevious() {
  if (!_token) return;
  try {
    await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${_token}` }
    });
    setTimeout(fetchCurrentlyPlaying, 350);
  } catch (e) {
    console.error('Spotify remote previous failed:', e);
  }
}

export async function spotifyRemoteSeek(positionMs) {
  if (!_token) return;
  try {
    await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(positionMs)}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${_token}` }
    });
  } catch (e) {
    console.error('Spotify remote seek failed:', e);
  }
}

// Event subscriber
const _bridgeListeners = new Set();
function notifyStateChange() {
  const state = {
    connected: Boolean(_token),
    active: isSpotifyBridgeEnabled(),
    hasToken: Boolean(_token),
    diagnostics: _lastDiagnostics
  };
  for (const fn of _bridgeListeners) {
    try { fn(state); } catch (_) {}
  }
}

export function subscribeSpotifyBridge(fn) {
  _bridgeListeners.add(fn);
  return () => _bridgeListeners.delete(fn);
}
