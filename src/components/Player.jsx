import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Youtube, BookmarkPlus, ChevronDown, ChevronRight, Music, Disc, Download, Flag, Heart, Info, Laptop, ListMusic, ListPlus, MonitorSpeaker, MoreHorizontal, Pause, Play, Plus, Radio, Repeat2, Share2, Smartphone, Shuffle, SkipBack, SkipForward, User, Volume2, VolumeX, Mic2, Timer, Users, Maximize2, Sparkles, X, Tv, Infinity, RotateCcw, Headphones, Eye, EyeOff } from "lucide-react";
import { IconUser } from "@tabler/icons-react";
import { AlbumArt } from "./AlbumArt";
import { useNavigate } from "react-router-dom";

import { WaveformProgress } from "./WaveformProgress";
import { ensureAudioAnalyser, resumeAudioContext, setBeatPlaying, extractAndSetColors, startBeatEngine, getBeatState, updateAmbientSettings, setAmbientColors, resetBeatEngine } from "./AudioVisualizer";
import { 
  setSpatialAudioEnabled, 
  setSpatialAudioMode, 
  setSpatialAudioWidth, 
  getSpatialAudioState,
  subscribeSpatialAudio,
  SPATIAL_PRESETS 
} from "../utils/spatialAudio";
import { copyToClipboard } from "../utils/clipboard";
import { usePlayer, DEFAULT_DEMO_TRACKS } from "../context/PlayerContext";
import { MarqueeText } from "./MarqueeText";
import { InteractiveParticles } from "./InteractiveParticles";
import { WebGLAmbientBackground } from "./WebGLAmbientBackground";
import { SonoraLoader } from "./SonoraLoader";
import { WorldCupScoreIsland } from "./WorldCupScoreIsland";
import { MaintenanceTimerPill } from "./MaintenanceTimerPill";
import { getSyncedLyrics } from "../utils/lyrics";
import { generateAiSyncedLyrics, RealtimeLiveTranscriber } from "../utils/aiLyrics";

import { SleepTimerModal } from "./player/SleepTimerModal";
import { ListeningPartyModal } from "./player/ListeningPartyModal";
import { QueuePanel } from "./player/QueuePanel";
import { NowPlayingQueue } from "./player/NowPlayingQueue";
import { ServerUrlModal } from "./player/ServerUrlModal";
import LyricShareModal from "./player/LyricShareModal";
import { YoutubeFetchModal } from "./YoutubeFetchModal";

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function TickerSegment({ value }) {
  const safeValue = value !== undefined && value !== null ? value : "";
  const [displayValue, setDisplayValue] = useState(safeValue);
  const [nextValue, setNextValue] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (safeValue !== displayValue) {
      setNextValue(safeValue);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayValue(safeValue);
        setNextValue(null);
        setIsTransitioning(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [safeValue, displayValue]);

  return (
    <span 
      className="relative inline-flex flex-col overflow-hidden h-[1.2em] leading-none select-none"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
      }}
    >
      <span
        className={`flex flex-col ${isTransitioning ? 'transition-transform duration-[350ms] ease-in-out' : ''}`}
        style={{
          transform: isTransitioning ? 'translateY(-50%)' : 'translateY(0)',
        }}
      >
        <span className="flex items-center justify-center py-[2px]">{displayValue}</span>
        <span className="flex items-center justify-center py-[2px]">{nextValue || displayValue}</span>
      </span>
    </span>
  );
}

const FloatingLyrics = ({ text, onClick }) => {
  const [displayState, setDisplayState] = useState({
    current: text,
    prev: null,
    key: 0
  });

  useEffect(() => {
    if (text !== displayState.current) {
      setDisplayState(prev => ({
        prev: prev.current,
        current: text,
        key: prev.key + 1
      }));
    }
  }, [text]);

  return (
    <div 
      onClick={onClick}
      className="flex justify-center items-center text-center px-4 w-full z-30 relative select-none cursor-pointer pointer-events-auto lyric-line-wrapper py-1.5 hover:opacity-80 transition-opacity active:scale-[0.98] duration-200" 
      style={{ height: '100%' }}
    >
      {displayState.prev && (
        <p 
          key={`prev-${displayState.key}`}
          className="absolute left-0 right-0 px-4 text-base sm:text-lg font-bold tracking-wide leading-relaxed lyric-line-text animate-lyric-exit text-center"
        >
          {displayState.prev}
        </p>
      )}
      <p 
        key={`curr-${displayState.key}`}
        className="absolute left-0 right-0 px-4 text-base sm:text-lg font-bold tracking-wide leading-relaxed lyric-line-text animate-lyric-enter text-center"
      >
        {displayState.current}
      </p>
    </div>
  );
};

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const resolveAudioUrl = (url) => {
  if (!url) return "";
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isNativeApp = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
  
  let finalUrl = url;
  if (isYouTube) {
    finalUrl = `/api/yt/stream?url=${encodeURIComponent(url)}`;
  } else if (url.startsWith('http') && (!window.NATIVE_SERVER_URL || !url.includes(window.NATIVE_SERVER_URL)) && !url.includes('localhost') && !url.includes('capacitor://')) {
    if (isNativeApp) {
      finalUrl = `/api/proxy/stream?url=${encodeURIComponent(url)}`;
    }
  }
  if (isNativeApp && finalUrl.startsWith('/')) {
    const serverUrl = window.NATIVE_SERVER_URL;
    return `${serverUrl}${finalUrl}`;
  }
  return finalUrl;
};

const THEME_COLORS = {
  midnight: { r: 195, g: 208, b: 184 },
  abyss:    { r: 255, g: 255, b: 255 },
  aura:     { r: 167, g: 139, b: 250 },
  forest:   { r: 74,  g: 222, b: 128 },
  sunset:   { r: 251, g: 146, b: 60  },
};

export function Player() {
  const {
    queue: playlist,
    setQueue: setPlaylist,
    currentTrackIndex,
    setCurrentTrackIndex,
    currentTrack,
    isPlaying,
    setIsPlaying,
    toggleLikeGlobal,
    openTrackMenu,
    ambientEffectsEnabled,
    theme,
    particlesMode,
    ambientSettings,
    user,
    isExpanded,
    setIsExpanded,
    spotifyPlayer,
    spotifyDeviceId,
    spotifyPlaybackState,
    playSpotifyTrack,
    spotifyBridgeState,
    startSpotifyAuth,
    setSpotifyToken,
    setSpotifyBridgeEnabled,
    spotifyRemotePlay,
    spotifyRemotePause,
    spotifyRemoteNext,
    spotifyRemotePrevious,
    spotifyRemoteSeek,
    addToQueue,
    shuffleQueue,
    broadcastPlaybackState,
    broadcastProgress,
    activePlaybackDeviceId,
    switchActiveDevice,
    sessionId,
    sessions,
    refreshSessions,
    crossPlayEnabled,
    partyRoomCode: contextPartyRoomCode,
    setPartyRoomCode: setContextPartyRoomCode,
    crossfadeDuration,
    morphism,
    sleepTimerSecondsLeft,
    setSleepTimerSecondsLeft,
    sleepTimerActive,
    setSleepTimerActive,
    initialSleepDuration,
    setInitialSleepDuration,
    showAlert,
    tvStream,
    setTvStream,
    tvBeatAmbient,
    setTvBeatAmbient,
    broadcastTvStream,
    siteSettings,
    ambientMode,
    autoplayEnabled,
    setAutoplayEnabled,
    maintenanceGraceActive,
    setMaintenanceGraceActive,
    importStatus
  } = usePlayer();

  const isLocalActive = !crossPlayEnabled || activePlaybackDeviceId === sessionId || !!contextPartyRoomCode;

  const navigate = useNavigate();

  const isSpotifyTrack = !!currentTrack.uri;

  // Compute next track URL for browser preloading
  const nextTrackIndex = (playlist.length > 0 && currentTrackIndex !== null && currentTrackIndex !== undefined)
    ? (currentTrackIndex + 1) % playlist.length
    : -1;
  const nextTrack = nextTrackIndex >= 0 ? playlist[nextTrackIndex] : null;
  let nextTrackUrl = "";
  if (nextTrack && nextTrack.audioUrl) {
    nextTrackUrl = resolveAudioUrl(nextTrack.audioUrl);
  }

  const [loading, setLoading] = useState(true);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showServerUrlModal, setShowServerUrlModal] = useState(false);
  // progressRef holds the real-time audio position; updated every RAF frame (no re-renders)
  const progressRef = useRef((() => {
    const saved = localStorage.getItem('aura_progress');
    const parsed = saved !== null ? parseFloat(saved) : 0;
    return isNaN(parsed) ? 0 : parsed;
  })());
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('aura_progress');
    const parsed = saved !== null ? parseFloat(saved) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });
  const [duration, setDuration] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [volume, setVolume] = useState(0.58);
  const [isLiked, setIsLiked] = useState(false);
  const [shuffleFeedbackActive, setShuffleFeedbackActive] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const [repeatCount, setRepeatCount] = useState(0);
  const [isRepeatMenuOpen, setIsRepeatMenuOpen] = useState(false);
  const repeatTimer = useRef(null);
  
  const isDraggingProgressRef = useRef(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [isCreatingPlaylistInPlayer, setIsCreatingPlaylistInPlayer] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [waveformColors, setWaveformColors] = useState(['200 210 220', '180 195 215', '165 180 210']);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isLyricsControllerOpen, setIsLyricsControllerOpen] = useState(false);
  const lyricsControllerTimeoutRef = useRef(null);
  const [videoFitMode, setVideoFitMode] = useState(() => {
    return localStorage.getItem('aura_video_fit_mode') || 'auto';
  });
  const [viewportRatio, setViewportRatio] = useState(window.innerWidth / window.innerHeight);

  const [spatialState, setSpatialState] = useState(() => getSpatialAudioState());
  const [isSpatialMenuOpen, setIsSpatialMenuOpen] = useState(false);

  useEffect(() => {
    return subscribeSpatialAudio((st) => setSpatialState({ ...st }));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportRatio(window.innerWidth / window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('aura_video_fit_mode', videoFitMode);
  }, [videoFitMode]);

  // Synced Lyrics state
  const [showLyrics, setShowLyrics] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const lyricsContainerRef = useRef(null);
  const [onlyLyricsModeActive, setOnlyLyricsModeActive] = useState(false);

  // Synced Lyrics refs for high-frequency RAF timing alignment
  const parsedLyricsRef = useRef([]);
  const currentLyricIndexRef = useRef(-1);
  const showLyricsRef = useRef(false);
  const onlyLyricsModeActiveRef = useRef(false);

  useEffect(() => { parsedLyricsRef.current = parsedLyrics; }, [parsedLyrics]);
  useEffect(() => { currentLyricIndexRef.current = currentLyricIndex; }, [currentLyricIndex]);
  useEffect(() => { showLyricsRef.current = showLyrics; }, [showLyrics]);
  useEffect(() => { onlyLyricsModeActiveRef.current = onlyLyricsModeActive; }, [onlyLyricsModeActive]);

  const controlsCardRef = useRef(null);
  const [controlsHeight, setControlsHeight] = useState(null);

  useEffect(() => {
    if (!controlsCardRef.current) return;
    const updateHeight = () => {
      if (controlsCardRef.current) {
        setControlsHeight(controlsCardRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(controlsCardRef.current);
    return () => ro.disconnect();
  }, [isExpanded, isQueueOpen, isVideoMode, showLyrics]);

  const [showFloatingLyrics, setShowFloatingLyrics] = useState(() => {
    const saved = localStorage.getItem('aura_show_floating_lyrics');
    return saved !== null ? saved === 'true' : true;
  });

  // Pure Ambiance System mode (Hides all UI elements in Now Playing to focus on ambient visuals)
  const [isAmbianceMode, setIsAmbianceMode] = useState(false);
  const [isAmbianceHudVisible, setIsAmbianceHudVisible] = useState(false);

  // Auto-reset Ambiance mode if player is collapsed
  useEffect(() => {
    if (!isExpanded) {
      setIsAmbianceMode(false);
      setIsAmbianceHudVisible(false);
    }
  }, [isExpanded]);

  // Handle Ambiance Mode HUD mouse/touch auto-hide after 3.5s of inactivity
  useEffect(() => {
    if (!isExpanded || !isAmbianceMode) {
      setIsAmbianceHudVisible(false);
      return;
    }

    setIsAmbianceHudVisible(true);
    let timeoutId;

    const prolongHud = () => {
      clearTimeout(timeoutId);
      setIsAmbianceHudVisible(true);
      timeoutId = setTimeout(() => {
        setIsAmbianceHudVisible(false);
      }, 3500);
    };

    timeoutId = setTimeout(() => {
      setIsAmbianceHudVisible(false);
    }, 3500);

    const handlePointerActivity = () => {
      prolongHud();
    };

    const handleBackdropDblClick = (e) => {
      if (!e.target.closest('button, input, a, [role="button"]')) {
        setIsAmbianceMode(false);
      }
    };

    window.addEventListener('mousemove', handlePointerActivity);
    window.addEventListener('touchstart', handlePointerActivity);
    window.addEventListener('dblclick', handleBackdropDblClick);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handlePointerActivity);
      window.removeEventListener('touchstart', handlePointerActivity);
      window.removeEventListener('dblclick', handleBackdropDblClick);
    };
  }, [isExpanded, isAmbianceMode]);

  // Dynamic Lyrics Translation states
  const [translationLang, setTranslationLang] = useState("none");
  const [translatedLyrics, setTranslatedLyrics] = useState([]);

  const handleTranslate = async (langCode) => {
    setTranslationLang(langCode);
    if (langCode === "none") {
      setTranslatedLyrics([]);
      return;
    }
    if (parsedLyrics.length === 0) return;

    try {
      const linesText = parsedLyrics.map(l => l.text).join('\n');
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(linesText)}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) {
          const fullTranslation = data[0].map(seg => seg[0]).join('');
          const translatedLines = fullTranslation.split('\n');
          
          const mapped = parsedLyrics.map((lyric, idx) => ({
            ...lyric,
            text: (translatedLines[idx] || lyric.text).trim()
          }));
          setTranslatedLyrics(mapped);
        }
      }
    } catch (err) {
      console.error("Lyrics translation failed:", err);
    }
  };

  // AI Synced Lyrics Generator & Live Speech Transcription States
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [aiLyricsError, setAiLyricsError] = useState(null);
  const [isLiveLyricsActive, setIsLiveLyricsActive] = useState(false);
  const [liveTranscriptLine, setLiveTranscriptLine] = useState("");
  const liveTranscriberRef = useRef(null);

  const handleGenerateAiLyrics = async () => {
    if (!currentTrack || isGeneratingLyrics) return;
    setIsGeneratingLyrics(true);
    setAiLyricsError(null);
    try {
      const res = await generateAiSyncedLyrics(currentTrack, audioRef.current);
      if (res && res.parsed && res.parsed.length > 0) {
        setParsedLyrics(res.parsed);
        setCurrentLyricIndex(-1);
      } else {
        setAiLyricsError("Could not generate lyrics. Please try again.");
      }
    } catch (err) {
      console.error("[AI Lyrics] Generation error:", err);
      setAiLyricsError(err.message || "Failed to generate AI lyrics");
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleToggleLiveLyrics = () => {
    if (isLiveLyricsActive) {
      liveTranscriberRef.current?.stop();
      setIsLiveLyricsActive(false);
      setLiveTranscriptLine("");
    } else {
      if (!liveTranscriberRef.current) {
        liveTranscriberRef.current = new RealtimeLiveTranscriber((data) => {
          setLiveTranscriptLine(data.text);
          // If we don't have parsed lyrics yet, dynamically create real-time lines
          if (data.isFinal && data.text) {
            const curTime = audioRef.current?.currentTime || 0;
            setParsedLyrics(prev => {
              const updated = [...prev, { time: curTime, text: data.text }];
              return updated.sort((a, b) => a.time - b.time);
            });
          }
        });
      }
      const started = liveTranscriberRef.current.start();
      if (started) {
        setIsLiveLyricsActive(true);
      } else {
        setAiLyricsError("Live Speech Recognition not supported or blocked on this device");
      }
    }
  };

  useEffect(() => {
    return () => {
      liveTranscriberRef.current?.stop();
    };
  }, []);

  // Sleep Timer menu state
  const [isSleepTimerMenuOpen, setIsSleepTimerMenuOpen] = useState(false);
  const [isLyricShareOpen, setIsLyricShareOpen] = useState(false);

  // Expanded Now Playing mini-status bar clock
  const [timeSegments, setTimeSegments] = useState({ hour: "12", minute: "00", second: "00", period: "AM" });
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let h = d.getHours();
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      const hour = String(h).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      const second = String(d.getSeconds()).padStart(2, '0');
      setTimeSegments({ hour, minute, second, period });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sleep timer pill expansion state & collapse helper
  const [isTimerExpanded, setIsTimerExpanded] = useState(false);
  const collapseTimerRef = useRef(null);
  const startCollapseTimer = () => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setIsTimerExpanded(false);
    }, 5000);
  };
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  // Lyrics translation menu open state and long-press event handlers
  const [isTranslationMenuOpen, setIsTranslationMenuOpen] = useState(false);
  const longPressTimerRef = useRef(null);
  const isLongPressActiveRef = useRef(false);

  const startLongPress = () => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setIsTranslationMenuOpen(true);
    }, 600); // 600ms hold threshold
  };

  const endLongPress = (shouldClick) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressActiveRef.current && shouldClick) {
      setShowLyrics(!showLyrics);
    }
    isLongPressActiveRef.current = false;
  };

  const handleLyricsButtonMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    startLongPress();
  };

  const handleLyricsButtonMouseUp = () => {
    endLongPress(true);
  };

  const handleLyricsButtonMouseLeave = () => {
    endLongPress(false);
  };

  const handleLyricsButtonTouchStart = () => {
    startLongPress();
  };

  const handleLyricsButtonTouchEnd = (e) => {
    e.preventDefault(); // Prevents mouse click trigger emulation on mobile
    endLongPress(true);
  };

  // Listening Party / Sync Room state
  const [partyRoomInput, setPartyRoomInput] = useState("");
  const [partyUsers, setPartyUsers] = useState([]);
  const [isPartyMenuOpen, setIsPartyMenuOpen] = useState(false);
  const [ytPlayer, setYtPlayer] = useState(null);
  const [isYtFetchModalOpen, setIsYtFetchModalOpen] = useState(false);
  const [ytEmbedError, setYtEmbedError] = useState(false);
  const [showControlsOverVideo, setShowControlsOverVideo] = useState(true);
  const audioRef = useRef(null);
  const audioEl1Ref = useRef(null);
  const audioEl2Ref = useRef(null);
  const [activePlayer, setActivePlayer] = useState('A');
  const activePlayerRef = useRef('A');
  const isCrossfadingRef = useRef(false);
  const crossfadeTimerRef = useRef(null);
  const volumeRef = useRef(volume);
  const ignoreNextTrackLoadRef = useRef(false);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Keep audioRef pointing to the active element and ensure analyser is connected
  useEffect(() => {
    const activeEl = activePlayer === 'A' ? audioEl1Ref.current : audioEl2Ref.current;
    audioRef.current = activeEl;
    if (activeEl) {
      ensureAudioAnalyser(activeEl);
    }
  }, [activePlayer]);

  const startCrossfade = (newUrl, durationSeconds, autoNextIdx = null) => {
    if (isCrossfadingRef.current && autoNextIdx === null) return;
    isCrossfadingRef.current = true;

    const fadeTime = durationSeconds || crossfadeDuration;
    
    // Identify active and inactive elements
    const oldKey = activePlayerRef.current;
    const newKey = oldKey === 'A' ? 'B' : 'A';
    const oldAudio = oldKey === 'A' ? audioEl1Ref.current : audioEl2Ref.current;
    const newAudio = newKey === 'A' ? audioEl1Ref.current : audioEl2Ref.current;

    if (!oldAudio || !newAudio) {
      isCrossfadingRef.current = false;
      return;
    }

    console.log(`🎵 Starting crossfade: fading out ${oldKey}, fading in ${newKey} over ${fadeTime}s`);

    // 1. Prepare new audio element
    newAudio.src = resolveAudioUrl(newUrl);
    newAudio.volume = 0;
    
    // Reset playhead for new audio
    newAudio.currentTime = 0;

    // If currently playing, start new audio playing
    if (isPlaying && isLocalActive) {
      newAudio.play().catch(e => console.log("New audio play block:", e));
    }

    // 2. If manual skip, switch active player immediately so UI reacts
    if (autoNextIdx === null) {
      setActivePlayer(newKey);
      activePlayerRef.current = newKey;
      audioRef.current = newAudio;
      ensureAudioAnalyser(newAudio);
      resetBeatEngine(newAudio);
      setDuration(0);
      progressRef.current = 0;
      setProgress(0);
    }

    // 3. Perform the volume ramp
    const startTime = Date.now();
    const intervalTime = 40; // 25 fps
    const totalMs = fadeTime * 1000;

    if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);

    crossfadeTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / totalMs);

      // Interpolate volumes relative to current user volume
      const currentTargetVol = volumeRef.current;
      
      oldAudio.volume = currentTargetVol * (1 - t);
      newAudio.volume = currentTargetVol * t;

      if (t >= 1) {
        clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
        
        // Finalize transition: stop and clean up old audio
        oldAudio.pause();
        oldAudio.src = "";
        
        // Ensure new audio is exactly at the target volume
        newAudio.volume = volumeRef.current;
        
        // 4. If auto-crossfade, switch active player pointer and index AT THE END
        if (autoNextIdx !== null) {
          setActivePlayer(newKey);
          activePlayerRef.current = newKey;
          audioRef.current = newAudio;
          ensureAudioAnalyser(newAudio);
          resetBeatEngine(newAudio);
          ignoreNextTrackLoadRef.current = true;
          setCurrentTrackIndex(autoNextIdx);
          setDuration(0);
          progressRef.current = 0;
          setProgress(0);
        }
        
        isCrossfadingRef.current = false;
        console.log(`🎵 Crossfade transition completed. Active player is now ${newKey}`);
      }
    }, intervalTime);
  };

  const startManualCrossfade = (newUrl) => {
    startCrossfade(newUrl, Math.min(crossfadeDuration, 2));
  };

  const fullPlayerRef = useRef(null);
  const lastTrackIdRef = useRef(null);   // guards audioUrl effect — only resets on real track change
  const seekLockUntilRef = useRef(0);   // timestamp: RAF won't overwrite progress until this time
  const lastTickTimeRef = useRef(null);   // timestamp: used for smooth extrapolation of remote progress
  // DOM refs for direct mutation — avoids React re-renders for time display
  const miniElapsedRef = useRef(null);
  const miniTotalRef   = useRef(null);
  const miniBarFillRef = useRef(null);
  const miniThumbRef   = useRef(null);
  
  // Refs for ambient visualizer
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  const edgeGlowRef = useRef(null);
  const vigRef = useRef(null);
  const trackFadeRef = useRef(null);
  const rafRef    = useRef(null);
  const lastColorsRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });

  // Sync ambient visuals
  useEffect(() => {
    if (!ambientEffectsEnabled || !isExpanded) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    let angle = 0;

    const handleMouseMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = (clientX / window.innerWidth) * 2 - 1;
      const y = (clientY / window.innerHeight) * 2 - 1;
      targetMouseRef.current = { x, y };
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });

    function tick() {
      const beatState = getBeatState();
      const bass = beatState.bass;
      const mids = beatState.mids;
      const highs = beatState.highs;
      const energy = beatState.energy || 0;
      const trackFade = beatState.trackFade !== undefined ? beatState.trackFade : 1;

      const colors = beatState.colors || [[50,80,70], [30,60,90], [40,40,110]];
      let r = colors[0][0], g = colors[0][1], b = colors[0][2];
      let r2 = colors[1][0], g2 = colors[1][1], b2 = colors[1][2];
      let r3 = colors[2][0], g3 = colors[2][1], b3 = colors[2][2];

      if (theme && theme !== 'none' && THEME_COLORS[theme]) {
        const tc = THEME_COLORS[theme];
        const mix = 0.65;
        r = Math.round(r * (1 - mix) + tc.r * mix);
        g = Math.round(g * (1 - mix) + tc.g * mix);
        b = Math.round(b * (1 - mix) + tc.b * mix);
        
        r2 = Math.round(r2 * (1 - mix) + tc.r * mix * 0.8);
        g2 = Math.round(g2 * (1 - mix) + tc.g * mix * 0.8);
        b2 = Math.round(b2 * (1 - mix) + tc.b * mix * 0.8);

        r3 = Math.round(r3 * (1 - mix) + tc.r * mix * 0.6);
        g3 = Math.round(g3 * (1 - mix) + tc.g * mix * 0.6);
        b3 = Math.round(b3 * (1 - mix) + tc.b * mix * 0.6);
      }

      const colorsChanged = !lastColorsRef.current || 
        lastColorsRef.current.r !== r || lastColorsRef.current.g !== g || lastColorsRef.current.b !== b ||
        lastColorsRef.current.r2 !== r2 || lastColorsRef.current.g2 !== g2 || lastColorsRef.current.b2 !== b2 ||
        lastColorsRef.current.r3 !== r3 || lastColorsRef.current.g3 !== g3 || lastColorsRef.current.b3 !== b3;

      if (colorsChanged) {
        lastColorsRef.current = { r, g, b, r2, g2, b2, r3, g3, b3 };
      }

      // Lerp mouse coordinates smoothly
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.08;

      // Base speed + beat energy boost
      const baseDrift = 0.0012;
      const driftSpeed = baseDrift + energy * 0.0038;
      angle += driftSpeed;

      const x1 = Math.sin(angle) * 8 + mouseRef.current.x * 6;
      const y1 = Math.cos(angle * 0.8) * 8 + mouseRef.current.y * 6;
      const x2 = Math.cos(angle * 1.2) * 10 + mouseRef.current.x * -5;
      const y2 = Math.sin(angle * 0.9) * 10 + mouseRef.current.y * -5;
      const x3 = Math.sin(angle * 0.7) * 7 + mouseRef.current.x * 4;
      const y3 = Math.cos(angle * 1.3) * 7 + mouseRef.current.y * 4;

      if (orb1Ref.current && (colorsChanged || !orb1Ref.current.style.background)) {
        orb1Ref.current.style.opacity = (0.05 + bass * 0.95).toFixed(3);
        orb1Ref.current.style.transform = `scale(${(0.70 + bass * 0.90).toFixed(4)}) translate(${x1.toFixed(2)}%, ${y1.toFixed(2)}%)`;
        orb1Ref.current.style.background = `radial-gradient(closest-side at center, rgba(${r}, ${g}, ${b}, 0.85) 0%, rgba(${r}, ${g}, ${b}, 0.25) 50%, transparent 100%)`;
      } else if (orb1Ref.current) {
        orb1Ref.current.style.opacity = (0.05 + bass * 0.95).toFixed(3);
        orb1Ref.current.style.transform = `scale(${(0.70 + bass * 0.90).toFixed(4)}) translate(${x1.toFixed(2)}%, ${y1.toFixed(2)}%)`;
      }
      // --- Vignette opacity & color bleed ---
      if (vigRef.current && (colorsChanged || !vigRef.current.style.background)) {
        const bleedR = Math.round(r * 0.18);
        const bleedG = Math.round(g * 0.18);
        const bleedB = Math.round(b * 0.18);
        vigRef.current.style.background = `radial-gradient(ellipse at 50% 50%, rgba(${bleedR}, ${bleedG}, ${bleedB}, 0.35) 0%, rgba(var(--theme-bg-rgb), 0.95) 100%), linear-gradient(to bottom, rgba(var(--theme-bg-rgb), 0.5), rgba(var(--theme-bg-rgb), 0.92))`;
      }
      if (vigRef.current) {
        vigRef.current.style.opacity = (0.95 - energy * 0.50).toFixed(3);
      }
      if (orb2Ref.current && (colorsChanged || !orb2Ref.current.style.background)) {
        orb2Ref.current.style.opacity = (0.05 + mids * 0.15).toFixed(3);
        orb2Ref.current.style.transform = `scale(${(0.70 + mids * 0.10).toFixed(4)}) translate(${x2.toFixed(2)}%, ${y2.toFixed(2)}%)`;
        orb2Ref.current.style.background = `radial-gradient(closest-side at center, rgba(${r2}, ${g2}, ${b2}, 0.75) 0%, rgba(${r2}, ${g2}, ${b2}, 0.2) 50%, transparent 100%)`;
      } else if (orb2Ref.current) {
        orb2Ref.current.style.opacity = (0.05 + mids * 0.15).toFixed(3);
        orb2Ref.current.style.transform = `scale(${(0.70 + mids * 0.10).toFixed(4)}) translate(${x2.toFixed(2)}%, ${y2.toFixed(2)}%)`;
      }
      if (orb3Ref.current && (colorsChanged || !orb3Ref.current.style.background)) {
        orb3Ref.current.style.opacity = (0.05 + highs * 0.15).toFixed(3);
        orb3Ref.current.style.transform = `scale(${(0.70 + highs * 0.10).toFixed(4)}) translate(${x3.toFixed(2)}%, ${y3.toFixed(2)}%)`;
        orb3Ref.current.style.background = `radial-gradient(closest-side at center, rgba(${r3}, ${g3}, ${b3}, 0.85) 0%, rgba(${r3}, ${g3}, ${b3}, 0.2) 50%, transparent 100%)`;
      } else if (orb3Ref.current) {
        orb3Ref.current.style.opacity = (0.05 + highs * 0.15).toFixed(3);
        orb3Ref.current.style.transform = `scale(${(0.70 + highs * 0.10).toFixed(4)}) translate(${x3.toFixed(2)}%, ${y3.toFixed(2)}%)`;
      }
      if (trackFadeRef.current) {
        trackFadeRef.current.style.opacity = trackFade.toFixed(3);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
    };
  }, [ambientEffectsEnabled, isExpanded, theme]);
  
  const pressTimerPlayer = useRef(null);
  const handlePressStart = (e, track) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    pressTimerPlayer.current = setTimeout(() => {
      openTrackMenu(track, clientX, clientY);
    }, 500);
  };
  const handlePressEnd = () => {
    if (pressTimerPlayer.current) {
      clearTimeout(pressTimerPlayer.current);
      pressTimerPlayer.current = null;
    }
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowRecovery(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowRecovery(false);
    }
  }, [loading]);

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);



  
  let durationStr = "--:--";
  let totalSeconds = 0;

  if (isSpotifyTrack && spotifyPlaybackState) {
    totalSeconds = Math.floor(spotifyPlaybackState.duration / 1000);
    durationStr = formatTime(totalSeconds);
  } else if (duration > 0 && !isNaN(duration) && duration !== Infinity) {
    totalSeconds = Math.floor(duration);
    durationStr = formatTime(totalSeconds);
  } else if (currentTrack.duration && currentTrack.duration !== "--:--") {
    durationStr = currentTrack.duration;
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      totalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
  }

  useEffect(() => {
    if (currentTrack) {
      setIsLiked(!!currentTrack.isLiked);
    }
  }, [currentTrack]);

  // Handle volume — set on audio element directly
  useEffect(() => {
    if (audioRef.current && !isCrossfadingRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle mute — use native .muted so volume is preserved
  useEffect(() => {
    if (audioEl1Ref.current) audioEl1Ref.current.muted = isMuted;
    if (audioEl2Ref.current) audioEl2Ref.current.muted = isMuted;
  }, [isMuted]);

  // Set up audio analyser and refresh beat engine baselines for visualizer
  useEffect(() => {
    if (audioRef.current) {
      ensureAudioAnalyser(audioRef.current);
      resetBeatEngine(audioRef.current);
    }
  }, [currentTrack?.source, currentTrack?.id]);

  // Handle play/pause
  useEffect(() => {
    if (isSpotifyTrack) {
      if (spotifyPlayer) {
        if (isPlaying && isLocalActive) {
          spotifyPlayer.resume().catch(e => console.error("Spotify resume failed", e));
        } else {
          spotifyPlayer.pause().catch(e => console.error("Spotify pause failed", e));
        }
      }
      // Always pause local audio when playing Spotify
      if (audioRef.current) audioRef.current.pause();
    } else {
      // Handle local playback
      if (audioRef.current && currentTrack.audioUrl) {
        if (isPlaying && isLocalActive) {
          ensureAudioAnalyser(audioRef.current);
          resumeAudioContext();
          audioRef.current.play().catch(e => console.error("Playback blocked", e));
        } else {
          audioRef.current.pause();
        }
      }
      // Pause Spotify when playing local
      if (spotifyPlayer && isPlaying) spotifyPlayer.pause();
    }
  }, [isPlaying, currentTrack.audioUrl, isSpotifyTrack, spotifyPlayer, isLocalActive]);

  // Handle track source change — only resets progress when the track ID actually changes
  useEffect(() => {
    if (!currentTrack.audioUrl) return;

    if (ignoreNextTrackLoadRef.current) {
      ignoreNextTrackLoadRef.current = false;
      lastTrackIdRef.current = currentTrack.id;
      return;
    }

    // If global track or iTunes preview track is not yet resolved to YouTube, pause current playback and wait
    const isGlobalUnresolved = (currentTrack.source === 'global' || (currentTrack.audioUrl && (currentTrack.audioUrl.includes('itunes.apple.com') || currentTrack.audioUrl.includes('mzstatic.com')))) && 
                               !currentTrack.audioUrl.includes('youtube.com') && 
                               !currentTrack.audioUrl.includes('youtu.be');

    if (isGlobalUnresolved) {
      const activeEl = activePlayerRef.current === 'A' ? audioEl1Ref.current : audioEl2Ref.current;
      if (activeEl) {
        activeEl.pause();
      }
      return;
    }

    const isNewTrack = lastTrackIdRef.current !== currentTrack.id;
    const oldTrackId = lastTrackIdRef.current;
    lastTrackIdRef.current = currentTrack.id;

    if (isInitialLoad) {
      const activeEl = activePlayerRef.current === 'A' ? audioEl1Ref.current : audioEl2Ref.current;
      if (activeEl) {
        setDuration(0);
        activeEl.src = resolveAudioUrl(currentTrack.audioUrl);
        const safeProgress = isNaN(progress) ? 0 : progress;
        activeEl.currentTime = safeProgress;
        setIsInitialLoad(false);
        if (isPlaying && isLocalActive) {
          activeEl.play().catch(e => console.error("Playback blocked", e));
        }
      }
      return;
    }

    if (isNewTrack) {
      if (isCrossfadingRef.current) {
        return; // Already handling in crossfade loop
      }

      if (crossfadeDuration > 0 && oldTrackId !== null) {
        startManualCrossfade(currentTrack.audioUrl);
      } else {
        const activeEl = activePlayerRef.current === 'A' ? audioEl1Ref.current : audioEl2Ref.current;
        const inactiveEl = activePlayerRef.current === 'A' ? audioEl2Ref.current : audioEl1Ref.current;
        
        if (inactiveEl) {
          inactiveEl.pause();
          inactiveEl.src = "";
        }

        if (activeEl) {
          setDuration(0);
          activeEl.src = resolveAudioUrl(currentTrack.audioUrl);
          progressRef.current = 0;
          setProgress(0);
          activeEl.volume = volume;
          if (isPlaying && isLocalActive) {
            activeEl.play().catch(e => console.error("Playback blocked", e));
          }
        }
      }
    } else {
      const activeEl = activePlayerRef.current === 'A' ? audioEl1Ref.current : audioEl2Ref.current;
      if (activeEl) {
        activeEl.src = resolveAudioUrl(currentTrack.audioUrl);
        if (isPlaying && isLocalActive) {
          activeEl.play().catch(e => console.error("Playback blocked", e));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack.audioUrl]);

  const isYouTube = currentTrack.audioUrl && (currentTrack.audioUrl.includes('youtube.com') || currentTrack.audioUrl.includes('youtu.be'));

  // Reset video mode and error when track changes
  useEffect(() => {
    setIsVideoMode(false);
    setYtEmbedError(false);
  }, [currentTrack?.id]);

  // Reset embed error when toggling video mode
  useEffect(() => {
    if (!isVideoMode) setYtEmbedError(false);
  }, [isVideoMode]);

  // Handle controls visibility timeout in video mode
  useEffect(() => {
    if (!isExpanded || !isVideoMode) {
      setShowControlsOverVideo(true);
      return;
    }

    let timeoutId;
    const prolongTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowControlsOverVideo(false);
      }, 5000);
    };

    const handleScreenClick = (e) => {
      const target = e.target;
      // If clicking interactive buttons, inputs, links, or the controls block (z-20 / z-30), just reset/prolong the timer
      const isInteractive = target.closest('button, input, a, [role="button"], .z-20, .z-30');

      if (isInteractive) {
        setShowControlsOverVideo(true);
        prolongTimer();
        return;
      }

      // Toggling visibility on empty screen space click
      setShowControlsOverVideo((prev) => {
        const nextState = !prev;
        clearTimeout(timeoutId);
        if (nextState) {
          prolongTimer();
        }
        return nextState;
      });
    };

    const handleInteraction = () => {
      setShowControlsOverVideo(true);
      prolongTimer();
    };

    // Initially show controls, then schedule hide
    setShowControlsOverVideo(true);
    prolongTimer();

    const element = fullPlayerRef.current;
    if (element) {
      element.addEventListener('click', handleScreenClick, true);
      element.addEventListener('mousemove', handleInteraction);
      element.addEventListener('touchstart', handleInteraction);
    }

    return () => {
      clearTimeout(timeoutId);
      if (element) {
        element.removeEventListener('click', handleScreenClick, true);
        element.removeEventListener('mousemove', handleInteraction);
        element.removeEventListener('touchstart', handleInteraction);
      }
    };
  }, [isExpanded, isVideoMode]);

  // Load YouTube Iframe API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize/Destroy YouTube background player
  useEffect(() => {
    if (!isYouTube || !isExpanded) {
      if (ytPlayer) {
        try {
          ytPlayer.destroy();
        } catch (e) {}
        setYtPlayer(null);
      }
      return;
    }

    let playerInstance;
    const videoId = getYouTubeId(currentTrack.audioUrl);

    const initPlayer = () => {
      playerInstance = new window.YT.Player('yt-bg-player', {
        videoId: videoId,
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          mute: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
          enablejsapi: 1,
          playsinline: 1
        },
        events: {
          onReady: (event) => {
            event.target.mute();
            if (isPlaying) {
              event.target.playVideo();
            }
            const currentAudioTime = audioRef.current ? audioRef.current.currentTime : progress;
            event.target.seekTo(currentAudioTime, true);
            setYtPlayer(event.target);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
          },
          onError: (event) => {
            // 101 / 150 = embedding disabled by video owner
            if (event.data === 101 || event.data === 150) {
              setYtEmbedError(true);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const timer = setInterval(() => {
        if (window.YT && window.YT.Player) {
          initPlayer();
          clearInterval(timer);
        }
      }, 100);
      return () => clearInterval(timer);
    }

    return () => {
      if (playerInstance && typeof playerInstance.destroy === 'function') {
        try {
          playerInstance.destroy();
        } catch (e) {}
      }
    };
  }, [isYouTube, isExpanded, currentTrack.id]);

  // Sync YouTube player play/pause state
  useEffect(() => {
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      if (isPlaying) {
        ytPlayer.playVideo();
        const currentAudioTime = audioRef.current ? audioRef.current.currentTime : progress;
        ytPlayer.seekTo(currentAudioTime, true);
      } else {
        ytPlayer.pauseVideo();
      }
    }
  }, [isPlaying, ytPlayer]);



  useEffect(() => {
    const saveProgress = () => {
      localStorage.setItem('aura_progress', audioRef.current?.currentTime || progress);
    };
    const interval = setInterval(saveProgress, 3000);
    window.addEventListener('beforeunload', saveProgress);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', saveProgress);
    };
  }, [progress]);

  // Handle fake timer fallback (for tracks without audioUrl)
  useEffect(() => {
    let interval;
    if (!currentTrack.audioUrl && isPlaying && !isDraggingProgress) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= totalSeconds) {
            return prev; 
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isDraggingProgress, totalSeconds, currentTrack.audioUrl]);

  // Auto skip for fake timer (for tracks without audioUrl)
  useEffect(() => {
    if (currentTrack.audioUrl) return; // audio element handles its own 'onEnded'
    if (playlist.length === 0 || totalSeconds <= 0) return;
    
    if (progress >= totalSeconds && !isDraggingProgress) {
      if (repeatCount > 0) {
        setRepeatCount((r) => r - 1);
        setProgress(0);
        setIsPlaying(true);
      } else {
        setCurrentTrackIndex((i) => {
          if (isNaN(i)) return 0;
          return (i + 1) % playlist.length;
        });
        setProgress(0);
        setIsPlaying(true);
      }
    }
  }, [progress, totalSeconds, isDraggingProgress, repeatCount, playlist.length, currentTrack.audioUrl]);

  const lastStateProgressUpdateRef = useRef(0);

  // Handle remote progress sync
  useEffect(() => {
    const handleRemoteProgress = (e) => {
      if (!isLocalActive && !isDraggingProgressRef.current) {
        const ct = e.detail.progress;
        const remoteTotal = e.detail.duration || 0;

        const isSeek = Math.abs(ct - progressRef.current) > 2.5;
        progressRef.current = ct;
        lastTickTimeRef.current = Date.now();
        
        // Throttled React state update for sync progress to prevent heavy re-renders
        const now = Date.now();
        if (isSeek || (now - lastStateProgressUpdateRef.current >= 4000)) {
          lastStateProgressUpdateRef.current = now;
          setProgress(ct);
        }

        if (remoteTotal > 0 && duration !== remoteTotal) {
          setDuration(remoteTotal);
        }

        if (miniElapsedRef.current) miniElapsedRef.current.textContent = formatTime(ct);
        
        const effectiveTotal = remoteTotal || totalSeconds;
        
        if (miniBarFillRef.current && effectiveTotal > 0) {
          const pct = Math.min(100, (ct / effectiveTotal) * 100);
          miniBarFillRef.current.style.width = `${pct}%`;
          if (miniThumbRef.current) miniThumbRef.current.style.left = `calc(${pct}% - 6px)`;
        }
      }
    };
    window.addEventListener('remote_progress_update', handleRemoteProgress);
    return () => window.removeEventListener('remote_progress_update', handleRemoteProgress);
  }, [isLocalActive, totalSeconds, duration]);

  // RAF-driven time display — updates DOM directly without re-rendering React tree
  const animFrameRef = useRef(null);
  const lastProgressUpdateRef = useRef(0);

  const tickDisplay = useCallback(() => {
    if (!isLocalActive) {
      // If this device is NOT the active playback device, extrapolate progress smoothly based on time delta
      if (isPlaying && !isDraggingProgressRef.current && totalSeconds > 0) {
        const now = Date.now();
        if (lastTickTimeRef.current) {
          const delta = (now - lastTickTimeRef.current) / 1000;
          progressRef.current = Math.min(totalSeconds, progressRef.current + delta);
        }
        lastTickTimeRef.current = now;
      } else {
        lastTickTimeRef.current = null;
      }

      const ct = progressRef.current;
      if (miniElapsedRef.current) miniElapsedRef.current.textContent = formatTime(ct);
      if (miniBarFillRef.current && totalSeconds > 0) {
        const pct = Math.min(100, (ct / totalSeconds) * 100);
        miniBarFillRef.current.style.width = `${pct}%`;
        if (miniThumbRef.current) miniThumbRef.current.style.left = `calc(${pct}% - 6px)`;
      }
      animFrameRef.current = requestAnimationFrame(tickDisplay);
      return;
    }

    // Reset extrapolation tracker since local is active
    lastTickTimeRef.current = null;

    if (isSpotifyTrack && spotifyPlaybackState && !isDraggingProgressRef.current) {
      const ct = Math.floor(spotifyPlaybackState.position / 1000);
      progressRef.current = ct;
      if (miniElapsedRef.current) miniElapsedRef.current.textContent = formatTime(ct);
      if (miniBarFillRef.current && totalSeconds > 0) {
        const pct = Math.min(100, (ct / totalSeconds) * 100);
        miniBarFillRef.current.style.width = `${pct}%`;
        if (miniThumbRef.current) miniThumbRef.current.style.left = `calc(${pct}% - 6px)`;
      }
      
      const now = Date.now();
      if (now - lastProgressUpdateRef.current >= 1000) {
        lastProgressUpdateRef.current = now;
        setProgress(ct);
        if (isLocalActive && broadcastProgress) broadcastProgress(ct, totalSeconds);
      }
    } else if (audioRef.current && currentTrack.audioUrl) {
      const now = Date.now();

      // ── Seek lock: skip ALL reads from audioRef while seeking or within lock window ──
      // This prevents progressRef.current being clobbered by a stale/pre-seek value while
      // the audio element is still buffering/seeking to the new position.
      const isSeeking = audioRef.current.seeking || (now < seekLockUntilRef.current);
      if (isSeeking) {
        // Use the locked value that was set by the seek handler
        const lockedCt = progressRef.current;
        if (miniElapsedRef.current) miniElapsedRef.current.textContent = formatTime(lockedCt);
        if (miniBarFillRef.current && totalSeconds > 0) {
          const pct = Math.min(100, (lockedCt / totalSeconds) * 100);
          miniBarFillRef.current.style.width = `${pct}%`;
          if (miniThumbRef.current) miniThumbRef.current.style.left = `calc(${pct}% - 6px)`;
        }
        animFrameRef.current = requestAnimationFrame(tickDisplay);
        return;
      }

      const ct = audioRef.current.currentTime;
      progressRef.current = ct;

      // Check for auto-crossfade transition
      const timeRemaining = totalSeconds - ct;
      if (
        crossfadeDuration > 0 &&
        totalSeconds > 0 &&
        timeRemaining <= crossfadeDuration &&
        timeRemaining > 0.1 &&
        !isCrossfadingRef.current &&
        playlist.length > 1 &&
        !isSpotifyTrack
      ) {
        const nextIdx = (currentTrackIndex + 1) % playlist.length;
        const nextTrack = playlist[nextIdx];
        if (nextTrack && nextTrack.audioUrl) {
          isCrossfadingRef.current = true;
          
          const nextUrl = resolveAudioUrl(nextTrack.audioUrl);

          startCrossfade(nextUrl, crossfadeDuration, nextIdx);
        }
      }

      // Sync YouTube video drift if needed
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.seekTo === 'function') {
        const ytTime = ytPlayer.getCurrentTime();
        if (Math.abs(ytTime - ct) > 1.5) {
          ytPlayer.seekTo(ct, true);
        }
      }

      // Update mini-player time labels directly in DOM (zero flicker)
      if (miniElapsedRef.current) miniElapsedRef.current.textContent = formatTime(ct);

      // Update mini progress bar fill width directly
      if (miniBarFillRef.current && totalSeconds > 0) {
        const pct = Math.min(100, (ct / totalSeconds) * 100);
        miniBarFillRef.current.style.width = `${pct}%`;
        if (miniThumbRef.current) miniThumbRef.current.style.left = `calc(${pct}% - 6px)`;
      }

      // High-performance direct DOM lyrics syncing
      if (parsedLyricsRef.current && parsedLyricsRef.current.length > 0) {
        let activeIndex = -1;
        const lyrics = parsedLyricsRef.current;
        for (let i = 0; i < lyrics.length; i++) {
          if (ct >= lyrics[i].time) {
            activeIndex = i;
          } else {
            break;
          }
        }
        
        if (activeIndex !== currentLyricIndexRef.current) {
          if (showLyricsRef.current && lyricsContainerRef.current) {
            const container = lyricsContainerRef.current;
            const children = container.children;
            const prevIdx = currentLyricIndexRef.current;
            
            if (prevIdx >= 0 && prevIdx < children.length) {
              const prevEl = children[prevIdx];
              if (prevEl) {
                prevEl.classList.remove('text-white', 'scale-[1.05]', 'opacity-100', 'drop-shadow-[0_2px_12px_rgba(255,255,255,0.25)]', 'drop-shadow-[0_2px_16px_rgba(255,255,255,0.3)]');
                prevEl.classList.add('text-white/30', 'scale-100', 'opacity-30');
              }
            }
            
            if (activeIndex >= 0 && activeIndex < children.length) {
              const activeEl = children[activeIndex];
              if (activeEl) {
                activeEl.classList.remove('text-white/30', 'scale-100', 'opacity-30');
                activeEl.classList.add('text-white', 'scale-[1.05]', 'opacity-100');
                if (onlyLyricsModeActiveRef.current) {
                  activeEl.classList.add('drop-shadow-[0_2px_16px_rgba(255,255,255,0.3)]');
                } else {
                  activeEl.classList.add('drop-shadow-[0_2px_12px_rgba(255,255,255,0.25)]');
                }
                
                // Smooth scroll to active line
                const containerHeight = container.clientHeight;
                const elOffsetTop = activeEl.offsetTop;
                const elHeight = activeEl.clientHeight;
                const targetScrollTop = elOffsetTop - (containerHeight / 2) + (elHeight / 2);
                
                container.scrollTo({
                  top: targetScrollTop,
                  behavior: "smooth"
                });
              }
            }
          }
          
          currentLyricIndexRef.current = activeIndex;
          setCurrentLyricIndex(activeIndex);
        }
      }

      // Throttled React state update & Broadcast
      if (now - lastProgressUpdateRef.current >= 1000) {
        lastProgressUpdateRef.current = now;
        if (!isDraggingProgressRef.current) setProgress(ct);
        if (isLocalActive && broadcastProgress) {
          broadcastProgress(ct, totalSeconds);
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(tickDisplay);
  }, [currentTrack.audioUrl, totalSeconds, isSpotifyTrack, spotifyPlaybackState, ytPlayer, seekLockUntilRef, isLocalActive, isPlaying, broadcastProgress, crossfadeDuration, currentTrackIndex, playlist, setCurrentTrackIndex]);

  useEffect(() => {
    const cancel = () => { if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; } };
    cancel();
    animFrameRef.current = requestAnimationFrame(tickDisplay);
    return cancel;
  }, [tickDisplay]);

  const handleTimeUpdate = () => {
    // No-op: time display is now handled by tickDisplay RAF loop above
    // We only need onTimeUpdate for the audio element's internal state
  };

  const handleAudioEnded = (key) => {
    if (activePlayerRef.current !== key) return;
    if (maintenanceGraceActive) {
      setIsPlaying(false);
      setMaintenanceGraceActive(false);
      return;
    }
    if (repeatCount > 0) {
      setRepeatCount(r => r - 1);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      setCurrentTrackIndex((i) => {
        if (isNaN(i)) return 0;
        return (i + 1) % playlist.length;
      });
      setProgress(0);
      setIsPlaying(true);
      setRepeatCount(0);
    }
  };

  useEffect(() => {
    if (isQueueOpen) {
      setTimeout(() => {
        const id = isExpanded ? 'now-playing-full' : 'now-playing-mini';
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);
    }
  }, [isQueueOpen, isExpanded]);

  // Extract dominant colors from album art for cinematic ambient background
  // Single extraction call — waveform colors derived via onColors callback.
  // Previously had TWO competing image loads which randomly overwrote each other.
  useEffect(() => {
    if (!currentTrack?.cover || currentTrack.cover.startsWith('linear')) {
      setAmbientColors([[17, 24, 17], [12, 19, 20], [14, 14, 22]]);
      setWaveformColors(['200 210 220', '180 195 215', '165 180 210']);
      return;
    }

    extractAndSetColors(currentTrack.cover, (colors) => {
      // Derive waveform colors from the same palette — no second image load
      setWaveformColors([
        `${colors[0][0]} ${colors[0][1]} ${colors[0][2]}`,
        `${colors[1][0]} ${colors[1][1]} ${colors[1][2]}`,
        `${colors[2][0]} ${colors[2][1]} ${colors[2][2]}`,
      ]);
    });
  }, [currentTrack?.cover]);


  // Sync isPlaying to the global beat engine
  useEffect(() => {
    setBeatPlaying(isPlaying);
    // Also ensure the beat engine is running
    startBeatEngine();
  }, [isPlaying]);

  // Re-connect song player to analyser when TV stream ambient is disabled or TV closes
  useEffect(() => {
    if ((!tvStream || !tvBeatAmbient) && audioRef.current) {
      ensureAudioAnalyser(audioRef.current);
      setBeatPlaying(isPlaying);
    }
  }, [tvStream, tvBeatAmbient, isPlaying]);

  // Sync ambient settings to the global engine
  useEffect(() => {
    updateAmbientSettings(ambientSettings);
  }, [ambientSettings]);

  // Parse lyrics when track changes
  useEffect(() => {
    setParsedLyrics([]);
    setCurrentLyricIndex(-1);
    currentLyricIndexRef.current = -1;
    setTranslationLang("none");
    setTranslatedLyrics([]);

    if (!currentTrack) {
      return;
    }
    
    // If lyrics are already available in the track object, use them immediately
    if (currentTrack.lyrics) {
      const lrc = getSyncedLyrics(currentTrack, duration || 180);
      setParsedLyrics(lrc);
      setCurrentLyricIndex(-1);
      return;
    }

    // Otherwise, fetch fresh details from the server to get newly-saved lyrics from the DB
    if (currentTrack.id && currentTrack.source !== 'global' && currentTrack.source !== 'youtube') {
      let active = true;
      fetch(`/api/tracks/${currentTrack.id}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          if (data && data.lyrics) {
            const updatedTrack = { ...currentTrack, lyrics: data.lyrics };
            const lrc = getSyncedLyrics(updatedTrack, duration || 180);
            setParsedLyrics(lrc);
          } else {
            const lrc = getSyncedLyrics(currentTrack, duration || 180);
            setParsedLyrics(lrc);
          }
          setCurrentLyricIndex(-1);
        })
        .catch(err => {
          console.error("Failed to fetch track details for lyrics:", err);
          if (!active) return;
          const lrc = getSyncedLyrics(currentTrack, duration || 180);
          setParsedLyrics(lrc);
          setCurrentLyricIndex(-1);
        });
      return () => { active = false; };
    } else if (currentTrack.source === 'global' || currentTrack.source === 'youtube') {
      let active = true;
      const title = currentTrack.title;
      const artist = currentTrack.artist;
      if (title) {
        fetch(`/api/admin/tracks/fetch-lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist || '')}`)
          .then(res => res.json())
          .then(data => {
            if (!active) return;
            if (data && data.lyrics) {
              const updatedTrack = { ...currentTrack, lyrics: data.lyrics };
              const lrc = getSyncedLyrics(updatedTrack, duration || 180);
              setParsedLyrics(lrc);
            } else {
              setParsedLyrics([]);
            }
            setCurrentLyricIndex(-1);
          })
          .catch(err => {
            console.error("Failed to fetch global track lyrics:", err);
            if (!active) return;
            setParsedLyrics([]);
            setCurrentLyricIndex(-1);
          });
        return () => { active = false; };
      } else {
        setParsedLyrics([]);
        setCurrentLyricIndex(-1);
      }
    } else {
      const lrc = getSyncedLyrics(currentTrack, duration || 180);
      setParsedLyrics(lrc);
      setCurrentLyricIndex(-1);
    }
  }, [currentTrack, duration]);

  // Scroll active lyric to center of list
  useEffect(() => {
    if (showLyrics && currentLyricIndex !== -1 && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeEl = container.children[currentLyricIndex];
      if (activeEl) {
        const containerHeight = container.clientHeight;
        const elOffsetTop = activeEl.offsetTop;
        const elHeight = activeEl.clientHeight;
        const targetScrollTop = elOffsetTop - (containerHeight / 2) + (elHeight / 2);
        
        container.scrollTo({
          top: targetScrollTop,
          behavior: "smooth"
        });
      }
    }
  }, [currentLyricIndex, showLyrics]);

  // Inactivity timer for floating media controller in Only Lyrics Mode
  const resetLyricsControllerTimeout = useCallback(() => {
    if (lyricsControllerTimeoutRef.current) {
      clearTimeout(lyricsControllerTimeoutRef.current);
    }
    if (isLyricsControllerOpen) {
      lyricsControllerTimeoutRef.current = setTimeout(() => {
        setIsLyricsControllerOpen(false);
      }, 10000);
    }
  }, [isLyricsControllerOpen]);

  useEffect(() => {
    if (isLyricsControllerOpen) {
      resetLyricsControllerTimeout();
    }
    return () => {
      if (lyricsControllerTimeoutRef.current) {
        clearTimeout(lyricsControllerTimeoutRef.current);
      }
    };
  }, [isLyricsControllerOpen, resetLyricsControllerTimeout]);



  // Sleep Timer countdown
  useEffect(() => {
    if (!sleepTimerActive || sleepTimerSecondsLeft === null || sleepTimerSecondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          setIsPlaying(false);
          setSleepTimerActive(false);
          if (audioRef.current) {
            audioRef.current.volume = volume;
          }
          return null;
        }

        const nextVal = prev - 1;
        if (nextVal <= 10) {
          if (audioRef.current) {
            audioRef.current.volume = volume * (nextVal / 10);
          }
        }
        return nextVal;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepTimerActive, sleepTimerSecondsLeft, volume, setIsPlaying]);

  // Restore volume when sleep timer is cancelled/turned off
  useEffect(() => {
    if (!sleepTimerActive && sleepTimerSecondsLeft === null) {
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    }
  }, [sleepTimerActive, sleepTimerSecondsLeft, volume]);

  const progressPercentage = totalSeconds > 0 ? (progress / totalSeconds) * 100 : 0;

  // Seek handler for WaveformProgress
  const handleWaveformSeek = (seconds) => {
    const t = Math.max(0, seconds);
    progressRef.current = t;
    seekLockUntilRef.current = Date.now() + 1000; // block RAF overwrite for 1000ms
    if (audioRef.current) {
      audioRef.current.currentTime = t;
    }
    setProgress(t);
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    resumeAudioContext(); // wake suspended AudioContext on mobile
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (broadcastPlaybackState) broadcastPlaybackState(nextState, currentTrackIndex, playlist);
    if (currentTrack?.source === 'spotify_bridge') {
      if (nextState) {
        spotifyRemotePlay();
      } else {
        spotifyRemotePause();
      }
    }
  };

  const toggleLike = async (e) => {
    if (e) e.stopPropagation();
    if (!currentTrack || !currentTrack.id) return;
    
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    
    const actualState = await toggleLikeGlobal(currentTrack, newLikedState);
    setIsLiked(actualState);
  };

  const handleShuffleClick = (e) => {
    if (e) e.stopPropagation();
    shuffleQueue();
    setShuffleFeedbackActive(true);
    setTimeout(() => {
      setShuffleFeedbackActive(false);
    }, 2000);
  };

  const handleOpenPlaylists = (e) => {
    e.stopPropagation();
    if (!user || user.isAnonymous) {
      showAlert("Please sign in first to manage playlists!");
      return;
    }
    setIsOptionsMenuOpen(false);
    fetch(`/api/playlists`, {
      headers: { 'x-user-id': user?.uid || '' }
    })
      .then(res => res.json())
      .then(data => {
        setCustomPlaylists(Array.isArray(data) ? data : []);
        setIsAddToPlaylistOpen(true);
      })
      .catch(console.error);
  };

  const handleAddToPlaylist = async (playlistId, e) => {
    if (e) e.stopPropagation();
    if (!currentTrack) return;
    try {
      let localId = currentTrack.id;

      if (currentTrack.source === 'global' || currentTrack.source === 'youtube') {
        const syncRes = await fetch('/api/tracks/sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || ''
          },
          body: JSON.stringify(currentTrack)
        });
        const syncData = await syncRes.json();
        localId = syncData.id;
      }

      // 2. Add track to playlist
      await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: localId })
      });
      setIsAddToPlaylistOpen(false);
    } catch (err) {
      console.error("Sync/Playlist Error:", err);
    }
  };

  const handleCreatePlaylist = async (e) => {
    if (e) e.preventDefault();
    if (!newPlaylistName.trim() || !currentTrack) return;
    try {
      let localId = currentTrack.id;

      if (currentTrack.source === 'global' || currentTrack.source === 'youtube') {
        const syncRes = await fetch('/api/tracks/sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || ''
          },
          body: JSON.stringify(currentTrack)
        });
        const syncData = await syncRes.json();
        localId = syncData.id;
      }

      // 2. Create the playlist
      const playlistRes = await fetch(`/api/playlists`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({ name: newPlaylistName })
      });
      const playlistData = await playlistRes.json();

      // 3. Add to playlist
      await fetch(`/api/playlists/${playlistData.id}/tracks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({ trackId: localId })
      });

      setNewPlaylistName("");
      setIsCreatingPlaylistInPlayer(false);
      setIsAddToPlaylistOpen(false);
    } catch (err) {
      console.error(err);
    }
  };
  
  const skipForward = (e) => {
    if (e) e.stopPropagation();
    if (maintenanceGraceActive) {
      showAlert("Playback is locked. Site is entering maintenance mode.");
      return;
    }
    if (currentTrack?.source === 'spotify_bridge') {
      spotifyRemoteNext();
      return;
    }
    setCurrentTrackIndex((i) => {
      const nextIdx = Math.floor((i + 1) % playlist.length);
      if (broadcastPlaybackState) broadcastPlaybackState(true, nextIdx, playlist);
      return nextIdx;
    });
    setProgress(0);
    setIsPlaying(true);
    setRepeatCount(0);
  };
  
  const skipBack = (e) => {
    if (e) e.stopPropagation();
    if (maintenanceGraceActive) {
      showAlert("Playback is locked. Site is entering maintenance mode.");
      return;
    }
    if (currentTrack?.source === 'spotify_bridge') {
      spotifyRemotePrevious();
      return;
    }
    setCurrentTrackIndex((i) => {
      const nextIdx = i === 0 ? playlist.length - 1 : i - 1;
      if (broadcastPlaybackState) broadcastPlaybackState(true, nextIdx, playlist);
      return nextIdx;
    });
    setProgress(0);
    setIsPlaying(true);
    setRepeatCount(0);
  };

  // HTML5 Media Session API integration (headphone clicks / lock screen controls)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    // 1. Sync metadata to lock screen/headphone widget
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || "Sonora Song",
        artist: currentTrack.artist || "Sonora Artist",
        album: currentTrack.album || "Sonora",
        artwork: [
          {
            src: currentTrack.cover || "/img/default_cover.jpg",
            sizes: "512x512",
            type: "image/jpeg"
          }
        ]
      });
    } catch (err) {
      console.warn("Failed to set Media Session metadata:", err);
    }

    // 2. Register media action handlers
    const handlers = {
      play: () => {
        if (!isPlaying) togglePlay();
      },
      pause: () => {
        if (isPlaying) togglePlay();
      },
      previoustrack: () => {
        skipBack();
      },
      nexttrack: () => {
        skipForward();
      },
      seekbackward: (details) => {
        const offset = details.seekOffset || 10;
        const target = Math.max(0, progressRef.current - offset);
        progressRef.current = target;
        setProgress(target);
        handleWaveformSeek(target);
      },
      seekforward: (details) => {
        const offset = details.seekOffset || 10;
        const target = Math.min(totalSeconds || 100, progressRef.current + offset);
        progressRef.current = target;
        setProgress(target);
        handleWaveformSeek(target);
      },
      seekto: (details) => {
        if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
          progressRef.current = details.seekTime;
          setProgress(details.seekTime);
          handleWaveformSeek(details.seekTime);
        }
      }
    };

    // Bind all supported action handlers
    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        console.warn(`Media Session Action handler "${action}" not supported:`, err);
      }
    });

    return () => {
      // Clear action handlers on unmount/track change
      Object.keys(handlers).forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {}
      });
    };
  }, [currentTrack, isPlaying, totalSeconds, togglePlay, skipBack, skipForward, handleWaveformSeek]);

  // Sync playback state to OS locksceen controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // PC Keyboard hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Skip hotkeys if focused on text/input fields to allow normal typing
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      
      switch (e.key) {
        case 'Escape':
          if (isAmbianceMode) {
            e.preventDefault();
            setIsAmbianceMode(false);
            return;
          }
          break;
        case ' ': // Spacebar: Play/Pause toggle
          e.preventDefault(); // Stop page scrolling
          togglePlay();
          break;
        case 'ArrowLeft': // Seek backward 10s
          e.preventDefault();
          const targetBack = Math.max(0, progressRef.current - 10);
          progressRef.current = targetBack;
          setProgress(targetBack);
          handleWaveformSeek(targetBack);
          break;
        case 'ArrowRight': // Seek forward 10s
          e.preventDefault();
          const targetFwd = Math.min(totalSeconds || 100, progressRef.current + 10);
          progressRef.current = targetFwd;
          setProgress(targetFwd);
          handleWaveformSeek(targetFwd);
          break;
        case 'ArrowUp': // Volume up
          e.preventDefault();
          setVolume((prevVolume) => {
            const nextVol = Math.min(1, prevVolume + 0.05);
            return nextVol;
          });
          break;
        case 'ArrowDown': // Volume down
          e.preventDefault();
          setVolume((prevVolume) => {
            const nextVol = Math.max(0, prevVolume - 0.05);
            return nextVol;
          });
          break;
        default:
          // Other hotkeys that don't need Arrow overrides
          if (key === 'm') {
            setIsMuted((prevMuted) => !prevMuted);
          } else if (key === 'n' || (e.shiftKey && e.key === 'ArrowRight')) {
            skipForward();
          } else if (key === 'p' || (e.shiftKey && e.key === 'ArrowLeft')) {
            skipBack();
          } else if (key === 'l') { // 'l' key seek forward (YouTube shortcut)
            const targetL = Math.min(totalSeconds || 100, progressRef.current + 10);
            progressRef.current = targetL;
            setProgress(targetL);
            handleWaveformSeek(targetL);
          } else if (key === 'j') { // 'j' key seek backward (YouTube shortcut)
            const targetJ = Math.max(0, progressRef.current - 10);
            progressRef.current = targetJ;
            setProgress(targetJ);
            handleWaveformSeek(targetJ);
          } else if ((key === 'a' || key === 'h') && isExpanded) {
            setIsAmbianceMode((prev) => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [totalSeconds, togglePlay, skipBack, skipForward, handleWaveformSeek, setVolume, setIsMuted, isAmbianceMode, isExpanded]);

  const handleProgressPointer = (e) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = Math.max(0, Math.min(1, x / bounds.width));
    
    if (isSpotifyTrack && spotifyPlayer) {
      const positionMs = Math.floor(percentage * (spotifyPlaybackState?.duration || 0));
      seek(positionMs);
    } else {
      if (totalSeconds <= 0) return; // no duration yet — don't reset to 0
      const newTime = percentage * totalSeconds;
      const safeTime = isNaN(newTime) ? 0 : newTime;
      progressRef.current = safeTime;
      seekLockUntilRef.current = Date.now() + 1000; // block RAF overwrite for 1000ms
      if (audioRef.current) {
        audioRef.current.currentTime = safeTime;
      }
      setProgress(safeTime); // immediately update React state so progress bar moves visually
    }
  };

  const handleVolumePointer = (e) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    setVolume(Math.max(0, Math.min(1, x / bounds.width)));
    if (isMuted) setIsMuted(false);
  };

  const handleRepeatDown = (e) => {
    e.stopPropagation();
    if (e.button && e.button !== 0) return;
    repeatTimer.current = setTimeout(() => {
      setIsRepeatMenuOpen(true);
      repeatTimer.current = null;
    }, 400); 
  };

  const handleRepeatUp = (e) => {
    e.stopPropagation();
    if (repeatTimer.current) {
      clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
      if (!isRepeatMenuOpen) {
        setRepeatCount((prev) => (prev + 1) % 6);
      } else {
        setIsRepeatMenuOpen(false);
      }
    }
  };

  const handleRepeatCancel = (e) => {
    e.stopPropagation();
    if (repeatTimer.current) {
      clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
  };

  const stopProp = (e) => e.stopPropagation();

  const renderMenuOption = (Icon, label, action) => (
    <button 
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-ink-100 transition hover:bg-white/[0.06] outline-none"
      onClick={(e) => { e.stopPropagation(); setIsOptionsMenuOpen(false); if (action) action(); }}
    >
      <Icon className="h-4.5 w-4.5 text-ink-300" strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );

  const renderProgressBar = (isFull = false) => (
    <div className={`flex text-[11px] font-medium text-ink-400 ${isFull ? 'mt-8 flex-col items-stretch gap-2 text-xs md:mt-10 md:text-sm' : 'w-full flex-row items-center gap-3'}`} onClick={stopProp}>
      {/* Mini-player elapsed time — updated via DOM ref (no React re-render flicker) */}
      {!isFull && <span ref={miniElapsedRef} className="w-9 text-right font-medium tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(progress)}</span>}
      
      <div 
        className={`group relative flex cursor-pointer items-center touch-none ${isFull ? 'h-6 w-full' : 'h-5 flex-1'}`} 
        onPointerDown={(e) => {
          e.stopPropagation();
          isDraggingProgressRef.current = true;
          setIsDraggingProgress(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          handleProgressPointer(e);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (isDraggingProgressRef.current) handleProgressPointer(e);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          isDraggingProgressRef.current = false;
          setIsDraggingProgress(false);
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          e.stopPropagation();
          isDraggingProgressRef.current = false;
          setIsDraggingProgress(false);
        }}
      >
        <div className={`absolute inset-x-0 rounded-full bg-white/[0.1] ${isFull ? 'h-1.5 group-hover:h-2.5' : 'h-1 group-hover:h-1.5'}`} style={{ transition: 'height 0.15s ease' }} />
        {/* Bar fill — ref-updated for mini player, state-driven for full player (which uses Waveform instead) */}
        <div 
          ref={!isFull ? miniBarFillRef : undefined}
          className={`absolute left-0 rounded-full bg-white ${isFull ? 'h-1.5 group-hover:bg-sage-400 group-hover:h-2.5' : 'h-1 group-hover:bg-sage-400 group-hover:h-1.5'}`} 
          style={{ width: `${progressPercentage}%`, transition: 'height 0.15s ease' }} 
        />
        {!isFull && <div ref={miniThumbRef} className="absolute rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100 h-3 w-3 shadow-md" style={{ left: `calc(${progressPercentage}% - 6px)` }} />}
      </div>
      
      {!isFull ? (
        <span ref={miniTotalRef} className="w-9 font-medium tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{durationStr}</span>
      ) : (
        <div className="mt-1 flex w-full justify-between">
          <span className="tabular-nums">{formatTime(progress)}</span>
          <span className="tabular-nums">{durationStr}</span>
        </div>
      )}
    </div>
  );

  const renderVolumeBar = (isFull = false) => (
    <div className={`flex items-center ${isFull ? 'w-full gap-4' : 'w-full gap-2 justify-end'}`} onClick={stopProp}>
      <button 
        type="button" 
        aria-label="Toggle mute"
        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
        className="text-ink-400 transition hover:text-ink-100 active:scale-95 flex-shrink-0"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className={isFull ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={1.8} />
        ) : (
          <Volume2 className={isFull ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={1.8} />
        )}
      </button>
      <div 
        className={`group relative flex cursor-pointer items-center touch-none ${isFull ? 'h-6 flex-1' : 'h-5 w-20 flex-shrink-0'}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDraggingVolume(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          handleVolumePointer(e);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (isDraggingVolume) handleVolumePointer(e);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setIsDraggingVolume(false);
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          e.stopPropagation();
          setIsDraggingVolume(false);
        }}
      >
         <div className={`absolute inset-x-0 rounded-full bg-white/[0.08] ${isFull ? 'h-1.5 group-hover:h-2.5' : 'h-1 group-hover:h-1.5'}`} style={{ transition: 'height 0.15s ease' }} />
         <div 
           className={`absolute left-0 rounded-full bg-ink-300 ${isFull ? 'h-1.5 group-hover:bg-ink-100 group-hover:h-2.5' : 'h-1 group-hover:bg-ink-100 group-hover:h-1.5'}`} 
           style={{ width: `${(isMuted ? 0 : volume) * 100}%`, transition: 'height 0.15s ease' }}
         />
      </div>
    </div>
  );

  const renderRepeatButton = (isFull = false) => (
    <div className="relative flex items-center justify-center" onClick={stopProp}>
      <button 
        className={`relative z-50 flex touch-none select-none items-center justify-center rounded-full transition tactile-btn ${isFull ? 'h-10 w-10 md:h-12 md:w-12' : 'h-8 w-8'} ${repeatCount > 0 ? 'text-sage-400' : 'text-ink-500 hover:bg-white/[0.055] hover:text-ink-100'}`} 
        type="button" 
        aria-label="Repeat"
        onPointerDown={handleRepeatDown}
        onPointerUp={handleRepeatUp}
        onPointerLeave={handleRepeatCancel}
        onPointerCancel={handleRepeatCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="relative flex items-center justify-center">
          <Repeat2 className={isFull ? "h-5 w-5 md:h-6 md:w-6" : "h-4 w-4"} strokeWidth={1.8} />
          {repeatCount > 0 && (
            <span className={`absolute font-bold text-ink-950 flex items-center justify-center rounded-full bg-sage-400 ${isFull ? '-bottom-2 -right-2 h-5 w-5 text-[10px]' : '-bottom-1.5 -right-1.5 h-[14px] w-[14px] text-[8px]'}`}>
              {repeatCount}
            </span>
          )}
        </div>
      </button>

      {!isFull && isRepeatMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => { e.stopPropagation(); setIsRepeatMenuOpen(false); }} 
          />
          <div className={`absolute z-50 w-40 surface p-2 shadow-dock rounded-2xl border ${isFull ? 'bottom-[calc(100%+16px)] left-0 translate-x-0 md:left-1/2 md:-translate-x-1/2' : 'bottom-full left-1/2 -translate-x-1/2 mb-4'}`}>
            <div className="p-2 pb-1">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Repeat Option</h3>
            </div>
            {[0, 1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                onClick={(e) => {
                  e.stopPropagation();
                  setRepeatCount(num);
                  setIsRepeatMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.06] ${repeatCount === num ? 'text-sage-400 font-medium' : 'text-ink-100'}`}
              >
                <span>{num === 0 ? 'No repeat' : `${num} time${num > 1 ? 's' : ''}`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // Separate refs for mini and full-screen queue buttons, plus anchor position state
  const miniQueueBtnRef = useRef(null);
  const fullQueueBtnRef = useRef(null);
  const [queueAnchorPos, setQueueAnchorPos] = useState(null); // { bottom, right }

  const openQueue = useCallback((btnRef) => {
    if (isQueueOpen) { setIsQueueOpen(false); return; }
    if (btnRef?.current) {
      const r = btnRef.current.getBoundingClientRect();
      setQueueAnchorPos({
        bottom: window.innerHeight - r.top + 12,  // 12px gap above the button
        right: window.innerWidth - r.right,
        availableHeight: r.top - 16,              // max height = space above button - 16px top margin
      });
    }
    setIsQueueOpen(true);
  }, [isQueueOpen]);

  const renderQueueButton = (isFull = false) => (
    <div className="flex items-center justify-center" onClick={stopProp}>
      <button
        ref={isFull ? fullQueueBtnRef : miniQueueBtnRef}
        className={`relative transition tactile-btn ${isFull ? 'flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full' : ''} ${isQueueOpen ? 'text-ink-100' : 'text-ink-500 hover:bg-white/[0.055] hover:text-ink-100'}`}
        type="button"
        aria-label="Open queue"
        onClick={(e) => { e.stopPropagation(); openQueue(isFull ? fullQueueBtnRef : miniQueueBtnRef); }}
      >
        <ListMusic className={isFull ? "h-5 w-5 md:h-6 md:w-6" : "h-4 w-4"} strokeWidth={1.8} />
      </button>
    </div>
  );

  const renderDeviceMenu = (isFull = false) => {
    if (!crossPlayEnabled) return null;
    return (
    <div className="relative flex items-center justify-center" onClick={stopProp}>
      <button 
        className={`relative z-50 flex items-center justify-center rounded-full transition tactile-btn ${isFull ? 'h-10 w-10 md:h-12 md:w-12' : 'h-8 w-8'} ${isDeviceMenuOpen || !isLocalActive ? 'text-sage-400' : 'text-ink-500 hover:bg-white/[0.055] hover:text-ink-100'}`} 
        type="button" 
        aria-label="Devices"
        onClick={(e) => { 
          e.stopPropagation(); 
          if (!isDeviceMenuOpen && refreshSessions) {
            refreshSessions(); 
          }
          setIsDeviceMenuOpen(!isDeviceMenuOpen); 
        }}
      >
        <MonitorSpeaker className={isFull ? "h-5 w-5 md:h-6 md:w-6" : "h-[18px] w-[18px]"} strokeWidth={1.8} />
      </button>

      {!isFull && isDeviceMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => { e.stopPropagation(); setIsDeviceMenuOpen(false); }} 
          />
          <div 
            className={`absolute z-50 flex w-64 flex-col overflow-hidden rounded-2xl surface border shadow-2xl ${isFull ? 'bottom-14 right-0' : 'bottom-10 right-0'}`}
            style={{ animation: 'slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            onClick={stopProp}
          >
            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Connect to a device</span>
            </div>
            <div className="flex max-h-64 flex-col overflow-y-auto p-1.5 py-2">
              {sessions.map(session => {
                const isActive = session.id === activePlaybackDeviceId;
                const Icon = session.deviceType === 'mobile' ? Smartphone : Laptop;
                return (
                  <button
                    key={session.id}
                    onClick={() => { 
                      if (session.id === sessionId && audioRef.current) {
                        // Direct play call to unlock the audio element via user gesture activation!
                        audioRef.current.play().catch(e => console.log("Unlock play:", e));
                      }
                      switchActiveDevice(session.id); 
                      setIsDeviceMenuOpen(false); 
                    }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isActive ? 'bg-sage-400/15 text-sage-400' : 'hover:bg-white/[0.06] text-ink-300 hover:text-ink-100'}`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-sage-400' : 'text-ink-400'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className={`truncate text-sm font-medium ${isActive ? 'text-sage-400' : 'text-ink-100'}`}>
                        {session.device} {session.id === sessionId ? '(This Device)' : ''}
                      </span>
                      <span className="truncate text-[10px] text-ink-500">
                        {session.location || 'Unknown Location'}
                      </span>
                    </div>
                  </button>
                );
              })}
              {sessions.length === 0 && (
                <div className="px-3 py-2 text-xs text-ink-500">No other devices found.</div>
              )}
            </div>

            {/* Spotify Smart Bridge Section */}
            <div className="p-3 border-t border-white/5 bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.686.473-1.045.253-2.865-1.75-6.471-2.146-10.72-1.176-.407.094-.814-.162-.907-.57-.094-.408.162-.815.57-.908 4.654-1.064 8.643-.615 11.849 1.356.359.219.473.687.253 1.045zm1.472-3.272c-.274.446-.86.588-1.306.313-3.28-2.015-8.28-2.599-12.16-1.422-.501.152-1.034-.135-1.186-.637-.152-.501.135-1.034.637-1.186 4.432-1.346 9.948-.696 13.702 1.626.446.275.588.86.313 1.306zm.126-3.41c-3.935-2.337-10.427-2.553-14.19-1.411-.605.184-1.246-.16-1.43-.765-.184-.606.16-1.247.765-1.431 4.331-1.314 11.499-1.062 16.027 1.625.545.323.725 1.033.402 1.578-.323.546-1.033.726-1.574.404z"/>
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-emerald-300">Spotify Bridge</span>
                    <span className="text-[9px] text-white/50">{spotifyBridgeState?.connected ? (spotifyBridgeState?.active ? 'Live Sound Output' : 'Connected (Paused)') : 'Remote Desktop Sync'}</span>
                  </div>
                </div>
                {spotifyBridgeState?.connected ? (
                  <button
                    onClick={() => setSpotifyBridgeEnabled(!spotifyBridgeState?.active)}
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full transition ${
                      spotifyBridgeState?.active ? 'bg-emerald-400 text-black shadow-sm' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                  >
                    {spotifyBridgeState?.active ? 'Syncing' : 'Paused'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const token = prompt("Enter Spotify Access Token (or leave blank to start OAuth login):");
                      if (token && token.trim()) {
                        setSpotifyToken(token.trim());
                      } else if (token !== null) {
                        startSpotifyAuth();
                      }
                    }}
                    className="text-[9px] uppercase font-bold px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm transition"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    );
  };

  const isLoading = loading || playlist.length === 0;

  const MiniPlayer = isLoading ? (
    <div 
      className="fixed bottom-4 z-50 flex justify-center pb-[80px] md:pb-0 pointer-events-none"
      style={{
        left: 'var(--sidebar-effective-width)',
        right: 0,
        transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="pointer-events-auto flex h-[72px] items-center justify-center rounded-[1.25rem] premium-glass px-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3 text-sm font-medium text-ink-500">
          <SonoraLoader size="sm" />
          <span>Connecting to server...</span>
          {showRecovery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowServerUrlModal(true);
              }}
              className="ml-2 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer active:scale-95 pointer-events-auto"
            >
              Setup URL
            </button>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div 
      className="fixed bottom-4 z-50 flex justify-center items-center gap-4 pb-[80px] md:pb-0 pointer-events-none"
      style={{
        left: 'var(--sidebar-effective-width)',
        right: 0,
        paddingLeft: 'var(--content-px)',
        paddingRight: 'var(--content-px)',
        transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div 
        className={`pointer-events-auto flex cursor-pointer items-center justify-between gap-4 rounded-[1.25rem] premium-glass px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/5 transition-all duration-500 hover:bg-white/[0.04] hover:border-white/[0.12] hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${
          (tvStream && siteSettings?.enable_live_tv !== false) 
            ? "w-[65%] max-w-[680px] md:w-[65%] sm:w-[60%]" 
            : "w-full max-w-[1000px]"
        }`}
        onClick={() => setIsExpanded(true)}
      >
        {/* Left: Active Song Info */}
        <div className="flex w-auto sm:w-[30%] sm:min-w-[200px] items-center gap-3">
          <div className="animate-in fade-in duration-1000">
            <AlbumArt cover={currentTrack.cover} className="h-[46px] w-[46px] sm:h-14 sm:w-14 shrink-0 rounded-lg shadow-sm" />
          </div>
          <div className="min-w-0 hidden sm:flex flex-col justify-center max-w-[160px] mr-2 transition-all duration-1000 ease-in-out">
            <MarqueeText
              text={currentTrack.title}
              className="text-[15px] font-semibold text-white drop-shadow-sm"
            />
            <p 
              onClick={(e) => { e.stopPropagation(); navigate('/search?q=' + encodeURIComponent(currentTrack.artist)); }}
              className="truncate text-[12px] font-medium text-ink-400 mt-0.5 hover:text-sage-400 transition-colors cursor-pointer"
            >
              {currentTrack.artist}
            </p>
          </div>
          <button 
            onClick={toggleLike}
            className={`hidden sm:flex transition-all hover:scale-110 active:scale-95 ${isLiked ? 'text-sage-400 drop-shadow-[0_0_8px_rgba(195,208,184,0.5)]' : 'text-ink-400 hover:text-ink-100'}`} 
            type="button" 
            aria-label="Like current song"
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} strokeWidth={2} />
          </button>
        </div>

        {/* Center: Playback Controls & Progress */}
        <div onClick={stopProp} className="flex flex-1 sm:w-[40%] sm:min-w-[300px] max-w-[500px] flex-col items-center justify-center cursor-default">
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-1.5">
            <button 
              onClick={handleShuffleClick} 
              className={`hidden sm:flex h-8 w-8 items-center justify-center transition active:scale-95 hover:scale-110 tactile-btn ${
                shuffleFeedbackActive 
                  ? 'text-sage-400 drop-shadow-[0_0_8px_rgba(195,208,184,0.5)]' 
                  : 'text-ink-400 hover:text-ink-100'
              }`} 
              type="button" 
              aria-label="Shuffle"
            >
              <Shuffle className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
            <button onClick={skipBack} className="flex h-8 w-8 items-center justify-center text-ink-400 transition hover:text-ink-100 active:scale-95 hover:scale-110 tactile-btn" type="button" aria-label="Previous">
              <SkipBack className="h-5 w-5 fill-current" strokeWidth={1} />
            </button>
            <button 
              onClick={togglePlay}
              className="morphism-play-btn group flex h-[38px] w-[38px] items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 tactile-btn" 
              type="button" 
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" strokeWidth={0} />
              ) : (
                <Play className="ml-0.5 h-5 w-5 fill-current" strokeWidth={0} />
              )}
            </button>
            <button onClick={skipForward} className="flex h-8 w-8 items-center justify-center text-ink-400 transition hover:text-ink-100 active:scale-95 hover:scale-110 tactile-btn" type="button" aria-label="Next">
              <SkipForward className="h-5 w-5 fill-current" strokeWidth={1} />
            </button>
            <div className="hidden sm:block">
              {renderRepeatButton(false)}
            </div>
          </div>
          <div className="w-full relative px-2">
            {renderProgressBar(false)}
          </div>
        </div>

        {/* Right: Queue & Volume */}
        <div className={`hidden md:flex items-center justify-end gap-5 ${
          tvStream 
            ? "w-[20%] min-w-[80px]" 
            : "w-[30%] min-w-[200px]"
        }`} onClick={stopProp}>
          {renderDeviceMenu(false)}
          {renderQueueButton(false)}
          {!tvStream && (
            <div className="w-[120px] flex justify-end">
              {renderVolumeBar(false)}
            </div>
          )}
        </div>
      </div>

      {/* TV Play Bar Dynamic Island */}
      {tvStream && siteSettings?.enable_live_tv !== false && (
        <div 
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-[1.25rem] premium-glass px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-500 animate-in slide-in-from-right-8 duration-300 md:w-[35%] md:max-w-[320px] sm:w-[40%] sm:max-w-[280px] w-12 h-12 sm:h-auto shrink-0 overflow-hidden sm:overflow-visible rounded-full sm:rounded-[1.25rem]"
          onClick={() => navigate("/tv")}
        >
          {/* Mobile view: Compact dot and icon */}
          <div className="flex sm:hidden w-full h-full items-center justify-center relative">
            <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            <Tv className="h-5 w-5 text-sage-400" />
          </div>

          {/* Desktop view: Expanded Controls */}
          <div className="hidden sm:flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative shrink-0 flex items-center justify-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sage-400">
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <Tv className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Live</span>
                <span className="text-[9px] font-bold text-ink-500 uppercase tracking-wider">Feed</span>
              </div>
              <p className="truncate text-xs font-semibold text-white/90 mt-0.5" title={tvStream.url}>
                {tvStream.url.replace(/^https?:\/\/(www\.)?/, "")}
              </p>
            </div>
          </div>

          {/* Action buttons (only on desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0" onClick={stopProp}>
            {/* Toggle TV Beat Ambient */}
            <button
              onClick={() => {
                const val = !tvBeatAmbient;
                setTvBeatAmbient(val);
                broadcastTvStream(tvStream, val);
              }}
              className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-all active:scale-95 ${
                tvBeatAmbient 
                  ? "bg-sage-400 border-sage-400 text-ink-950" 
                  : "bg-white/5 border-white/10 text-ink-400 hover:text-white"
              }`}
              title="Toggle Beat Reactivity"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>

            {/* Maximize to TV page */}
            <button
              onClick={() => navigate("/tv")}
              className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-ink-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
              title="Open TV Stream Page"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            {/* Close Stream */}
            <button
              onClick={() => {
                setTvStream(null);
                broadcastTvStream(null);
              }}
              className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all active:scale-95"
              title="Close Stream"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );


  const FullPlayer = (isExpanded !== false) && (
    <div 
      ref={fullPlayerRef}
      className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col animate-in fade-in duration-500"
      data-morphism={morphism}
      style={{ backfaceVisibility: 'hidden', perspective: '1000px', transform: 'translateZ(0)' }}
    >

      {/* ═══ CINEMATIC BACKGROUND SYSTEM ═══ */}
      {/* Background is isolated from content to prevent GPU thrashing */}
      <div className="absolute inset-0 z-0 overflow-hidden" style={{ contain: 'strict' }}>
        {/* Deep black base */}
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: morphism === 'glassmorphism' ? 'var(--theme-bg)' : 'var(--custom-bg, #090a09)' }}
        />

        <div 
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ 
            opacity: (ambientEffectsEnabled && !isVideoMode) ? 1 : 0,
            pointerEvents: (ambientEffectsEnabled && !isVideoMode) ? 'auto' : 'none'
          }}
        >
          <div ref={trackFadeRef} className="absolute inset-0">
            {/* Dual-layer background cross-fade — avoids 'background-image' transition lag */}
            {/* Forced WebGL engine described in AMBIANCE_SYSTEM.md */}
            {true ? (
              /* ── WebGL mode: GPU shader canvas fills the Now Playing background ── */
              <WebGLAmbientBackground key={currentTrack?.id || 'default'} glow={isAmbianceMode ? 1.75 : 1.4} boost={isAmbianceMode ? 1.65 : 1.45} />
            ) : (
              /* ── CSS mode: DOM orbs + blurred cover art ── */
              <>
                {currentTrack?.cover && !currentTrack.cover.startsWith('linear') && (
                  <>
                    <div
                      key={currentTrack.id}
                      className="absolute inset-0 scale-[1.18] animate-in fade-in duration-700"
                      style={{
                        backgroundImage: `url("${currentTrack.cover}")`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        filter: window.innerWidth < 1024 ? 'blur(45px) saturate(180%)' : 'blur(90px) saturate(200%)',
                        opacity: 0.38,
                        transform: 'translate3d(0,0,0)',
                      }}
                    />
                  </>
                )}
                <div className="noise-overlay" />
                {/* Ambient color orb 1 — top-left */}
                <div
                  ref={orb1Ref}
                  className="absolute -top-1/4 -left-1/4 h-[75%] w-[75%] rounded-full"
                  style={{
                    willChange: "opacity, transform",
                    background: `radial-gradient(closest-side at center,
                      rgba(var(--ambient-r), var(--ambient-g), var(--ambient-b), 0.95) 0%,
                      rgba(var(--ambient-r), var(--ambient-g), var(--ambient-b), 0.35) 40%,
                      transparent 100%)`,
                    animationPlayState: isQueueOpen ? 'paused' : 'running'
                  }}
                />
                {/* Ambient color orb 2 — bottom-right */}
                <div
                  ref={orb2Ref}
                  className="absolute -bottom-1/4 -right-1/4 h-[70%] w-[70%] rounded-full"
                  style={{
                    willChange: "opacity, transform",
                    background: `radial-gradient(closest-side at center,
                      rgba(var(--ambient-r2), var(--ambient-g2), var(--ambient-b2), 0.85) 0%,
                      rgba(var(--ambient-r2), var(--ambient-g2), var(--ambient-b2), 0.30) 40%,
                      transparent 100%)`,
                    animationPlayState: isQueueOpen ? 'paused' : 'running'
                  }}
                />
                {/* Ambient color orb 3 — center-top accent */}
                <div
                  ref={orb3Ref}
                  className="absolute top-0 left-1/4 h-[50%] w-[60%] rounded-full"
                  style={{
                    willChange: "opacity, transform",
                    background: `radial-gradient(closest-side at center,
                      rgba(var(--ambient-r3), var(--ambient-g3), var(--ambient-b3), 0.95) 0%,
                      rgba(var(--ambient-r3), var(--ambient-g3), var(--ambient-b3), 0.35) 40%,
                      transparent 100%)`,
                    animationPlayState: isQueueOpen ? 'paused' : 'running'
                  }}
                />
              </>
            )}
            {(ambientEffectsEnabled && (particlesMode === 'player' || particlesMode === 'both')) && (
              <InteractiveParticles />
            )}
          </div>
        </div>

        {/* YouTube Background Video Player */}
        {isYouTube && (
          <div 
            className={`absolute inset-0 z-0 overflow-hidden transition-opacity duration-700 ${isVideoMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Actual YT iframe target — hidden when embed is blocked */}
            <div
              id="yt-bg-player"
              className={`absolute top-1/2 left-1/2 pointer-events-none transition-all duration-500 ${ytEmbedError ? 'opacity-0' : 'opacity-100'}`}
              style={(() => {
                if (videoFitMode === 'contain') {
                  return {
                    width: '100vw',
                    height: '56.25vw',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    transform: 'translate(-50%, -50%)',
                  };
                } else if (videoFitMode === 'zoom') {
                  return {
                    width: '100vw',
                    height: '56.25vw',
                    minWidth: '177.77vh',
                    minHeight: '100vh',
                    transform: 'translate(-50%, -50%) scale(1.35)',
                  };
                } else if (videoFitMode === 'cover') {
                  return {
                    width: '100vw',
                    height: '56.25vw',
                    minWidth: '177.77vh',
                    minHeight: '100vh',
                    transform: 'translate(-50%, -50%) scale(1.1)',
                  };
                } else {
                  // 'auto'
                  const isPortrait = viewportRatio < 1.0;
                  return isPortrait 
                    ? {
                        width: '100vw',
                        height: '56.25vw',
                        maxWidth: '100%',
                        maxHeight: '75%',
                        transform: 'translate(-50%, -50%) scale(1.2)',
                      }
                    : {
                        width: '100vw',
                        height: '56.25vw',
                        minWidth: '177.77vh',
                        minHeight: '100vh',
                        transform: 'translate(-50%, -50%) scale(1.08)',
                      };
                }
              })()}
            />

            {/* Fit mode selector overlay */}
            {!ytEmbedError && isVideoMode && (
              <div className="absolute top-6 right-6 z-30 flex items-center gap-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-lg">
                  {[
                    { mode: 'auto', label: 'Auto Fit' },
                    { mode: 'cover', label: 'Fill Screen' },
                    { mode: 'contain', label: 'Fit View' },
                    { mode: 'zoom', label: 'Zoom 1.35x' },
                  ].map((option) => (
                    <button
                      key={option.mode}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoFitMode(option.mode);
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all ${
                        videoFitMode === option.mode
                          ? 'bg-white text-black shadow'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dimming overlay — completely disabled in video mode for maximum clarity */}
            <div 
              className="absolute inset-0 bg-black opacity-0 pointer-events-none" 
            />

            {/* Embed-blocked fallback overlay */}
            {ytEmbedError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 border border-white/20">
                    <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/>
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-lg">Video unavailable here</p>
                  <p className="text-white/50 text-sm max-w-[260px]">
                    The owner of this video has disabled playback on external sites.
                  </p>
                  <a
                    href={currentTrack.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#FF0000] px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#cc0000] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    Watch on YouTube
                  </a>
                  <button
                    onClick={() => setIsVideoMode(false)}
                    className="text-white/40 text-xs hover:text-white/70 transition-colors"
                  >
                    Back to Audio
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overlays — completely hidden in video mode and pure ambiance mode for maximum color vibrancy */}
        <div 
          className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-750 ${
            (isVideoMode || isAmbianceMode) ? 'opacity-0' : (morphism === 'glassmorphism' ? 'opacity-100' : 'opacity-0')
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/38 via-transparent to-transparent" />
          <div 
            ref={vigRef}
            className="absolute inset-0" 
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.65) 0%, rgba(var(--theme-bg-rgb), 0.95) 100%), linear-gradient(to bottom, rgba(var(--theme-bg-rgb), 0.5), rgba(var(--theme-bg-rgb), 0.92))",
              willChange: "opacity"
            }}
          />
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      {(() => {
        const fadeClass = isVideoMode && isPlaying 
          ? 'opacity-20 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-500' 
          : 'opacity-100 transition-opacity duration-500';
        
        const controlsOpacityClass = (isVideoMode && !showControlsOverVideo)
          ? 'opacity-0 pointer-events-none'
          : (isAmbianceMode ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100');
          
        return (
          <div className={`relative z-10 flex flex-col h-full transition-all duration-700 ease-out ${controlsOpacityClass}`}>

            {/* Exit Lyrics Mode button */}
            {onlyLyricsModeActive && (
              <button
                onClick={() => setOnlyLyricsModeActive(false)}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md transition-all active:scale-95 animate-in fade-in slide-in-from-top-4 duration-500"
                type="button"
              >
                <Mic2 className="h-4 w-4 text-sage-400" />
                <span>Exit Lyrics Only</span>
              </button>
            )}

            {/* Header */}
            <div className={`relative flex items-center justify-between px-5 py-4 md:px-10 md:py-6 shrink-0 transition-all duration-500 ${fadeClass}`}>
              <div className="flex items-center gap-3">
                {!onlyLyricsModeActive && (
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/60 transition-all duration-200 hover:bg-white/[0.1] hover:text-white shrink-0"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                )}

                {/* Smooth Mini Status Bar */}
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
                  {timeSegments && (
                    <div className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/70 font-semibold tracking-wider flex items-center shadow-sm select-none">
                      <TickerSegment value={timeSegments.hour[0]} />
                      <TickerSegment value={timeSegments.hour[1]} />
                      <span className="mx-[1px] font-bold">:</span>
                      <TickerSegment value={timeSegments.minute[0]} />
                      <TickerSegment value={timeSegments.minute[1]} />
                      <span className="mx-[1px] font-bold">:</span>
                      <TickerSegment value={timeSegments.second[0]} />
                      <TickerSegment value={timeSegments.second[1]} />
                      <span className="ml-1 text-[10px] opacity-80 uppercase">
                        <TickerSegment value={timeSegments.period} />
                      </span>
                    </div>
                  )}

                  <div 
                    onClick={(e) => {
                      if (sleepTimerSecondsLeft === null) return;
                      e.stopPropagation();
                      setIsTimerExpanded(!isTimerExpanded);
                      if (!isTimerExpanded) startCollapseTimer();
                    }}
                    className={`transition-all duration-700 ease-in-out flex items-center justify-center overflow-hidden whitespace-nowrap rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-semibold gap-1 shadow-sm select-none cursor-pointer hover:bg-indigo-500/20 ${
                      sleepTimerSecondsLeft !== null
                        ? (isTimerExpanded ? 'max-w-[320px] opacity-100 scale-100 px-3 py-1' : 'max-w-[150px] opacity-100 scale-100 px-3.5 py-1')
                        : 'max-w-0 opacity-0 scale-75 pointer-events-none px-0 py-0 border-transparent shadow-none'
                    }`}
                  >
                    {sleepTimerSecondsLeft !== null && (
                      <>
                        <Timer className="h-3.5 w-3.5 text-indigo-400 mr-0.5 shrink-0" />
                        <div className="flex items-center">
                          <TickerSegment value={String(Math.floor(sleepTimerSecondsLeft / 60)).padStart(2, '0')[0]} />
                          <TickerSegment value={String(Math.floor(sleepTimerSecondsLeft / 60)).padStart(2, '0')[1]} />
                          <span className="mx-[1px] font-bold">:</span>
                          <TickerSegment value={String(Math.floor(sleepTimerSecondsLeft % 60)).padStart(2, '0')[0]} />
                          <TickerSegment value={String(Math.floor(sleepTimerSecondsLeft % 60)).padStart(2, '0')[1]} />
                        </div>
                      </>
                    )}

                    {/* Expandable Controls */}
                    <div
                      className={`flex items-center overflow-hidden transition-all duration-500 ease-in-out ${
                        isTimerExpanded && sleepTimerSecondsLeft !== null
                          ? 'max-w-[150px] opacity-100'
                          : 'max-w-0 opacity-0 pointer-events-none'
                      }`}
                    >
                      {sleepTimerSecondsLeft !== null && (
                        <>
                          <span className="mx-1.5 h-3.5 w-[1px] bg-white/10 shrink-0" />
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Pause / Resume */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSleepTimerActive(!sleepTimerActive);
                                startCollapseTimer();
                              }}
                              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition duration-150 shrink-0"
                              title={sleepTimerActive ? "Pause" : "Resume"}
                            >
                              {sleepTimerActive ? <Pause className="h-3 w-3 shrink-0" /> : <Play className="h-3 w-3 text-sage-400 shrink-0" />}
                            </button>
                            
                            {/* Reset */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSleepTimerSecondsLeft(initialSleepDuration || 900);
                                setSleepTimerActive(true);
                                startCollapseTimer();
                              }}
                              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition duration-150 shrink-0"
                              title="Reset"
                            >
                              <RotateCcw className="h-3 w-3 shrink-0" />
                            </button>
                            
                            {/* Cancel */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSleepTimerActive(false);
                                setSleepTimerSecondsLeft(null);
                                setIsTimerExpanded(false);
                                if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
                              }}
                              className="p-1 rounded hover:bg-red-500/10 text-white/70 hover:text-red-400 transition duration-150 shrink-0"
                              title="Cancel"
                            >
                              <X className="h-3 w-3 shrink-0" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {importStatus?.active && (
                    <div className="rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs text-sky-300 font-semibold flex items-center gap-1 shadow-sm select-none">
                      <span>Importing: {Math.round(importStatus.progress)}%</span>
                    </div>
                  )}

                  {/* World Cup Score Island Ticker */}
                  <WorldCupScoreIsland />

                  {/* Scheduled Maintenance Timer Pill */}
                  <MaintenanceTimerPill />
                </div>
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">Now Playing</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAmbianceMode(true);
                  }}
                  className="flex h-9 items-center gap-1.5 px-3 rounded-full border border-white/[0.08] bg-white/[0.05] text-white/70 transition-all duration-200 hover:bg-white/[0.12] hover:text-white hover:border-white/20 active:scale-95 text-xs font-semibold backdrop-blur-md shadow-sm group"
                  title="Pure Ambiance Mode (Hide UI) — Press 'A' or 'H'"
                  type="button"
                >
                  <Sparkles className="h-4 w-4 text-sage-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Pure Ambiance</span>
                </button>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsOptionsMenuOpen(!isOptionsMenuOpen); }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/60 transition-all duration-200 hover:bg-white/[0.1] hover:text-white"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {isOptionsMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOptionsMenuOpen(false); }} />
                      <div className="absolute right-0 top-full z-50 mt-2 w-56 surface p-2 shadow-dock rounded-2xl border">
                        {renderMenuOption(Sparkles, isAmbianceMode ? "Show Player UI" : "Pure Ambiance Mode", () => {
                          setIsOptionsMenuOpen(false);
                          setIsAmbianceMode(!isAmbianceMode);
                        })}
                        {renderMenuOption(ListPlus, "Add to queue", () => addToQueue(currentTrack))}
                      <button className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-ink-100 transition hover:bg-white/[0.06] outline-none" onClick={handleOpenPlaylists}>
                        <BookmarkPlus className="h-4.5 w-4.5 text-ink-300" strokeWidth={1.8} />
                        <span>Add to playlist</span>
                      </button>
                      {renderMenuOption(Disc, "Go to album", () => { setIsExpanded(false); navigate('/search?q=' + encodeURIComponent(currentTrack.album || currentTrack.title)); })}
                      {renderMenuOption(User, "Go to artist", () => { setIsExpanded(false); setIsOptionsMenuOpen(false); navigate('/search?q=' + encodeURIComponent(currentTrack.artist)); })}
                      {renderMenuOption(Info, "View credits", () => showAlert('Artist: ' + currentTrack.artist + '\nAlbum: ' + (currentTrack.album || 'N/A') + '\nSource: ' + (currentTrack.source || 'Independent iTunes')))}
                      {renderMenuOption(Share2, "Share Lyric Card", () => { setIsOptionsMenuOpen(false); setIsLyricShareOpen(true); })}
                      {renderMenuOption(Timer, sleepTimerActive ? `Sleep Timer: active` : "Sleep Timer", () => { setIsOptionsMenuOpen(false); setIsSleepTimerMenuOpen(true); })}
                      {renderMenuOption(Users, contextPartyRoomCode ? `Listening Party: ${contextPartyRoomCode}` : "Listening Party", () => { setIsOptionsMenuOpen(false); setIsPartyMenuOpen(true); })}
                      {renderMenuOption(Mic2, onlyLyricsModeActive ? "Turn off Lyrics Only" : "Lyrics Only Mode", () => { 
                        setIsOptionsMenuOpen(false); 
                        const nextVal = !onlyLyricsModeActive;
                        setOnlyLyricsModeActive(nextVal);
                        if (nextVal) {
                          setShowLyrics(true);
                        }
                      })}
                      {renderMenuOption(Music, showFloatingLyrics ? "Hide Floating Lyrics" : "Show Floating Lyrics", () => {
                        setIsOptionsMenuOpen(false);
                        const nextVal = !showFloatingLyrics;
                        setShowFloatingLyrics(nextVal);
                        localStorage.setItem('aura_show_floating_lyrics', nextVal.toString());
                      })}
                      {renderMenuOption(Flag, "Report", () => showAlert('Thank you for your report!'))}
                    </div>
                  </>
                )}

                {isAddToPlaylistOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsAddToPlaylistOpen(false); }} />
                    <div className="absolute right-0 top-full mt-2 w-64 z-50 surface p-2 shadow-dock animate-in fade-in zoom-in-95 duration-200 rounded-2xl border">
                      {isCreatingPlaylistInPlayer ? (
                        <form onSubmit={handleCreatePlaylist} className="p-2" onClick={stopProp}>
                          <input 
                            autoFocus
                            type="text" 
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="Playlist name..."
                            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sage-400"
                          />
                          <div className="mt-2 flex gap-2">
                            <button type="submit" className="flex-1 bg-sage-400 text-ink-950 rounded-lg py-1.5 text-xs font-bold hover:bg-sage-500 transition">Create</button>
                            <button type="button" onClick={() => setIsCreatingPlaylistInPlayer(false)} className="px-3 bg-white/[0.06] text-white rounded-lg py-1.5 text-xs font-bold hover:bg-white/[0.1] transition">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <button 
                            className="mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-sage-400 transition hover:bg-white/[0.06] outline-none" 
                            onClick={(e) => { e.stopPropagation(); setIsCreatingPlaylistInPlayer(true); }}
                          >
                            <Plus className="h-4.5 w-4.5" strokeWidth={2} />
                            <span>New Playlist</span>
                          </button>
                        
                          {customPlaylists.length > 0 && (
                            <div className="mb-2 mt-1 h-px w-full bg-white/[0.06]" />
                          )}

                          <div className="max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                            {customPlaylists.map(p => (
                              <button 
                                key={p.id}
                                className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-ink-100 transition hover:bg-white/[0.06] outline-none"
                                onClick={(e) => handleAddToPlaylist(p.id, e)}
                              >
                                <ListMusic className="h-4.5 w-4.5 shrink-0 text-ink-300" strokeWidth={1.8} />
                                <span className="truncate">{p.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

            {/* Main content: Album art + Controls + Queue */}
            <div className={`flex flex-1 flex-col items-center justify-center overflow-y-auto overscroll-none px-4 sm:px-8 pb-6 pt-0 transition-all duration-500 ${
              onlyLyricsModeActive 
                ? 'w-full max-w-4xl mx-auto' 
                : (isQueueOpen 
                    ? 'w-full md:flex-row md:items-center md:justify-center md:gap-6 lg:gap-8 xl:gap-10 max-w-[1440px] 2xl:max-w-[1640px] mx-auto' 
                    : 'w-full md:flex-row md:items-center md:justify-center md:gap-10 lg:gap-28 xl:gap-36 max-w-6xl mx-auto')
            }`}>

              {/* Album Art or Synced Lyrics */}
              {showLyrics ? (
                <div className={`w-full flex-1 flex flex-col overflow-hidden select-none z-30 relative px-4 sm:px-6 transition-all duration-500 lyrics-wrapper-fade ${
                  onlyLyricsModeActive 
                    ? 'h-[75vh] max-w-3xl justify-center' 
                    : (isQueueOpen 
                        ? 'h-[50vh] md:h-[60vh] max-w-[260px] sm:max-w-[300px] md:max-w-[320px] lg:max-w-[380px] xl:max-w-[420px]' 
                        : 'h-[50vh] md:h-[60vh] max-w-[220px] sm:max-w-[270px] md:max-w-[260px] lg:max-w-[420px] xl:max-w-[460px]')
                }`}>
                  <div 
                    ref={lyricsContainerRef}
                    className={`flex-1 overflow-y-auto px-6 sm:px-12 scroll-smooth flex flex-col transition-all duration-500 ${
                      onlyLyricsModeActive ? 'py-[35vh] gap-8' : 'py-[25vh] gap-6'
                    }`}
                    style={{ scrollbarWidth: "none" }}
                  >
                    {parsedLyrics.length > 0 ? (
                      parsedLyrics.map((lyric, idx) => {
                        const isActive = idx === currentLyricIndex;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleWaveformSeek(lyric.time)}
                            className={`transition-all duration-500 font-bold outline-none leading-relaxed tracking-tight ${
                              onlyLyricsModeActive ? 'text-center' : 'text-left'
                            } ${
                              onlyLyricsModeActive
                                ? `text-[1.8rem] md:text-[2.6rem] lg:text-[3.2rem] ${
                                    isActive 
                                      ? "text-white scale-[1.05] origin-center drop-shadow-[0_2px_16px_rgba(255,255,255,0.3)] opacity-100"
                                      : "text-white/30 scale-100 origin-center opacity-30 hover:text-white/60 focus:text-white/60"
                                  }`
                                : `text-[1.25rem] md:text-[1.45rem] ${
                                    isActive
                                      ? "text-white scale-[1.05] origin-left drop-shadow-[0_2px_12px_rgba(255,255,255,0.25)] opacity-100"
                                      : "text-white/30 scale-100 origin-left opacity-30 hover:text-white/60 focus:text-white/60"
                                  }`
                            }`}
                          >
                            <div>{lyric.text}</div>
                            {translatedLyrics[idx] && (
                              <div className={`font-semibold mt-1 opacity-60 transition-all ${
                                onlyLyricsModeActive 
                                  ? 'text-[1.2rem] md:text-[1.7rem] lg:text-[2.1rem]' 
                                  : 'text-[0.85rem] md:text-[0.95rem]'
                              }`}>
                                {translatedLyrics[idx].text}
                              </div>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in duration-500 gap-4 max-w-md mx-auto select-none">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-xl flex items-center justify-center backdrop-blur-md">
                          <Sparkles className={`w-7 h-7 ${isGeneratingLyrics ? 'text-primary animate-spin' : 'text-primary animate-pulse'}`} />
                        </div>

                        <div>
                          <p className="text-white/90 font-bold text-lg tracking-wide">
                            {isLiveLyricsActive ? "Live Voice Captioning..." : "No Synced Lyrics Found"}
                          </p>
                          <p className="text-white/40 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                            {isLiveLyricsActive 
                              ? (liveTranscriptLine || "Listening to audio vocals in real-time...")
                              : "This track or mashup doesn't have lyrics. Generate AI-synchronized lyrics with exact timestamps or stream real-time voice captions."
                            }
                          </p>
                        </div>

                        {aiLyricsError && (
                          <div className="px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium max-w-xs">
                            {aiLyricsError}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2 w-full justify-center">
                          <button
                            onClick={handleGenerateAiLyrics}
                            disabled={isGeneratingLyrics}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto"
                          >
                            {isGeneratingLyrics ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Generating AI Lyrics...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Generate AI Synced Lyrics</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleToggleLiveLyrics}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border text-xs font-medium transition-all hover:scale-105 active:scale-95 w-full sm:w-auto ${
                              isLiveLyricsActive 
                                ? 'bg-primary/20 border-primary/50 text-primary-light shadow-lg shadow-primary/20' 
                                : 'bg-white/[0.05] hover:bg-white/[0.10] border-white/[0.10] text-white/80'
                            }`}
                          >
                            <Mic2 className={`w-3.5 h-3.5 ${isLiveLyricsActive ? 'text-primary animate-pulse' : ''}`} />
                            <span>{isLiveLyricsActive ? 'Stop Live Captions' : 'Live Realtime Captions'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                (() => {
                  const hasActiveLyric = showFloatingLyrics && parsedLyrics.length > 0 && currentLyricIndex >= 0 && currentLyricIndex < parsedLyrics.length && !!parsedLyrics[currentLyricIndex]?.text && !isVideoMode;
                  return (
                    /* Album Art Container */
                    <div className={`w-full shrink-0 flex flex-col items-center transition-all duration-500 ${
                      isQueueOpen 
                        ? 'max-w-[240px] sm:max-w-[280px] md:max-w-[280px] lg:max-w-[340px] xl:max-w-[380px]' 
                        : 'max-w-[220px] sm:max-w-[270px] md:max-w-[260px] lg:max-w-[420px] xl:max-w-[460px]'
                    }`}>
                      <div 
                        className={`relative w-full transition-transform duration-500 ease-out`}
                        style={{
                          transform: hasActiveLyric ? 'translateY(-10px)' : 'translateY(0px)',
                          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        {/* Ambient glow beneath art */}
                        <div
                          className="np-album-glow np-breathe"
                          style={{
                            backgroundImage: currentTrack?.cover?.startsWith('linear')
                              ? currentTrack.cover
                              : `url("${currentTrack?.cover}")`,
                            opacity: isVideoMode ? 0 : 1,
                            transition: 'opacity 0.5s ease'
                          }}
                        />
                        <div 
                          className={`relative z-10 w-full transition-all duration-500 surface p-3.5 rounded-[2.5rem] border shadow-2xl ${isVideoMode ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
                          style={{
                            contain: 'layout style', // Avoid paint clipping for radiating visualizer bars
                            transform: 'translateZ(0)'
                          }}
                        >
                          <div className="relative aspect-square w-full rounded-[1.8rem]">
                            <div className="absolute inset-0 overflow-hidden rounded-[1.8rem]">
                              <AlbumArt
                                cover={currentTrack?.cover}
                                className="relative aspect-square w-full transition-transform duration-700 hover:scale-[1.012]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Floating Lyrics Container with smooth height & opacity transitions */}
                      <div
                        className="w-full overflow-hidden transition-all duration-500 ease-out flex justify-center items-center"
                        style={{
                          height: hasActiveLyric ? '4.5rem' : '0px',
                          opacity: hasActiveLyric ? 1 : 0,
                          marginTop: hasActiveLyric ? '0.75rem' : '0px',
                          marginBottom: hasActiveLyric ? '0.75rem' : '0px',
                          pointerEvents: hasActiveLyric ? 'auto' : 'none',
                          transition: 'height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out, margin 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        <FloatingLyrics 
                          text={hasActiveLyric ? parsedLyrics[currentLyricIndex]?.text : ""}
                          onClick={() => setShowLyrics(true)}
                        />
                      </div>

                      {/* Audio / Video Switch Buttons */}
                      {isYouTube && (
                        <div 
                          className="flex justify-center gap-1.5 z-30 relative surface p-1 rounded-full border transition-all"
                          style={{
                            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), margin-top 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                            marginTop: hasActiveLyric ? '0px' : '1.5rem',
                            transform: hasActiveLyric ? 'translateY(10px)' : 'translateY(0px)'
                          }}
                        >
                          <button
                            onClick={() => setIsVideoMode(false)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${!isVideoMode ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white hover:bg-white/[0.04]'}`}
                          >
                            Audio
                          </button>
                          <button
                            onClick={() => {
                              setIsVideoMode(true);
                              // Trigger play directly in the user click event to bypass mobile/tablet browser security restrictions
                              if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
                                try {
                                  ytPlayer.playVideo();
                                  const currentAudioTime = audioRef.current ? audioRef.current.currentTime : progress;
                                  ytPlayer.seekTo(currentAudioTime, true);
                                } catch (e) {
                                  console.error("Failed to start YouTube video playback: ", e);
                                }
                              }
                            }}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${isVideoMode ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white hover:bg-white/[0.04]'}`}
                          >
                            Video
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Controls */}
              {!onlyLyricsModeActive && (
                <div 
                  ref={controlsCardRef}
                  className={`relative z-20 mt-8 flex w-full flex-col shrink-0 md:mt-0 surface p-6 rounded-[2.2rem] border shadow-2xl overflow-hidden transition-all duration-500 ${
                    isQueueOpen 
                      ? 'max-w-[360px] md:max-w-[330px] lg:max-w-[390px] xl:max-w-[430px]' 
                      : 'max-w-[360px] md:max-w-[320px] lg:max-w-[440px]'
                  }`}
                >
                  
                  {/* Blurred Background Controls Wrapper */}
                  <div className={`flex flex-col w-full h-full transition-all duration-300 ${isTranslationMenuOpen || isDeviceMenuOpen || isRepeatMenuOpen || isSpatialMenuOpen ? 'blur-md opacity-25 scale-[0.98] pointer-events-none' : ''}`}>
                    {/* Track info — will-change:transform prevents compositor from re-rasterising on every progress update */}
                    <div className={`flex items-start justify-between gap-3 ${fadeClass}`} style={{ transform: 'translateZ(0)' }}>
                      <div className="min-w-0 flex-1" style={{ willChange: 'transform', contain: 'layout style', transform: 'translateZ(0)' }}>
                        <MarqueeText
                          text={currentTrack?.title}
                          className="text-[1.6rem] font-semibold leading-tight tracking-tight text-white md:text-[2rem] lg:text-[2.4rem]"
                        />
                        <p 
                          onClick={() => { setIsExpanded(false); navigate('/search?q=' + encodeURIComponent(currentTrack?.artist)); }}
                          className="mt-1.5 truncate text-[0.95rem] font-medium text-white/45 md:text-lg hover:text-sage-400 transition-colors cursor-pointer block w-full animate-in"
                        >
                          {currentTrack?.artist}
                        </p>
                      </div>
                      <button
                        onClick={toggleLike}
                        className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                          isLiked ? 'text-sage-400' : 'text-white/35 hover:text-white/70'
                        }`}
                      >
                        <Heart
                          className={`h-[22px] w-[22px] transition-all duration-300 ${isLiked ? 'fill-current drop-shadow-[0_0_10px_rgba(195,208,184,0.55)]' : ''}`}
                          strokeWidth={isLiked ? 0 : 1.8}
                        />
                      </button>
                    </div>

                    {/* Waveform progress — replaces static bar in full-screen player */}
                    <div className="mt-5 md:mt-7">
                      <WaveformProgress
                        progress={progress}
                        progressRef={progressRef}
                        totalSeconds={totalSeconds}
                        isPlaying={isPlaying}
                        onSeek={handleWaveformSeek}
                        waveColors={waveformColors}
                        trackId={currentTrack?.id ?? 'default'}
                      />
                    </div>

                    {/* Playback controls */}
                    <div className="mt-7 flex items-center justify-between md:mt-9" style={{ transform: 'translateZ(0)' }}>
                      <div className="flex items-center gap-1.5">
                        {renderRepeatButton(true)}
                        <button
                          onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                          className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-90 tactile-btn ${
                            autoplayEnabled ? 'text-sage-400 drop-shadow-[0_0_8px_rgba(195,208,184,0.5)] bg-white/5' : 'text-white/55 hover:text-white hover:bg-white/5'
                          }`}
                          title="Autoplay Similar Tracks"
                        >
                          <Infinity className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.8} />
                        </button>
                        <div className="relative">
                          <button
                            onMouseDown={handleLyricsButtonMouseDown}
                            onMouseUp={handleLyricsButtonMouseUp}
                            onMouseLeave={handleLyricsButtonMouseLeave}
                            onTouchStart={handleLyricsButtonTouchStart}
                            onTouchEnd={handleLyricsButtonTouchEnd}
                            onContextMenu={(e) => { e.preventDefault(); setIsTranslationMenuOpen(!isTranslationMenuOpen); }}
                            className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-90 tactile-btn ${
                              showLyrics ? 'text-sage-400 drop-shadow-[0_0_8px_rgba(195,208,184,0.5)] bg-white/5' : 'text-white/55 hover:text-white hover:bg-white/5'
                            }`}
                            title="Toggle Lyrics (Hold to Translate)"
                          >
                            <Mic2 className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.8} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={skipBack}
                        className="flex h-11 w-11 items-center justify-center text-white/55 transition-all duration-200 hover:text-white active:scale-90 tactile-btn"
                      >
                        <SkipBack className="h-7 w-7 fill-current" strokeWidth={0} />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="morphism-play-btn flex h-[62px] w-[62px] items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95 md:h-[70px] md:w-[70px] tactile-btn"
                      >
                        {isPlaying ? (
                          <Pause className="h-7 w-7 fill-current md:h-8 md:w-8" strokeWidth={0} />
                        ) : (
                          <Play className="ml-1 h-7 w-7 fill-current md:h-8 md:w-8" strokeWidth={0} />
                        )}
                      </button>
                      <button
                        onClick={skipForward}
                        className="flex h-11 w-11 items-center justify-center text-white/55 transition-all duration-200 hover:text-white active:scale-90 tactile-btn"
                      >
                        <SkipForward className="h-7 w-7 fill-current" strokeWidth={0} />
                      </button>
                      {renderQueueButton(true)}
                    </div>

                    {/* Volume & Audio Controls */}
                    <div className="mt-8 flex w-full items-center gap-3 md:mt-10">
                      {renderDeviceMenu(true)}
                      <button
                        onClick={() => setIsSpatialMenuOpen(prev => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 outline-none select-none ${
                          spatialState.enabled
                            ? 'bg-sage-400/20 text-sage-300 border-sage-400/40 shadow-lg shadow-sage-400/10 hover:bg-sage-400/30'
                            : 'bg-white/[0.04] text-white/50 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                        title="3D Spatial Audio & Soundstage"
                      >
                        <Headphones className="h-3.5 w-3.5" />
                        <span className="text-[11px] tracking-tight">{spatialState.enabled ? '3D Spatial' : 'Stereo'}</span>
                      </button>
                      <div className="flex-1">
                        {renderVolumeBar(true)}
                      </div>
                    </div>
                  </div>

                  {/* 1. Centered Lyrics Translation Popover Menu (Hold/Right-Click Triggered) */}
                  {isTranslationMenuOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/15 animate-in fade-in duration-200">
                      <div className="fixed inset-0" onClick={() => setIsTranslationMenuOpen(false)} />
                      <div className="relative w-full max-w-[200px] z-50 surface/90 p-2 shadow-2xl rounded-2xl border border-white/10 animate-in zoom-in-95 duration-150 backdrop-blur-xl">
                        <div className="text-[9px] font-bold text-white/30 px-2.5 py-1.5 uppercase tracking-wider select-none border-b border-white/5 mb-1 bg-white/[0.01]">Translate to</div>
                        {['none', 'en', 'es', 'fr', 'de', 'hi'].map((lang) => {
                          const labelMap = { none: 'Original', en: 'English', es: 'Spanish', fr: 'French', de: 'German', hi: 'Hindi' };
                          return (
                            <button
                              key={lang}
                              onClick={() => {
                                handleTranslate(lang);
                                setIsTranslationMenuOpen(false);
                              }}
                              className={`flex w-full items-center rounded-xl px-2.5 py-2 text-xs text-left transition hover:bg-white/[0.06] outline-none ${
                                translationLang === lang ? 'text-sage-400 font-bold bg-white/5' : 'text-white/70 hover:text-white'
                              }`}
                            >
                              {labelMap[lang]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Centered Device Selector Menu Popover */}
                  {isDeviceMenuOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/15 animate-in fade-in duration-200">
                      <div className="fixed inset-0" onClick={() => setIsDeviceMenuOpen(false)} />
                      <div className="relative w-full max-w-[240px] z-50 surface/90 p-2 shadow-2xl rounded-2xl border border-white/10 animate-in zoom-in-95 duration-150 backdrop-blur-xl flex flex-col max-h-[90%]">
                        <div className="px-3 py-2 border-b border-white/5 bg-white/[0.01] select-none mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Connect to a device</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-1 gap-1 flex flex-col" style={{ scrollbarWidth: 'none' }}>
                          {sessions.map(session => {
                            const isActive = session.id === activePlaybackDeviceId;
                            const Icon = session.deviceType === 'mobile' ? Smartphone : Laptop;
                            return (
                              <button
                                key={session.id}
                                onClick={() => { 
                                  if (session.id === sessionId && audioRef.current) {
                                    audioRef.current.play().catch(e => console.log("Unlock play:", e));
                                  }
                                  switchActiveDevice(session.id); 
                                  setIsDeviceMenuOpen(false); 
                                }}
                                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${isActive ? 'bg-sage-400/15 text-sage-400 font-bold' : 'hover:bg-white/[0.06] text-white/70 hover:text-white'}`}
                              >
                                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-sage-400' : 'text-white/40'}`} />
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate text-xs font-semibold">{session.device} {session.id === sessionId ? '(This)' : ''}</span>
                                  <span className="truncate text-[9px] opacity-50">{session.location || 'Unknown'}</span>
                                </div>
                              </button>
                            );
                          })}
                          {sessions.length === 0 && (
                            <div className="px-3 py-2 text-xs text-white/30 italic">No other devices found.</div>
                          )}
                        </div>

                        {/* Spotify Smart Bridge Section */}
                        <div className="p-2.5 border-t border-white/5 bg-emerald-950/25 rounded-b-2xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.686.473-1.045.253-2.865-1.75-6.471-2.146-10.72-1.176-.407.094-.814-.162-.907-.57-.094-.408.162-.815.57-.908 4.654-1.064 8.643-.615 11.849 1.356.359.219.473.687.253 1.045zm1.472-3.272c-.274.446-.86.588-1.306.313-3.28-2.015-8.28-2.599-12.16-1.422-.501.152-1.034-.135-1.186-.637-.152-.501.135-1.034.637-1.186 4.432-1.346 9.948-.696 13.702 1.626.446.275.588.86.313 1.306zm.126-3.41c-3.935-2.337-10.427-2.553-14.19-1.411-.605.184-1.246-.16-1.43-.765-.184-.606.16-1.247.765-1.431 4.331-1.314 11.499-1.062 16.027 1.625.545.323.725 1.033.402 1.578-.323.546-1.033.726-1.574.404z"/>
                              </svg>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-emerald-300">Spotify Bridge</span>
                                <span className="text-[9px] text-white/50">{spotifyBridgeState?.connected ? (spotifyBridgeState?.active ? 'Live Sound Output' : 'Connected') : 'Remote Sync'}</span>
                              </div>
                            </div>
                            {spotifyBridgeState?.connected ? (
                              <button
                                onClick={() => setSpotifyBridgeEnabled(!spotifyBridgeState?.active)}
                                className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full transition ${
                                  spotifyBridgeState?.active ? 'bg-emerald-400 text-black shadow-sm' : 'bg-white/10 text-white/50 hover:bg-white/20'
                                }`}
                              >
                                {spotifyBridgeState?.active ? 'Syncing' : 'Paused'}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const token = prompt("Enter Spotify Access Token (or leave blank to start OAuth login):");
                                  if (token && token.trim()) {
                                    setSpotifyToken(token.trim());
                                  } else if (token !== null) {
                                    startSpotifyAuth();
                                  }
                                }}
                                className="text-[9px] uppercase font-bold px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm transition"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Centered Repeat Count Selector Menu Popover */}
                  {isRepeatMenuOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/15 animate-in fade-in duration-200">
                      <div className="fixed inset-0" onClick={() => setIsRepeatMenuOpen(false)} />
                      <div className="relative w-full max-w-[200px] z-50 surface/90 p-2 shadow-2xl rounded-2xl border border-white/10 animate-in zoom-in-95 duration-150 backdrop-blur-xl">
                        <div className="text-[9px] font-bold text-white/30 px-2.5 py-1.5 uppercase tracking-wider select-none border-b border-white/5 mb-1 bg-white/[0.01]">Repeat Option</div>
                        {[0, 1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setRepeatCount(num);
                              setIsRepeatMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-left transition hover:bg-white/[0.06] outline-none ${
                              repeatCount === num ? 'text-sage-400 font-bold bg-white/5' : 'text-white/70 hover:text-white'
                            }`}
                          >
                            <span>{num === 0 ? 'No repeat' : `${num} time${num > 1 ? 's' : ''}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Centered 3D Spatial Audio & Soundstage Popover Menu */}
                  {isSpatialMenuOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                      <div className="fixed inset-0" onClick={() => setIsSpatialMenuOpen(false)} />
                      <div className="relative w-full max-w-[290px] z-50 bg-[#121612]/95 p-4 shadow-2xl rounded-3xl border border-white/15 animate-in zoom-in-95 duration-150 backdrop-blur-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-sage-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">3D Spatial Audio</span>
                          </div>
                          <button
                            onClick={() => setSpatialAudioEnabled(!spatialState.enabled)}
                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full transition-all ${
                              spatialState.enabled 
                                ? 'bg-sage-400 text-ink-950 shadow-md hover:bg-sage-300' 
                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                            }`}
                          >
                            {spatialState.enabled ? 'Enabled' : 'Bypass'}
                          </button>
                        </div>

                        {spatialState.enabled ? (
                          <>
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Acoustic Stage</span>
                              <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                                {SPATIAL_PRESETS.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => setSpatialAudioMode(p.id)}
                                    className={`flex flex-col text-left px-3 py-2 rounded-xl border transition-all ${
                                      spatialState.mode === p.id 
                                        ? 'bg-sage-400/20 border-sage-400/50 text-sage-200 shadow-sm' 
                                        : 'bg-white/[0.04] border-white/5 text-white/70 hover:bg-white/[0.08] hover:text-white'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold">{p.name}</span>
                                    <span className="text-[9px] opacity-60 leading-tight mt-0.5">{p.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-white/10">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-white/60">Soundstage Width</span>
                                <span className="text-sage-300 font-mono font-bold">{Math.round(spatialState.width * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="1.0"
                                max="2.0"
                                step="0.05"
                                value={spatialState.width}
                                onChange={(e) => setSpatialAudioWidth(parseFloat(e.target.value))}
                                className="w-full accent-sage-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="py-4 text-center text-xs text-white/40 italic">
                            Spatial Audio is bypassed. Toggle Enabled to activate 3D Soundstage.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Now Playing Queue Card (Docked on Right, Matching Length with Fluid Expand Animations) */}
              {!onlyLyricsModeActive && isQueueOpen && (
                <NowPlayingQueue
                  isOpen={isQueueOpen}
                  onClose={() => setIsQueueOpen(false)}
                  morphism={morphism}
                  setProgress={setProgress}
                  setRepeatCount={setRepeatCount}
                  matchedHeight={controlsHeight}
                />
              )}
        </div>
      </div>
    );
  })()}

      {/* ═══ PURE AMBIANCE MODE HUD & CONTROLS OVERLAY ═══ */}
      {isAmbianceMode && (
        <div 
          className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-5 md:p-8 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAmbianceHudVisible(prev => !prev);
            }
          }}
        >
          {/* Top Bar: Ambiance Badge & Exit Button */}
          <div 
            className={`flex items-center justify-between w-full transition-all duration-500 ease-out ${
              isAmbianceHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-4 py-2 shadow-2xl pointer-events-auto">
              <Sparkles className="h-4 w-4 text-sage-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/90 tracking-wide">Pure Ambiance System</span>
              <span className="hidden sm:inline text-[10px] text-white/40 border-l border-white/10 pl-2">
                Move cursor to reveal controls • Esc / Click to restore UI
              </span>
            </div>

            <button
              onClick={() => setIsAmbianceMode(false)}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-xl border border-white/15 px-4 py-2 text-xs font-bold text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 hover:border-white/30"
              title="Show Player UI (Esc)"
              type="button"
            >
              <Eye className="h-4 w-4 text-sage-400" />
              <span>Show Player UI</span>
            </button>
          </div>

          {/* Bottom Floating Zen Player Island */}
          <div 
            className={`mx-auto w-full max-w-md transition-all duration-500 ease-out ${
              isAmbianceHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="pointer-events-auto flex items-center justify-between gap-3 sm:gap-4 rounded-3xl bg-black/55 hover:bg-black/65 backdrop-blur-2xl border border-white/15 p-3 sm:p-4 shadow-dock transition-all duration-300">
              {/* Track Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-md">
                  <AlbumArt cover={currentTrack?.cover} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-semibold text-white tracking-tight">{currentTrack?.title}</p>
                  <p className="truncate text-[10px] sm:text-xs font-medium text-white/50">{currentTrack?.artist}</p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={toggleLike}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 ${
                    isLiked ? 'text-sage-400' : 'text-white/40 hover:text-white'
                  }`}
                  title="Like Track"
                  type="button"
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} strokeWidth={isLiked ? 0 : 1.8} />
                </button>
                <button
                  onClick={skipBack}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition active:scale-90"
                  title="Previous"
                  type="button"
                >
                  <SkipBack className="h-4 w-4 fill-current" strokeWidth={0} />
                </button>
                <button
                  onClick={togglePlay}
                  className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition shadow-lg"
                  title={isPlaying ? "Pause" : "Play"}
                  type="button"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" strokeWidth={0} />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5 fill-current" strokeWidth={0} />
                  )}
                </button>
                <button
                  onClick={skipForward}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition active:scale-90"
                  title="Next"
                  type="button"
                >
                  <SkipForward className="h-4 w-4 fill-current" strokeWidth={0} />
                </button>
                <div className="h-5 w-px bg-white/10 mx-0.5" />
                <button
                  onClick={() => setIsAmbianceMode(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
                  title="Exit Ambiance Mode"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  </div>
);

  if (playlist.length === 0) {
    return null;
  }

  return (
    <>
      <div className={isExpanded ? 'pointer-events-none opacity-0' : 'transition-opacity duration-300 opacity-100'}>
         {MiniPlayer}
      </div>
      {FullPlayer}
      <QueuePanel 
        isOpen={isQueueOpen && !isExpanded} 
        onClose={() => setIsQueueOpen(false)} 
        queueAnchorPos={queueAnchorPos} 
        morphism={morphism} 
        isExpanded={isExpanded} 
        setProgress={setProgress} 
        setRepeatCount={setRepeatCount} 
      />
      <SleepTimerModal 
        isOpen={isSleepTimerMenuOpen} 
        onClose={() => setIsSleepTimerMenuOpen(false)} 
        audioRef={audioRef} 
        volume={volume} 
      />
      <ListeningPartyModal 
        isOpen={isPartyMenuOpen} 
        onClose={() => setIsPartyMenuOpen(false)} 
      />
      <LyricShareModal
        isOpen={isLyricShareOpen}
        onClose={() => setIsLyricShareOpen(false)}
        track={currentTrack}
        parsedLyrics={parsedLyrics}
      />
      <audio 
        ref={(el) => {
          audioEl1Ref.current = el;
          if (activePlayerRef.current === 'A') {
            audioRef.current = el;
          }
        }}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => handleAudioEnded('A')}
        onError={() => {
          if (activePlayerRef.current !== 'A') return;
          if (currentTrack?.source === 'global') return;
          if (currentTrack?.previewUrl && audioEl1Ref.current && !audioEl1Ref.current.src.includes(currentTrack.previewUrl)) {
            console.warn("🎯 Primary stream slow/failed, switching to preview fallback...");
            audioEl1Ref.current.src = resolveAudioUrl(currentTrack.previewUrl);
            audioEl1Ref.current.play().catch(() => {});
          }
        }}
        onLoadedMetadata={(e) => {
          if (activePlayerRef.current !== 'A') return;
          if (e.target.duration && !isNaN(e.target.duration) && e.target.duration !== Infinity) {
            setDuration(e.target.duration);
          }
        }}
        onVolumeChange={(e) => {
          if (activePlayerRef.current !== 'A') return;
          if (!isDraggingVolume && !e.target.muted) {
            setVolume(e.target.volume);
          }
          setIsMuted(e.target.muted);
        }}
      />
      <audio 
        ref={(el) => {
          audioEl2Ref.current = el;
          if (activePlayerRef.current === 'B') {
            audioRef.current = el;
          }
        }}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => handleAudioEnded('B')}
        onError={() => {
          if (activePlayerRef.current !== 'B') return;
          if (currentTrack?.source === 'global') return;
          if (currentTrack?.previewUrl && audioEl2Ref.current && !audioEl2Ref.current.src.includes(currentTrack.previewUrl)) {
            console.warn("🎯 Primary stream slow/failed, switching to preview fallback...");
            audioEl2Ref.current.src = resolveAudioUrl(currentTrack.previewUrl);
            audioEl2Ref.current.play().catch(() => {});
          }
        }}
        onLoadedMetadata={(e) => {
          if (activePlayerRef.current !== 'B') return;
          if (e.target.duration && !isNaN(e.target.duration) && e.target.duration !== Infinity) {
            setDuration(e.target.duration);
          }
        }}
        onVolumeChange={(e) => {
          if (activePlayerRef.current !== 'B') return;
          if (!isDraggingVolume && !e.target.muted) {
            setVolume(e.target.volume);
          }
          setIsMuted(e.target.muted);
        }}
      />
      {/* Hidden preloader audio tag to buffer the next song's bytes ahead of time */}
      {nextTrackUrl && (
        <audio
          key={`preload-${nextTrack.id}`}
          src={nextTrackUrl}
          preload="auto"
          style={{ display: 'none' }}
        />
      )}
      
      {/* Mini Media Controller in Only Lyrics Mode */}
      {onlyLyricsModeActive && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLyricsControllerOpen(!isLyricsControllerOpen);
            }}
            className={`lyrics-mini-toggle ${isLyricsControllerOpen ? 'open' : ''}`}
            title={isLyricsControllerOpen ? "Collapse controls" : "Expand controls"}
            type="button"
          >
            {isLyricsControllerOpen ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <Music className="h-5 w-5 animate-pulse" />
            )}
          </button>

          <div
            onMouseMove={resetLyricsControllerTimeout}
            onMouseEnter={resetLyricsControllerTimeout}
            className={`lyrics-mini-controller ${isLyricsControllerOpen ? 'open' : ''}`}
          >
            {/* Song Metadata Row */}
            <div className="flex items-center gap-3 mb-4 select-none">
              <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                <AlbumArt cover={currentTrack?.cover} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate leading-tight">
                  {currentTrack?.title}
                </p>
                <p className="text-xs text-white/50 truncate mt-0.5">
                  {currentTrack?.artist}
                </p>
              </div>
            </div>

            {/* Progress Slider Row */}
            <div className="mb-4">
              <div className="flex justify-between items-center text-[10px] text-white/40 mb-1 select-none">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(totalSeconds)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={totalSeconds || 100}
                value={progress}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setProgress(val);
                  handleWaveformSeek(val);
                  resetLyricsControllerTimeout();
                }}
                className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-white hover:accent-sage-400 outline-none transition-colors"
                style={{
                  background: `linear-gradient(to right, #fff 0%, #fff ${(progress / (totalSeconds || 1)) * 100}%, rgba(255,255,255,0.15) ${(progress / (totalSeconds || 1)) * 100}%, rgba(255,255,255,0.15) 100%)`
                }}
              />
            </div>

            {/* Playback Controls Row */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipBack();
                  resetLyricsControllerTimeout();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/5 active:scale-90 transition-all cursor-pointer"
                title="Previous track"
                type="button"
              >
                <SkipBack className="h-5 w-5 fill-current" strokeWidth={0} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                  resetLyricsControllerTimeout();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
                title={isPlaying ? "Pause" : "Play"}
                type="button"
              >
                {isPlaying ? (
                  <Pause className="h-4.5 w-4.5 fill-current" strokeWidth={0} />
                ) : (
                  <Play className="ml-0.5 h-4.5 w-4.5 fill-current" strokeWidth={0} />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipForward();
                  resetLyricsControllerTimeout();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/5 active:scale-90 transition-all cursor-pointer"
                title="Next track"
                type="button"
              >
                <SkipForward className="h-5 w-5 fill-current" strokeWidth={0} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Dynamic Server URL Configuration Modal */}
      <ServerUrlModal 
        isOpen={showServerUrlModal} 
        onClose={() => setShowServerUrlModal(false)} 
      />
    </>
  );
}
