import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { trackEvent } from '../utils/analytics';
import { useAuth } from './AuthContext';
import {
  handleSpotifyAuthRedirect,
  isSpotifyBridgeEnabled,
  setSpotifyBridgeEnabled,
  startSpotifyPolling,
  stopSpotifyPolling,
  startSpotifyAuth,
  setSpotifyToken,
  getSpotifyToken,
  subscribeSpotifyBridge,
  spotifyRemotePlay,
  spotifyRemotePause,
  spotifyRemoteNext,
  spotifyRemotePrevious,
  spotifyRemoteSeek,
  registerSpotifyCallbacks,
  syncNow,
  getSpotifyDiagnostics
} from '../utils/spotifyBridge';


export const DEFAULT_DEMO_TRACKS = [
  {
    id: "track-synthwave-1",
    title: "Celestial Odyssey",
    artist: "Aura Soundscapes",
    album: "Synthwave Horizons",
    duration: 120,
    cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    audioUrl: "./audio/synthwave.wav",
    source: "local"
  },
  {
    id: "track-lofi-2",
    title: "Midnight Rain & Neon",
    artist: "Komorebi",
    album: "Quiet Hours Lofi",
    duration: 144,
    cover: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80",
    audioUrl: "./audio/lofi_chill.wav",
    source: "local"
  },
  {
    id: "track-cyber-3",
    title: "Retrofuturism 2099",
    artist: "Vortex Synth",
    album: "Cyber Shimmer",
    duration: 120,
    cover: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80",
    audioUrl: "./audio/synthwave.wav",
    source: "local"
  }
];

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [spotifyBridgeState, setSpotifyBridgeState] = useState(() => ({
    connected: Boolean(getSpotifyToken()),
    active: isSpotifyBridgeEnabled()
  }));

  const [queue, setQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const saved = localStorage.getItem('aura_track_index');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => {
    return localStorage.getItem('aura_autoplay_enabled') !== 'false';
  });

  const [isExpanded, setIsExpanded] = useState(true);
  const [ambientEffectsEnabled, setAmbientEffectsEnabled] = useState(() => {
    const saved = localStorage.getItem('aura_ambient_enabled');
    if (saved !== null) {
      return saved === 'true';
    }
    const isMobile = /iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 640;
    return !isMobile;
  });
  const [backgroundAmbiancePlay, setBackgroundAmbiancePlay] = useState(() => {
    const saved = localStorage.getItem('aura_background_ambiance_play');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('aura_background_ambiance_play', backgroundAmbiancePlay);
  }, [backgroundAmbiancePlay]);

  const [theme, setTheme] = useState(localStorage.getItem('aura_theme') || 'none');
  const [ambientSettings, setAmbientSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_ambient_settings');
      return saved ? JSON.parse(saved) : { glow: 1.0, bass: 1.0, mids: 1.0, highs: 1.0 };
    } catch {
      return { glow: 1.0, bass: 1.0, mids: 1.0, highs: 1.0 };
    }
  });
  const [particlesMode, setParticlesMode] = useState(() => {
    return localStorage.getItem('aura_particles_mode') || 'both';
  });
  const [ambientMode, setAmbientMode] = useState(() => {
    return localStorage.getItem('aura_ambient_mode') || 'webgl';
  });
  const [crossfadeDuration, setCrossfadeDuration] = useState(() => {
    const saved = localStorage.getItem('aura_crossfade_duration');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('aura_crossfade_duration', crossfadeDuration);
  }, [crossfadeDuration]);

  const [morphism, setMorphism] = useState(() => {
    return localStorage.getItem('aura_morphism') || 'glassmorphism';
  });

  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState(() => {
    const active = localStorage.getItem('aura_sleep_timer_active') === 'true';
    if (active) {
      const expiry = parseInt(localStorage.getItem('aura_sleep_timer_expiry'), 10);
      if (expiry) {
        const left = Math.ceil((expiry - Date.now()) / 1000);
        return left > 0 ? left : null;
      }
    }
    return null;
  });
  const [sleepTimerActive, setSleepTimerActive] = useState(() => {
    const active = localStorage.getItem('aura_sleep_timer_active') === 'true';
    if (active) {
      const expiry = parseInt(localStorage.getItem('aura_sleep_timer_expiry'), 10);
      if (expiry && expiry > Date.now()) {
        return true;
      }
    }
    return false;
  });
  const [initialSleepDuration, setInitialSleepDuration] = useState(() => {
    const saved = localStorage.getItem('aura_sleep_timer_initial');
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (sleepTimerActive && sleepTimerSecondsLeft !== null) {
      localStorage.setItem('aura_sleep_timer_active', 'true');
      localStorage.setItem('aura_sleep_timer_initial', initialSleepDuration);
      
      const storedExpiryStr = localStorage.getItem('aura_sleep_timer_expiry');
      const storedExpiry = storedExpiryStr ? parseInt(storedExpiryStr, 10) : 0;
      const targetExpiry = Date.now() + sleepTimerSecondsLeft * 1000;
      
      // Prevent slight drift on each second tick by only updating if significantly different (e.g. new duration set)
      if (!storedExpiry || Math.abs(storedExpiry - targetExpiry) > 5000) {
        localStorage.setItem('aura_sleep_timer_expiry', targetExpiry);
      }
    } else {
      localStorage.removeItem('aura_sleep_timer_active');
      localStorage.removeItem('aura_sleep_timer_expiry');
      localStorage.removeItem('aura_sleep_timer_initial');
    }
  }, [sleepTimerActive, sleepTimerSecondsLeft, initialSleepDuration]);

  const [tvStream, setTvStream] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_tv_stream');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [tvBeatAmbient, setTvBeatAmbient] = useState(() => {
    const saved = localStorage.getItem('aura_tv_beat_ambient');
    return saved !== null ? saved === 'true' : true;
  });

  const [tvSandboxEnabled, setTvSandboxEnabled] = useState(() => {
    const saved = localStorage.getItem('aura_tv_sandbox_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [stereoSeparationEnabled, setStereoSeparationEnabled] = useState(() => {
    const saved = localStorage.getItem('aura_stereo_separation_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('aura_stereo_separation_enabled', stereoSeparationEnabled);
  }, [stereoSeparationEnabled]);

  useEffect(() => {
    if (tvStream) {
      localStorage.setItem('aura_tv_stream', JSON.stringify(tvStream));
    } else {
      localStorage.removeItem('aura_tv_stream');
    }
  }, [tvStream]);

  useEffect(() => {
    localStorage.setItem('aura_tv_beat_ambient', tvBeatAmbient);
  }, [tvBeatAmbient]);

  useEffect(() => {
    localStorage.setItem('aura_tv_sandbox_enabled', tvSandboxEnabled);
  }, [tvSandboxEnabled]);

  useEffect(() => {
    localStorage.setItem('aura_morphism', morphism);
    document.documentElement.setAttribute('data-morphism', morphism);
  }, [morphism]);

  const [enableDateTimeAlert, setEnableDateTimeAlert] = useState(() => {
    const saved = localStorage.getItem('aura_enable_datetime_alert');
    return saved !== null ? saved === 'true' : true;
  });

  const [enableLiveMatchScoreAlert, setEnableLiveMatchScoreAlert] = useState(() => {
    const saved = localStorage.getItem('aura_enable_livematch_alert');
    return saved !== null ? saved === 'true' : true;
  });

  const [liveMatchSport, setLiveMatchSport] = useState(() => {
    return localStorage.getItem('aura_livematch_sport') || 'soccer';
  });

  useEffect(() => {
    localStorage.setItem('aura_enable_datetime_alert', enableDateTimeAlert);
  }, [enableDateTimeAlert]);

  useEffect(() => {
    localStorage.setItem('aura_enable_livematch_alert', enableLiveMatchScoreAlert);
  }, [enableLiveMatchScoreAlert]);

  useEffect(() => {
    localStorage.setItem('aura_livematch_sport', liveMatchSport);
  }, [liveMatchSport]);

  const [customColors, setCustomColors] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_custom_colors');
      return saved ? JSON.parse(saved) : {
        background: '#090a09',
        sidebar: '#101210',
        player: '#161a16',
        widgets: '#1c221c'
      };
    } catch {
      return {
        background: '#090a09',
        sidebar: '#101210',
        player: '#161a16',
        widgets: '#1c221c'
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('aura_custom_colors', JSON.stringify(customColors));
    
    const updateContrastProperties = (propName, baseColor) => {
      const hex = (baseColor || '').replace('#', '');
      let isLight = false;
      if (hex.length >= 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          isLight = yiq >= 128;
        }
      }
      
      if (isLight) {
        document.documentElement.style.setProperty(`--text-on-${propName}`, 'rgba(10, 10, 10, 0.98)');
        document.documentElement.style.setProperty(`--text-on-${propName}-muted`, 'rgba(10, 10, 10, 0.65)');
        document.documentElement.style.setProperty(`--border-on-${propName}`, 'rgba(0, 0, 0, 0.12)');
        document.documentElement.style.setProperty(`--glass-on-${propName}`, 'rgba(0, 0, 0, 0.05)');
      } else {
        document.documentElement.style.setProperty(`--text-on-${propName}`, 'rgba(255, 255, 255, 0.98)');
        document.documentElement.style.setProperty(`--text-on-${propName}-muted`, 'rgba(255, 255, 255, 0.55)');
        document.documentElement.style.setProperty(`--border-on-${propName}`, 'rgba(255, 255, 255, 0.08)');
        document.documentElement.style.setProperty(`--glass-on-${propName}`, 'rgba(255, 255, 255, 0.035)');
      }
    };

    if (morphism !== 'glassmorphism') {
      document.documentElement.style.setProperty('--custom-bg', customColors.background);
      document.documentElement.style.setProperty('--custom-sidebar', customColors.sidebar);
      document.documentElement.style.setProperty('--custom-player', customColors.player);
      document.documentElement.style.setProperty('--custom-widgets', customColors.widgets);
      
      updateContrastProperties('bg', customColors.background);
      updateContrastProperties('sidebar', customColors.sidebar);
      updateContrastProperties('player', customColors.player);
      updateContrastProperties('widgets', customColors.widgets);
    } else {
      document.documentElement.style.removeProperty('--custom-bg');
      document.documentElement.style.removeProperty('--custom-sidebar');
      document.documentElement.style.removeProperty('--custom-player');
      document.documentElement.style.removeProperty('--custom-widgets');
      
      const properties = ['bg', 'sidebar', 'player', 'widgets'];
      properties.forEach(prop => {
        document.documentElement.style.removeProperty(`--text-on-${prop}`);
        document.documentElement.style.removeProperty(`--text-on-${prop}-muted`);
        document.documentElement.style.removeProperty(`--border-on-${prop}`);
        document.documentElement.style.removeProperty(`--glass-on-${prop}`);
      });
    }
  }, [morphism, customColors]);

  useEffect(() => {
    if (morphism !== 'glassmorphism') {
      setAmbientEffectsEnabled(false);
    } else {
      setAmbientEffectsEnabled(true);
    }
  }, [morphism]);

  const setAmbientEffectsEnabledWrapper = useCallback((value) => {
    if (localStorage.getItem('aura_morphism') !== 'glassmorphism') {
      setAmbientEffectsEnabled(false);
    } else {
      setAmbientEffectsEnabled(value);
    }
  }, []);
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom dialog system now consumed from useAuth()

  // Track Menu State
  const [trackMenu, setTrackMenu] = useState(null);

  // Artist Profile Popup State
  const [activeArtistName, setActiveArtistName] = useState(null);
  const [artistProfileOpen, setArtistProfileOpen] = useState(false);

  const openArtistProfile = (artistName) => {
    if (!artistName) return;
    setActiveArtistName(artistName);
    setArtistProfileOpen(true);
  };

  const closeArtistProfile = () => {
    setActiveArtistName(null);
    setArtistProfileOpen(false);
  };

  const [siteSettings, setSiteSettings] = useState({
    site_title: 'Sonora',
    maintenance_mode: false,
    announcement_message: '',
    allow_guest_login: true,
    default_theme: 'midnight',
    enable_admin_notification: true,
    enable_live_tv: true,
    enable_chat_support: true
  });

  const [partyRoomCode, setPartyRoomCode] = useState(localStorage.getItem('aura_party_room_code') || '');

  const {
    user,
    isAuthLoading,
    sessions,
    showDeviceNicknameModal,
    setShowDeviceNicknameModal,
    pendingUser,
    isBanned,
    isSuspended,
    suspendedUntil,
    suspensionReason,
    customUserId,
    sessionId,
    loginWithGoogle,
    continueAsGuest,
    loginWithEmail,
    signUpWithEmail,
    sendOtp,
    verifyOtp,
    checkEmailVerificationStatus,
    resendVerificationEmail,
    updateProfile,
    renameSession,
    terminateSession,
    logout,
    deleteAccount,
    syncDeviceSession,
    refreshSessions,
    showAlert,
    showConfirm
  } = useAuth();

  // --- Playlist YouTube Import Background Task State ---
  const [importStatus, setImportStatus] = useState({
    active: false,
    step: 'idle', // idle, fetching_metadata, importing_tracks, lyrics_checklist, fetching_lyrics, completed, failed
    totalTracks: 0,
    currentTrackIndex: 0,
    playlistName: '',
    playlistCover: '',
    progress: 0,
    estimatedSeconds: 0,
    importedTracks: [],
    playlistId: null,
    shouldFetchLyrics: true,
    importUrl: ''
  });

  const pollIntervalRef = useRef(null);
  const resolvingIdsRef = useRef(new Set());

  const pollJobStatus = (jobId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/playlists/import-status/${jobId}`);
        if (!res.ok) {
          clearInterval(pollIntervalRef.current);
          setImportStatus(prev => ({ ...prev, active: false, step: 'failed', error: 'Import job not found' }));
          localStorage.removeItem('activeImportJobId');
          return;
        }
        const data = await res.json();
        
        setImportStatus({
          active: data.step !== 'completed' && data.step !== 'failed' && data.step !== 'idle',
          step: data.step,
          totalTracks: data.totalTracks,
          currentTrackIndex: data.currentTrackIndex,
          playlistName: data.playlistName,
          playlistCover: data.playlistCover,
          progress: data.progress,
          estimatedSeconds: Math.max(0, Math.round((data.totalTracks - data.currentTrackIndex) * 1.5)),
          importedTracks: data.importedTracks || [],
          playlistId: data.playlistId,
          shouldFetchLyrics: data.shouldFetchLyrics,
          importUrl: data.playlistUrl
        });

        if (data.step === 'completed') {
          clearInterval(pollIntervalRef.current);
          localStorage.removeItem('activeImportJobId');
          showAlert(`Successfully imported playlist "${data.playlistName || 'Playlist'}"!`);
        } else if (data.step === 'failed') {
          clearInterval(pollIntervalRef.current);
          localStorage.removeItem('activeImportJobId');
          showAlert(data.error || "Playlist import failed.");
        }
      } catch (err) {
        console.error("Failed to poll import job status:", err);
      }
    }, 1500);
  };

  useEffect(() => {
    const savedJobId = localStorage.getItem('activeImportJobId');
    if (savedJobId) {
      pollJobStatus(savedJobId);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user]); // Re-bind on user load/change to get updated session headers

  const startYoutubeImport = async (url, fetchLyricsChecked) => {
    setImportStatus({
      active: true,
      step: 'fetching_metadata',
      totalTracks: 0,
      currentTrackIndex: 0,
      playlistName: '',
      playlistCover: '',
      progress: 0,
      estimatedSeconds: 0,
      importedTracks: [],
      playlistId: null,
      shouldFetchLyrics: fetchLyricsChecked,
      importUrl: url
    });

    try {
      const res = await fetch('/api/playlists/start-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({ playlistUrl: url, shouldFetchLyrics: fetchLyricsChecked })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate background playlist import");
      
      localStorage.setItem('activeImportJobId', data.jobId);
      pollJobStatus(data.jobId);
    } catch (err) {
      showAlert(err.message || "Failed to start background import.");
      setImportStatus(prev => ({ ...prev, active: false, step: 'idle' }));
    }
  };

  const executeLyricsFetch = async (selectedTracksMap) => {
    const savedJobId = localStorage.getItem('activeImportJobId');
    if (!savedJobId) return;

    const selectedTrackIds = Object.keys(selectedTracksMap).filter(id => selectedTracksMap[id]).map(Number);
    if (selectedTrackIds.length === 0) {
      skipLyricsImport();
      return;
    }

    try {
      const res = await fetch(`/api/playlists/import-lyrics/${savedJobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({ selectedTrackIds })
      });
      if (res.ok) {
        setImportStatus(prev => ({
          ...prev,
          step: 'fetching_lyrics',
          progress: 0,
          currentTrackIndex: 0,
          totalTracks: selectedTrackIds.length
        }));
      }
    } catch (e) {
      console.error("Failed to start background lyrics fetch:", e);
    }
  };

  const skipLyricsImport = async () => {
    const savedJobId = localStorage.getItem('activeImportJobId');
    if (savedJobId) {
      try {
        await fetch(`/api/playlists/cancel-import/${savedJobId}`, { method: 'POST' });
      } catch(e) {}
      localStorage.removeItem('activeImportJobId');
    }
    showAlert(`Successfully imported playlist "${importStatus.playlistName || 'Playlist'}"!`);
    setImportStatus(prev => ({
      ...prev,
      step: 'completed',
      progress: 100
    }));
    setTimeout(() => {
      setImportStatus(prev => ({
        ...prev,
        active: false,
        step: 'idle',
        progress: 0,
        importedTracks: []
      }));
    }, 1500);
  };

  const cancelImport = async () => {
    const savedJobId = localStorage.getItem('activeImportJobId');
    if (savedJobId) {
      try {
        await fetch(`/api/playlists/cancel-import/${savedJobId}`, { method: 'POST' });
      } catch(e) {}
      localStorage.removeItem('activeImportJobId');
    }
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setImportStatus(prev => ({ ...prev, active: false, step: 'idle' }));
  };

  // --- Real-Time Cross-Play System ---
  const socketRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const [activePlaybackDeviceId, setActivePlaybackDeviceId] = useState(() => {
    const saved = localStorage.getItem('aura_active_device');
    if (saved && (saved.startsWith('pc_') || saved.startsWith('mobile_'))) {
      return saved;
    }
    return sessionId;
  });

  const [crossPlayEnabled, setCrossPlayEnabled] = useState(
    localStorage.getItem('aura_crossplay_enabled') !== 'false'
  );
  const crossPlayEnabledRef = useRef(crossPlayEnabled);
  useEffect(() => { crossPlayEnabledRef.current = crossPlayEnabled; }, [crossPlayEnabled]);
  useEffect(() => { localStorage.setItem('aura_crossplay_enabled', crossPlayEnabled); }, [crossPlayEnabled]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const partyRoomCodeRef = useRef(partyRoomCode);
  useEffect(() => { partyRoomCodeRef.current = partyRoomCode; }, [partyRoomCode]);

  const trackPlayStartRef = useRef(null);
  const trackIdRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aura_active_device', activePlaybackDeviceId);
  }, [activePlaybackDeviceId]);

  useEffect(() => {
    const isNativeApp = !!(window.Capacitor || window.navigator.userAgent.includes("Capacitor"));
    let socketUrl = undefined;
    if (isNativeApp) {
      socketUrl = localStorage.getItem('sonora_server_url') || window.NATIVE_SERVER_URL || "https://rippling-division-jokingly.ngrok-free.dev";
    } else {
      socketUrl = window.location.origin;
    }
    socketRef.current = io(socketUrl, {
      transports: ['polling', 'websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

     socketRef.current.on('connect', () => {
       console.log('Socket connected successfully, rejoining room...');
       fetch('/api/debug/log', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: 'Socket connected successfully', deviceId: sessionId })
       }).catch(() => {});
       const activeUser = userRef.current;
       const activePartyRoom = partyRoomCodeRef.current;
       const destRoom = activePartyRoom ? `party_room_${activePartyRoom}` : (activeUser?.uid || null);
       if (destRoom) {
         socketRef.current.emit('join', destRoom);
         console.log(`Socket automatically rejoined room: ${destRoom}`);
       }
     });

     socketRef.current.on('connect_error', (err) => {
       console.error('Socket connection error:', err);
       fetch('/api/debug/log', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: 'Socket connection error', deviceId: sessionId, error: err.message || String(err) })
       }).catch(() => {});
     });

     socketRef.current.on('disconnect', (reason) => {
       console.log('Socket disconnected:', reason);
       fetch('/api/debug/log', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: `Socket disconnected: ${reason}`, deviceId: sessionId })
       }).catch(() => {});
     });

    socketRef.current.on('sync_playback', (data) => {
      if (!crossPlayEnabledRef.current || data.senderDeviceId === sessionId) return;

      if (data.action === 'STATE_UPDATE') {
        isRemoteUpdateRef.current = true; // Prevent infinite broadcast loops
        if (data.queue) setQueue(data.queue);
        if (data.currentTrackIndex !== undefined) setCurrentTrackIndex(data.currentTrackIndex);
        if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
        if (data.activePlaybackDeviceId !== undefined) setActivePlaybackDeviceId(data.activePlaybackDeviceId);
        
        // Reset flag after state has time to apply
        setTimeout(() => { isRemoteUpdateRef.current = false; }, 500);
      } else if (data.action === 'PROGRESS_UPDATE') {
        window.dispatchEvent(new CustomEvent('remote_progress_update', { 
          detail: { progress: data.progress, duration: data.duration } 
        }));
      } else if (data.action === 'TV_UPDATE') {
        if (data.tvStream !== undefined) setTvStream(data.tvStream);
        if (data.tvBeatAmbient !== undefined) setTvBeatAmbient(data.tvBeatAmbient);
        if (data.tvSandboxEnabled !== undefined) setTvSandboxEnabled(data.tvSandboxEnabled);
      }
    });

    socketRef.current.on('settings_update', () => {
      console.log('⚡ Received site settings update broadcast');
      refreshSettings();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (partyRoomCode) {
      socket.emit('join_party_room', partyRoomCode);
      console.log(`Socket joined party room: ${partyRoomCode}`);
    }

    if (user?.uid) {
      socket.emit('join', user.uid);
      console.log(`Socket joined user room: ${user.uid}`);
    }

    return () => {
      if (socket && partyRoomCode) {
        socket.emit('leave_party_room', partyRoomCode);
      }
    };
  }, [user, partyRoomCode]);

  const broadcastPlaybackState = (newIsPlaying = isPlaying, newIndex = currentTrackIndex, newQueue = queue, newActiveDevice = activePlaybackDeviceId) => {
    if (!socketRef.current || isRemoteUpdateRef.current || !crossPlayEnabled) return;
    const destRoom = partyRoomCode ? `party_room_${partyRoomCode}` : (user ? user.uid : null);
    if (!destRoom) return;
    socketRef.current.emit('sync_playback', {
      userId: destRoom,
      senderDeviceId: sessionId,
      action: 'STATE_UPDATE',
      queue: newQueue,
      currentTrackIndex: newIndex,
      isPlaying: newIsPlaying,
      activePlaybackDeviceId: newActiveDevice
    });
  };

  const broadcastProgress = (progressTime, duration) => {
    if (!socketRef.current || !crossPlayEnabled) return;
    if (activePlaybackDeviceId !== sessionId) return;
    const destRoom = partyRoomCode ? `party_room_${partyRoomCode}` : (user ? user.uid : null);
    if (!destRoom) return;
    socketRef.current.emit('sync_playback', {
      userId: destRoom,
      senderDeviceId: sessionId,
      action: 'PROGRESS_UPDATE',
      progress: progressTime,
      duration: duration
    });
  };

  const broadcastTvStream = (newTvStream, newTvBeatAmbient = tvBeatAmbient, newTvSandboxEnabled = tvSandboxEnabled) => {
    if (!socketRef.current || !crossPlayEnabled) return;
    const destRoom = partyRoomCode ? `party_room_${partyRoomCode}` : (user ? user.uid : null);
    if (!destRoom) return;
    socketRef.current.emit('sync_playback', {
      userId: destRoom,
      senderDeviceId: sessionId,
      action: 'TV_UPDATE',
      tvStream: newTvStream,
      tvBeatAmbient: newTvBeatAmbient,
      tvSandboxEnabled: newTvSandboxEnabled
    });
  };

  const switchActiveDevice = (deviceId) => {
    setActivePlaybackDeviceId(deviceId);
    broadcastPlaybackState(isPlaying, currentTrackIndex, queue, deviceId);
  };

  // Central State Watcher for Cross-Play
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isRemoteUpdateRef.current) {
      const timer = setTimeout(() => {
        broadcastPlaybackState(isPlaying, currentTrackIndex, queue, activePlaybackDeviceId);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [queue, currentTrackIndex, isPlaying, activePlaybackDeviceId]);
  // ------------------------------------

  const openTrackMenu = (track, x, y) => {
    setTrackMenu({ track, x, y });
  };

  const closeTrackMenu = () => {
    setTrackMenu(null);
  };

  const playNext = (track) => {
    if (queue.length === 0) {
      setQueue([track]);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      broadcastPlaybackState(true, 0, [track]);
    } else {
      const newQueue = [...queue];
      newQueue.splice(currentTrackIndex + 1, 0, track);
      setQueue(newQueue);
      broadcastPlaybackState(isPlaying, currentTrackIndex, newQueue);
    }
  };

  const addToQueue = (track) => {
    if (queue.length === 0) {
      setQueue([track]);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      broadcastPlaybackState(true, 0, [track]);
    } else {
      setQueue([...queue, track]);
      broadcastPlaybackState(isPlaying, currentTrackIndex, [...queue, track]);
    }
  };

  const toggleLikeGlobal = async (track, newIsLiked) => {
    if (!user || user.isAnonymous) {
      showAlert("Please sign in first to like songs!");
      return track.isLiked;
    }
    try {
      let trackId = track.id;
      let actualTrack = track;
      
      if (track.source === 'global' || track.source === 'youtube') {
        const syncRes = await fetch('/api/tracks/sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || ''
          },
          body: JSON.stringify(track)
        });
        const data = await syncRes.json();
        trackId = data.id;
        actualTrack = { ...track, id: data.id, source: 'local' };
      }

      await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({ isLiked: newIsLiked })
      });
      
      setQueue(prevQueue => 
        prevQueue.map(t => (t.id === track.id || t.id === trackId) ? { ...t, isLiked: newIsLiked, id: trackId, source: actualTrack.source } : t)
      );
      return newIsLiked;
    } catch (err) {
      console.error("Global like error:", err);
      return !newIsLiked;
    }
  };

  const currentTrack = queue[currentTrackIndex] || {};

  // Persistence
  useEffect(() => {
    localStorage.setItem('aura_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('aura_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('aura_track_index', currentTrackIndex.toString());
  }, [currentTrackIndex]);

  useEffect(() => {
    if (currentTrack && currentTrack.id) {
      try {
        const historyJson = localStorage.getItem('aura_history');
        let history = historyJson ? JSON.parse(historyJson) : [];
        history = history.filter(t => t.id !== currentTrack.id);
        history.unshift(currentTrack);
        if (history.length > 20) history = history.slice(0, 20);
        localStorage.setItem('aura_history', JSON.stringify(history));

        // Track song play event in Google Analytics
        trackEvent('play_song', {
          song_id: currentTrack.id,
          song_title: currentTrack.title,
          song_artist: currentTrack.artist,
          song_source: currentTrack.source || 'local'
        });

        const userUid = user?.uid || 'guest';

        // Increment local view count in database
        if (currentTrack.id) {
          fetch(`/api/tracks/${currentTrack.id}/view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userUid
            }
          }).catch(err => console.error("Error logging track play view:", err));

          // Track play trigger in recommendation engine
          fetch('/api/recommendations/track-playback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userUid
            },
            body: JSON.stringify({
              trackId: currentTrack.id,
              eventType: 'play',
              playlistSource: currentTrack.source || 'local'
            })
          }).catch(() => {});
        }

        // Compute skip/complete for the previous track
        const prevTrackId = trackIdRef.current;
        const prevStart = trackPlayStartRef.current;
        if (prevTrackId && prevTrackId !== currentTrack.id) {
          const listenTime = (Date.now() - prevStart) / 1000;
          const wasSkipped = listenTime < 20;
          fetch('/api/recommendations/track-playback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userUid
            },
            body: JSON.stringify({
              trackId: prevTrackId,
              eventType: wasSkipped ? 'skip' : 'completed',
              duration: listenTime,
              device: 'Web',
              playlistSource: 'local'
            })
          }).catch(() => {});
        }

        // Set tracking values
        trackIdRef.current = currentTrack.id;
        trackPlayStartRef.current = Date.now();

      } catch (e) {
        console.error("Failed to save history", e);
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack || !currentTrack.id) return;
    const userUid = user?.uid || 'guest';
    fetch('/api/recommendations/track-playback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userUid
      },
      body: JSON.stringify({
        trackId: currentTrack.id,
        eventType: isPlaying ? 'resume' : 'pause',
        device: 'Web'
      })
    }).catch(() => {});
  }, [isPlaying]);

  // On-the-fly resolution of iTunes global tracks to YouTube streams
  useEffect(() => {
    if (queue.length === 0 || currentTrackIndex === null || currentTrackIndex === undefined) return;

    // Helper function to resolve a track at a specific queue index
    const resolveIndex = async (index) => {
      const track = queue[index];
      if (!track) return;
      
      const isPreviewUrl = track.audioUrl && (track.audioUrl.includes('itunes.apple.com') || track.audioUrl.includes('mzstatic.com'));
      const isYouTubeUrl = track.audioUrl && (track.audioUrl.includes('youtube.com') || track.audioUrl.includes('youtu.be'));
      const isEmptyUrl = !track.audioUrl;
      
      if (!isPreviewUrl && !isEmptyUrl && track.source !== 'global') return;
      if (isYouTubeUrl) return;

      const trackId = track.id;
      if (resolvingIdsRef.current.has(trackId)) return;
      
      resolvingIdsRef.current.add(trackId);
      console.log(`[Resolve] Starting YouTube resolution for: "${track.title}" by ${track.artist}`);

      try {
        const res = await fetch(`/api/tracks/resolve?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.youtubeUrl) {
            console.log(`[Resolve] Successfully resolved "${track.title}" to: ${data.youtubeUrl}`);
            setQueue(prev => {
              const copy = [...prev];
              if (copy[index] && copy[index].id === trackId) {
                copy[index] = {
                  ...copy[index],
                  audioUrl: data.youtubeUrl,
                  youtubeId: data.id,
                  lyrics: data.lyrics || copy[index].lyrics,
                  genre: data.genre || copy[index].genre
                };

                // Force a sync update broadcast to other cross-play devices
                if (socketRef.current && crossPlayEnabledRef.current) {
                  const destRoom = partyRoomCodeRef.current ? `party_room_${partyRoomCodeRef.current}` : (userRef.current ? userRef.current.uid : null);
                  if (destRoom) {
                    console.log(`[Playback Sync] Broadcasting resolved track: "${copy[index].title}"`);
                    socketRef.current.emit('sync_playback', {
                      userId: destRoom,
                      senderDeviceId: sessionId,
                      action: 'STATE_UPDATE',
                      queue: copy,
                      currentTrackIndex: index,
                      isPlaying: isPlaying,
                      activePlaybackDeviceId: activePlaybackDeviceId
                    });
                  }
                }
              }
              return copy;
            });
            resolvingIdsRef.current.delete(trackId);
            return;
          }
        }
      } catch (err) {
        console.error(`[Resolve] Failed to resolve track "${track.title}" at index ${index}:`, err);
      }
      
      resolvingIdsRef.current.delete(trackId);
    };

    // 1. Resolve current track immediately
    resolveIndex(currentTrackIndex);

    // 2. Resolve the next up to 5 tracks in the queue with staggered delays
    const windowSize = Math.min(5, queue.length - 1);
    const timers = [];

    for (let i = 1; i <= windowSize; i++) {
      const idx = (currentTrackIndex + i) % queue.length;
      const track = queue[idx];
      if (track && track.audioUrl) {
        const isPreview = track.audioUrl.includes('itunes.apple.com') || track.audioUrl.includes('mzstatic.com');
        const isYouTube = track.audioUrl.includes('youtube.com') || track.audioUrl.includes('youtu.be');
        if ((isPreview || track.source === 'global') && !isYouTube) {
          // Stagger the resolutions by 1.5 seconds per track
          const timer = setTimeout(() => {
            resolveIndex(idx);
          }, i * 1500);
          timers.push(timer);
        }
      }
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [currentTrackIndex, queue, isPlaying, activePlaybackDeviceId]);

  // Infinite Queue Autoplay Recommendations
  const fetchingRecommendationsRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('aura_autoplay_enabled', autoplayEnabled.toString());
  }, [autoplayEnabled]);

  useEffect(() => {
    if (!autoplayEnabled || queue.length === 0 || currentTrackIndex === null || currentTrackIndex === undefined) return;

    // Trigger when we are within 2 songs of the end of the queue
    const isNearEnd = currentTrackIndex >= queue.length - 2;
    if (!isNearEnd) return;

    // Use the last track in the queue as the seed track to fetch recommendations
    const seedTrack = queue[queue.length - 1];
    if (!seedTrack || !seedTrack.title) return;

    // Prevent multiple concurrent fetch operations
    if (fetchingRecommendationsRef.current) return;

    const fetchRecommendations = async () => {
      fetchingRecommendationsRef.current = true;
      console.log(`[Autoplay] Fetching recommendations based on: "${seedTrack.title}" by ${seedTrack.artist}`);
      try {
        const geminiKey = localStorage.getItem("aura_gemini_api_key") || "";
        const groqKey = localStorage.getItem("aura_groq_api_key") || "";
        const res = await fetch(`/api/tracks/recommend?title=${encodeURIComponent(seedTrack.title)}&artist=${encodeURIComponent(seedTrack.artist || '')}&genre=${encodeURIComponent(seedTrack.genre || '')}`, {
          headers: {
            'x-gemini-key': geminiKey,
            'x-groq-key': groqKey,
            'x-user-id': user?.uid || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.recommendations && data.recommendations.length > 0) {
            // Filter out tracks that are already in the queue to avoid duplicates
            const existingIds = new Set(queue.map(t => t.id));
            const newTracks = data.recommendations.filter(t => !existingIds.has(t.id));

            if (newTracks.length > 0) {
              console.log(`[Autoplay] Appending ${newTracks.length} recommended tracks to queue.`);
              setQueue(prev => [...prev, ...newTracks]);
            }
          }
        }
      } catch (err) {
        console.error("[Autoplay] Failed to fetch queue recommendations:", err);
      }
      fetchingRecommendationsRef.current = false;
    };

    fetchRecommendations();
  }, [currentTrackIndex, queue, autoplayEnabled]);

  // Background pre-fetching for the next track in the queue to achieve near 0-delay playback transitions
  useEffect(() => {
    if (queue.length <= 1 || currentTrackIndex === null || currentTrackIndex === undefined) return;
    
    const nextIndex = (currentTrackIndex + 1) % queue.length;
    const nextTrack = queue[nextIndex];
    if (!nextTrack || !nextTrack.audioUrl) return;
    
    const isYouTube = nextTrack.audioUrl.includes('youtube.com') || nextTrack.audioUrl.includes('youtu.be');
    if (!isYouTube) return;

    // Trigger prefetch after listening to the current song for 5 seconds
    const timer = setTimeout(() => {
      console.log(`[Prefetch] Initiating background prefetch for next track: ${nextTrack.title}`);
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Contact the stream endpoint and abort after 2 seconds. 
      // This is enough time for the backend to start yt-dlp and begin caching without loading data to client.
      fetch(`/api/yt/stream?url=${encodeURIComponent(nextTrack.audioUrl)}`, { signal })
        .catch(() => {
          // Silence abort/cancellation errors
        });

      setTimeout(() => {
        controller.abort();
      }, 2000);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentTrackIndex, queue]);

  useEffect(() => {
    localStorage.setItem('aura_ambient_enabled', ambientEffectsEnabled);
  }, [ambientEffectsEnabled]);

  useEffect(() => {
    localStorage.setItem('aura_ambient_mode', ambientMode);
  }, [ambientMode]);

  useEffect(() => {
    localStorage.setItem('aura_ambient_settings', JSON.stringify(ambientSettings));
  }, [ambientSettings]);

  useEffect(() => {
    localStorage.setItem('aura_custom_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  useEffect(() => {
    localStorage.setItem('aura_particles_mode', particlesMode);
  }, [particlesMode]);

  // Spotify Smart Bridge lifecycle
  useEffect(() => {
    // 1. Callback for incoming track changes from Spotify app
    const onSpotifyTrackChange = async (spotifyState) => {
      if (!spotifyState || !spotifyState.title) return;

      try {
        console.log(`[Spotify Bridge] 🎵 Syncing track from Spotify: "${spotifyState.title}" by ${spotifyState.artist}`);
        const res = await fetch(`/api/tracks/resolve?title=${encodeURIComponent(spotifyState.title)}&artist=${encodeURIComponent(spotifyState.artist)}`);
        let youtubeUrl = null;
        let lyrics = null;
        let genre = null;
        if (res.ok) {
          const data = await res.json();
          youtubeUrl = data.youtubeUrl;
          lyrics = data.lyrics;
          genre = data.genre;
        }

        const newTrack = {
          id: 'sp_' + spotifyState.id,
          title: spotifyState.title,
          artist: spotifyState.artist,
          album: spotifyState.album,
          coverUrl: spotifyState.cover,
          audioUrl: youtubeUrl || '',
          duration: Math.floor((spotifyState.durationMs || 0) / 1000),
          source: 'spotify_bridge',
          spotifyUri: spotifyState.spotifyUri,
          lyrics: lyrics || null,
          genre: genre || null
        };

        setQueue([newTrack]);
        setCurrentTrackIndex(0);
        setIsPlaying(spotifyState.isPlaying !== false);
      } catch (err) {
        console.error('[Spotify Bridge] Track resolution failed:', err);
      }
    };

    const onSpotifyStateChange = (st) => {
      if (st && typeof st.isPlaying === 'boolean') {
        setIsPlaying(st.isPlaying);
      }
    };

    // Register callbacks immediately
    registerSpotifyCallbacks(onSpotifyTrackChange, onSpotifyStateChange);

    // 2. Check for OAuth token redirect
    handleSpotifyAuthRedirect();

    // 3. Subscribe to bridge state changes
    const unsub = subscribeSpotifyBridge((st) => {
      setSpotifyBridgeState({ ...st });
    });

    if (isSpotifyBridgeEnabled()) {
      startSpotifyPolling(onSpotifyTrackChange, onSpotifyStateChange);
    }

    return () => {
      unsub();
      stopSpotifyPolling();
    };
  }, []);

  const saveAmbientPreset = async (name) => {
    const newPreset = {
      id: 'custom_' + Date.now().toString(),
      name,
      settings: { ...ambientSettings }
    };
    setCustomPresets(prev => [...prev, newPreset]);

    if (user?.uid) {
      try {
        await fetch('/api/presets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid
          },
          body: JSON.stringify(newPreset)
        });
      } catch (err) {
        console.error("Failed to sync preset:", err);
      }
    }
  };

  const deleteAmbientPreset = async (id) => {
    setCustomPresets(prev => prev.filter(p => p.id !== id));

    if (user?.uid) {
      try {
        await fetch(`/api/presets/${id}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': user.uid
          }
        });
      } catch (err) {
        console.error("Failed to delete preset from sync:", err);
      }
    }
  };

  // Sync presets on login/switch user
  useEffect(() => {
    const syncPresets = async () => {
      if (user?.uid) {
        try {
          const res = await fetch('/api/presets', {
            headers: {
              'x-user-id': user.uid
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data)) {
              setCustomPresets(data);
            }
          }
        } catch (err) {
          console.error("Failed to fetch custom presets:", err);
        }
      }
    };
    syncPresets();
  }, [user?.uid]);



  async function refreshSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  useEffect(() => {
    refreshSettings();
    const interval = setInterval(refreshSettings, 15000);
    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    if (queue.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const playContext = (tracks, startIndex) => {
    setQueue(tracks);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
  };

  const playTrack = (track) => {
    playContext([track], 0);
  };

  const toggleLike = async () => {
    if (!user || user.isAnonymous) {
      showAlert("Please sign in first to like songs!");
      return;
    }
    if (!currentTrack.id) return;
    try {
      let trackId = currentTrack.id;
      let actualTrack = currentTrack;
      if (currentTrack.source === 'global' || currentTrack.source === 'youtube') {
        const syncRes = await fetch('/api/tracks/sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || ''
          },
          body: JSON.stringify(currentTrack)
        });
        const data = await syncRes.json();
        trackId = data.id;
        actualTrack = { ...currentTrack, id: data.id, source: 'local' };
      }
      const newIsLiked = !currentTrack.isLiked;
      await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({ isLiked: newIsLiked })
      });

      // Track engagement in recommendation engine
      fetch('/api/recommendations/track-engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({
          targetId: trackId.toString(),
          actionType: newIsLiked ? 'like' : 'unlike'
        })
      }).catch(() => {});

      const updatedQueue = [...queue];
      updatedQueue[currentTrackIndex] = { ...actualTrack, isLiked: newIsLiked };
      setQueue(updatedQueue);
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const skipNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % queue.length);
  };

  const skipPrev = () => {
    setCurrentTrackIndex((prev) => (prev === 0 ? queue.length - 1 : prev - 1));
  };

  const shufflePlay = (tracks) => {
    if (!tracks || tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
  };

  const shuffleQueue = () => {
    if (queue.length <= 1) return;
    const before = queue.slice(0, currentTrackIndex + 1); // current + already played
    const after = queue.slice(currentTrackIndex + 1);      // remaining upcoming
    // Fisher-Yates shuffle on 'after'
    for (let i = after.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [after[i], after[j]] = [after[j], after[i]];
    }
    const newQueue = [...before, ...after];
    setQueue(newQueue);
    broadcastPlaybackState(isPlaying, currentTrackIndex, newQueue);
  };

  const playNextMultiple = (tracks) => {
    if (!tracks || tracks.length === 0) return;
    if (queue.length === 0) {
      setQueue(tracks);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    } else {
      const newQueue = [...queue];
      newQueue.splice(currentTrackIndex + 1, 0, ...tracks);
      setQueue(newQueue);
    }
  };

  const addMultipleToQueue = (tracks) => {
    if (!tracks || tracks.length === 0) return;
    if (queue.length === 0) {
      setQueue(tracks);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    } else {
      setQueue([...queue, ...tracks]);
    }
  };

  const [maintenanceGraceActive, setMaintenanceGraceActive] = useState(false);

  useEffect(() => {
    if (siteSettings?.maintenance_mode) {
      if (isPlaying && currentTrack && currentTrack.id) {
        if (!maintenanceGraceActive) {
          setMaintenanceGraceActive(true);
          console.log("⚠️ Maintenance mode active. Entering playback grace period.");
        }
      } else {
        setMaintenanceGraceActive(false);
      }
    } else {
      setMaintenanceGraceActive(false);
    }
  }, [siteSettings?.maintenance_mode, isPlaying, currentTrack?.id]);

  const value = {
    queue,
    setQueue,
    currentTrackIndex,
    setCurrentTrackIndex,
    partyRoomCode,
    setPartyRoomCode,
    currentTrack,
    isPlaying,
    setIsPlaying,
    togglePlay,
    toggleLike,
    playContext,
    playTrack,
    addMultipleToQueue,
    shufflePlay,
    playNextMultiple,
    addToQueue,
    playNext,
    shuffleQueue,
    toggleLikeGlobal,
    skipNext,
    skipPrev,
    broadcastPlaybackState,
    broadcastProgress,
    activePlaybackDeviceId,
    switchActiveDevice,
    sessionId,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    sendOtp,
    verifyOtp,
    checkEmailVerificationStatus,
    resendVerificationEmail,
    continueAsGuest,
    logout,
    deleteAccount,
    sessions,
    isExpanded,
    setIsExpanded,
    ambientEffectsEnabled,
    setAmbientEffectsEnabled: setAmbientEffectsEnabledWrapper,
    backgroundAmbiancePlay,
    setBackgroundAmbiancePlay,
    theme,
    setTheme,
    particlesMode,
    setParticlesMode,
    ambientMode,
    setAmbientMode,
    crossPlayEnabled,
    setCrossPlayEnabled,
    ambientSettings,
    setAmbientSettings,
    customPresets,
    saveAmbientPreset,
    deleteAmbientPreset,
    dialogConfig: null,
    showDeviceNicknameModal,
    setShowDeviceNicknameModal,
    pendingUser,
    syncDeviceSession,
    refreshSessions,
    terminateSession,
    renameSession,
    isBanned,
    isSuspended,
    suspendedUntil,
    suspensionReason,
    customUserId,
    showAlert,
    showConfirm,
    siteSettings,
    setSiteSettings,
    trackMenu,
    setTrackMenu,
    openTrackMenu,
    closeTrackMenu,
    activeArtistName,
    artistProfileOpen,
    openArtistProfile,
    closeArtistProfile,
    crossfadeDuration,
    setCrossfadeDuration,
    morphism,
    setMorphism,
    customColors,
    setCustomColors,
    sleepTimerSecondsLeft,
    setSleepTimerSecondsLeft,
    sleepTimerActive,
    setSleepTimerActive,
    initialSleepDuration,
    setInitialSleepDuration,
    tvStream,
    setTvStream,
    tvBeatAmbient,
    setTvBeatAmbient,
    tvSandboxEnabled,
    setTvSandboxEnabled,
    stereoSeparationEnabled,
    setStereoSeparationEnabled,
    broadcastTvStream,
    spotifyBridgeState,
    startSpotifyAuth,
    setSpotifyToken,
    setSpotifyBridgeEnabled,
    spotifyRemotePlay,
    spotifyRemotePause,
    spotifyRemoteNext,
    spotifyRemotePrevious,
    spotifyRemoteSeek,
    syncNow,
    getSpotifyDiagnostics,
    enableDateTimeAlert,
    setEnableDateTimeAlert,
    enableLiveMatchScoreAlert,
    setEnableLiveMatchScoreAlert,
    liveMatchSport,
    setLiveMatchSport,
    importStatus,
    startYoutubeImport,
    executeLyricsFetch,
    skipLyricsImport,
    cancelImport,
    autoplayEnabled,
    setAutoplayEnabled,
    maintenanceGraceActive,
    setMaintenanceGraceActive,
    user,
    isAuthLoading,
    socketRef
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
