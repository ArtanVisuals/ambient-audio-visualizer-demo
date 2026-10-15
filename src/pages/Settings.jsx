import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { Plus, Trash2, Check, Save, Monitor, Smartphone, Tablet, Shield, LogOut, Edit2, Info, ChevronDown, ChevronUp, RefreshCw, Download, Headphones } from "lucide-react";
import { Browser } from "@capacitor/browser";
import { 
  setSpatialAudioEnabled, 
  setSpatialAudioMode, 
  setSpatialAudioWidth, 
  getSpatialAudioState,
  subscribeSpatialAudio,
  SPATIAL_PRESETS
} from "../utils/spatialAudio";
import { 
  IconGlass, 
  IconSquare, 
  IconBolt, 
  IconCloud, 
  IconAdjustmentsHorizontal,
  IconSparkles,
  IconVolume2,
  IconMicrophone,
  IconDiamond,
  IconEyeOff,
  IconDeviceDesktop,
  IconMusic
} from "@tabler/icons-react";

export function Settings() {
  const [spatialEnabled, setSpatialEnabled] = useState(() => getSpatialAudioState().enabled);
  const [spatialMode, setSpatialMode] = useState(() => getSpatialAudioState().mode);
  const [spatialWidth, setSpatialWidth] = useState(() => getSpatialAudioState().width);

  useEffect(() => {
    return subscribeSpatialAudio((st) => {
      setSpatialEnabled(st.enabled);
      setSpatialMode(st.mode);
      setSpatialWidth(st.width);
    });
  }, []);
  const { 
    ambientEffectsEnabled, 
    setAmbientEffectsEnabled,
    backgroundAmbiancePlay,
    setBackgroundAmbiancePlay,
    theme,
    setTheme,
    particlesMode,
    setParticlesMode,
    crossPlayEnabled,
    setCrossPlayEnabled,
    ambientSettings,
    setAmbientSettings,
    customPresets,
    saveAmbientPreset,
    deleteAmbientPreset,
    user,
    spotifyBridgeState,
    startSpotifyAuth,
    setSpotifyToken,
    setSpotifyBridgeEnabled,
    syncNow,
    getSpotifyDiagnostics,
    sessions,
    terminateSession,
    renameSession,
    updateProfile,
    customUserId,
    sessionId,
    refreshSessions,
    crossfadeDuration,
    setCrossfadeDuration,
    morphism,
    setMorphism,
    customColors,
    setCustomColors,
    showAlert,
    enableDateTimeAlert,
    setEnableDateTimeAlert,
    enableLiveMatchScoreAlert,
    setEnableLiveMatchScoreAlert,
    liveMatchSport,
    setLiveMatchSport,
    stereoSeparationEnabled,
    setStereoSeparationEnabled,
    ambientMode,
    setAmbientMode,
    siteSettings,
    refreshSettings
  } = usePlayer();

  const CURRENT_VERSION = window.__ota_version__ || "1.0.0";
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState("");

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        refreshSettings();
        await new Promise(resolve => setTimeout(resolve, 800));
        const latestVersion = data.app_version || "1.0.0";
        if (latestVersion !== CURRENT_VERSION) {
          showAlert(`A new update is available! Version: v${latestVersion}`, "Update Available");
        } else {
          showAlert("You are running the latest version of Sonora.", "App Up-to-Date");
        }
      } else {
        throw new Error("Failed to fetch settings");
      }
    } catch (err) {
      console.error(err);
      showAlert("Failed to check for updates. Please try again later.", "Connection Error");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleUpdateApp = async () => {
    const jsPath = siteSettings?.app_js_file;
    const cssPath = siteSettings?.app_css_file;

    if (!jsPath || !cssPath) {
      // Fallback if JS/CSS paths are not exposed by the server
      const apkUrl = siteSettings?.app_apk_url 
        ? (siteSettings.app_apk_url.startsWith('http')
            ? siteSettings.app_apk_url
            : `${window.location.origin}${siteSettings.app_apk_url}`)
        : '';
        
      if (window.Capacitor) {
        showAlert("An update is starting. The APK will be downloaded in your browser. Install it to apply the update.", "App Update").then(async () => {
          try {
            await Browser.open({ url: apkUrl, windowName: '_system' });
          } catch (err) {
            console.error("Browser plugin failed, falling back to window.open", err);
            window.open(apkUrl, '_system');
          }
        });
      } else {
        showAlert("Applying updates. The page will now reload.", "System Update").then(() => {
          window.location.reload();
        });
      }
      return;
    }

    setIsUpdating(true);
    setUpdateProgress("Initializing update...");

    try {
      // Download JS code
      setUpdateProgress("Downloading code logic...");
      const jsRes = await fetch(jsPath);
      if (!jsRes.ok) throw new Error(`Failed to download application script (Status: ${jsRes.status})`);
      const jsContentType = jsRes.headers.get("content-type") || "";
      if (jsContentType && !jsContentType.includes("javascript") && !jsContentType.includes("application/octet-stream")) {
        throw new Error("Invalid format received for script: expected javascript, got " + jsContentType);
      }
      const jsText = await jsRes.text();

      // Download CSS styling
      setUpdateProgress("Downloading visual assets...");
      const cssRes = await fetch(cssPath);
      if (!cssRes.ok) throw new Error(`Failed to download application styling (Status: ${cssRes.status})`);
      const cssContentType = cssRes.headers.get("content-type") || "";
      if (cssContentType && !cssContentType.includes("css") && !cssContentType.includes("application/octet-stream")) {
        throw new Error("Invalid format received for styling: expected css, got " + cssContentType);
      }
      const cssText = await cssRes.text();

      // Save to localStorage
      setUpdateProgress("Applying local patch...");
      localStorage.setItem('sonora_cached_js', jsText);
      localStorage.setItem('sonora_cached_css', cssText);
      localStorage.setItem('sonora_active_version', appVersion);

      setUpdateProgress("Update applied! Reloading...");
      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.reload();
    } catch (err) {
      console.error("OTA update error:", err);
      showAlert(`Update failed: ${err.message}. Please try again.`, "Update Error");
    } finally {
      setIsUpdating(false);
      setUpdateProgress("");
    }
  };

  const appVersion = siteSettings?.app_version || "1.0.0";
  const hasUpdate = appVersion !== CURRENT_VERSION;

  const [isColorPaletteExpanded, setIsColorPaletteExpanded] = useState(() => {
    return localStorage.getItem('aura_color_palette_expanded') !== 'false';
  });

  // Use sessionId from context — more reliable than reading localStorage directly
  const currentSessionId = sessionId;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingName, setEditingName] = useState("");


  const [musixmatchKey, setMusixmatchKey] = useState(() => {
    return localStorage.getItem('aura_musixmatch_api_key') || "";
  });

  const handleSaveMusixmatchKey = () => {
    localStorage.setItem('aura_musixmatch_api_key', musixmatchKey.trim());
    showAlert('Musixmatch API Key saved successfully!');
  };

  const handleDeleteMusixmatchKey = () => {
    localStorage.removeItem('aura_musixmatch_api_key');
    setMusixmatchKey("");
    showAlert('Musixmatch API Key cleared.');
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const [tempColors, setTempColors] = useState({
    background: customColors?.background || '#090a09',
    sidebar: customColors?.sidebar || '#101210',
    player: customColors?.player || '#161a16',
    widgets: customColors?.widgets || '#1c221c'
  });

  useEffect(() => {
    if (customColors) {
      setTempColors({
        background: customColors.background,
        sidebar: customColors.sidebar,
        player: customColors.player,
        widgets: customColors.widgets
      });
    }
  }, [customColors]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    setIsFullscreen(!!document.fullscreenElement);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const isNativeApp = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';

  // Screen Layout style state & handlers
  const [nativeLayout, setNativeLayout] = useState(() => {
    return localStorage.getItem('sonora_native_layout') || 'curved';
  });

  const handleSaveNativeLayout = (layout) => {
    setNativeLayout(layout);
    localStorage.setItem('sonora_native_layout', layout);
    
    // Apply layout style classes to documentElement instantly
    document.documentElement.classList.remove('native-layout-curved', 'native-layout-fullscreen');
    document.documentElement.classList.add(`native-layout-${layout}`);
    
    // Trigger viewport resize event so layout recalculations trigger
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  // Screen Zoom Scaling state & handlers
  const [isAutoZoom, setIsAutoZoom] = useState(() => {
    return localStorage.getItem('sonora_auto_zoom') !== 'false';
  });

  const [zoomPercent, setZoomPercent] = useState(() => {
    const stored = localStorage.getItem('sonora_user_zoom');
    if (stored) {
      return Math.round(parseFloat(stored) * 100);
    }
    const isTablet = window.innerWidth >= 768 || Math.min(window.screen.width, window.screen.height) >= 600;
    return isTablet ? 75 : 90;
  });

  const [isReloadingZoom, setIsReloadingZoom] = useState(false);

  // Server Connection URL state
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('sonora_server_url') || window.DEFAULT_NATIVE_SERVER_URL || '');
  const [serverTestResult, setServerTestResult] = useState(null); // null | 'testing' | 'ok' | 'fail'
  const [serverTestMessage, setServerTestMessage] = useState('');

  const handleTestServerUrl = async (urlToTest) => {
    const testUrl = (urlToTest || serverUrl || '').trim().replace(/\/$/, '');
    if (!testUrl) return;
    setServerTestResult('testing');
    setServerTestMessage('Testing connection...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${testUrl}/api/health`, { 
        signal: controller.signal,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        setServerTestResult('ok');
        setServerTestMessage(data.message || 'Connected successfully!');
      } else {
        setServerTestResult('fail');
        setServerTestMessage(`Server returned HTTP ${res.status}`);
      }
    } catch (err) {
      setServerTestResult('fail');
      setServerTestMessage(err.name === 'AbortError' ? 'Connection timed out (6s)' : (err.message || 'Connection failed'));
    }
  };

  const handleSaveServerUrl = () => {
    const formatted = serverUrl.trim().replace(/\/$/, '');
    if (window.updateNativeServerUrl) {
      window.updateNativeServerUrl(formatted || null);
    } else {
      if (formatted) {
        localStorage.setItem('sonora_server_url', formatted);
      } else {
        localStorage.removeItem('sonora_server_url');
      }
      window.location.reload();
    }
  };

  const handleToggleAutoZoom = (checked) => {
    setIsAutoZoom(checked);
    localStorage.setItem('sonora_auto_zoom', String(checked));
    if (isNativeApp) {
      if (checked) {
        localStorage.removeItem('sonora_user_zoom');
        const isTablet = window.screen.width >= 768 || Math.min(window.screen.width, window.screen.height) >= 600;
        const targetZoom = isTablet ? 0.75 : 0.90;
        setZoomPercent(Math.round(targetZoom * 100));
      } else {
        localStorage.setItem('sonora_user_zoom', String(zoomPercent / 100));
      }
      
      setIsReloadingZoom(true);
      if (window.zoomReloadTimeout) {
        clearTimeout(window.zoomReloadTimeout);
      }
      window.zoomReloadTimeout = setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleZoomChange = (val) => {
    setZoomPercent(val);
    if (!isAutoZoom) {
      localStorage.setItem('sonora_user_zoom', String(val / 100));
      if (isNativeApp) {
        setIsReloadingZoom(true);
        if (window.zoomReloadTimeout) {
          clearTimeout(window.zoomReloadTimeout);
        }
        window.zoomReloadTimeout = setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  };


  // Help & Support Queries State
  const [queryTopic, setQueryTopic] = useState("improvement");
  const [queryMessage, setQueryMessage] = useState("");
  const [queryStatus, setQueryStatus] = useState("idle");
  const [queryError, setQueryError] = useState(null);
  const [userQueries, setUserQueries] = useState([]);

  const fetchUserQueries = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user/queries?userId=${user.uid}`);
      if (res.ok) {
        setUserQueries(await res.json());
      }
    } catch (err) {
      console.error("Error fetching user queries:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserQueries();
      const interval = setInterval(fetchUserQueries, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!queryMessage.trim()) return;
    
    setQueryStatus('submitting');
    setQueryError(null);
    
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          topic: queryTopic,
          message: queryMessage
        })
      });
      if (res.ok) {
        setQueryStatus('success');
        setQueryMessage('');
        fetchUserQueries();
      } else {
        const errData = await res.json();
        setQueryStatus('error');
        setQueryError(errData.error || 'Failed to submit query.');
      }
    } catch (err) {
      setQueryStatus('error');
      setQueryError('Network error: ' + err.message);
    }
  };

  const handleUpdateName = () => {
    if (newName.trim() && newName !== user.displayName) {
      updateProfile(newName);
      setIsEditingName(false);
    } else {
      setIsEditingName(false);
    }
  };


  const handleRename = (sessId) => {
    if (editingName.trim()) {
      renameSession(sessId, editingName);
      setEditingSessionId(null);
      setEditingName("");
    }
  };

  const getDeviceIcon = (deviceType, deviceName) => {
    if (deviceType === 'pc' || deviceName?.includes("PC") || deviceName?.includes("Mac")) return Monitor;
    if (deviceType === 'tab' || deviceName?.includes("iPad") || deviceName?.includes("Tablet")) return Tablet;
    return Smartphone;
  };

  const isOnline = (lastSeen) => {
    if (!lastSeen) return false;
    try {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      // Use a 65s threshold for the 30s heartbeat
      return (now - lastSeenDate) < 65000;
    } catch (e) {
      return false;
    }
  };

  const [newPresetName, setNewPresetName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const defaultPresets = [
    { id: 'default', name: 'Original', settings: { glow: 1.0, bass: 1.0, mids: 1.0, highs: 1.0 } },
    { id: 'cinematic', name: 'Cinematic', settings: { glow: 1.25, bass: 1.4, mids: 0.85, highs: 0.65 } },
    { id: 'vibrant', name: 'Vibrant', settings: { glow: 1.5, bass: 1.2, mids: 1.2, highs: 1.2 } },
    { id: 'chill', name: 'Chill', settings: { glow: 0.8, bass: 0.7, mids: 0.6, highs: 0.5 } },
    { id: 'woofer', name: 'Woofer Monster', settings: { glow: 1.0, bass: 1.8, mids: 0.5, highs: 0.4 } },
    { id: 'phonk', name: 'Phonk & Bass', settings: { glow: 1.80, bass: 2.30, mids: 1.10, highs: 1.70 } },
  ];

  const handleSave = () => {
    if (newPresetName.trim()) {
      saveAmbientPreset(newPresetName);
      setNewPresetName("");
      setShowSaveInput(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <h1 className="mb-8 text-4xl font-bold text-ink-100">Settings</h1>
      
      <div className="space-y-6">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Appearance</h2>
          <p className="mt-1 text-sm text-ink-500">Choose a theme that fits your mood.</p>
          
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.05] pt-6 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { id: 'none', name: 'Original', bg: '#090a09', accent: '#c3d0b8' },
              { id: 'midnight', name: 'Midnight (Default)', bg: '#090a09', accent: '#c3d0b8' },
              { id: 'abyss', name: 'Abyss (Pure Black)', bg: '#000000', accent: '#ffffff' },
              { id: 'aura', name: 'SONORA (Orchid Glow)', bg: '#0d0b16', accent: '#a78bfa' },
              { id: 'forest', name: 'Emerald Forest', bg: '#0a0d0a', accent: '#4ade80' },
              { id: 'sunset', name: 'Amber Sunset', bg: '#110909', accent: '#fb923c' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`group relative flex flex-col items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
                  theme === t.id 
                    ? 'border-sage-400/50 bg-sage-400/10' 
                    : 'border-white/[0.05] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div 
                  className="relative h-16 w-full overflow-hidden rounded-lg shadow-lg"
                  style={{ backgroundColor: t.bg }}
                >
                  {/* Preview elements */}
                  <div className="absolute top-2 left-2 h-2 w-8 rounded-full bg-white/10" />
                  <div className="absolute top-6 left-2 h-2 w-12 rounded-full bg-white/10" />
                  <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full" style={{ backgroundColor: t.accent }} />
                  {theme === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-sage-400/20 backdrop-blur-[2px]">
                      <svg className="h-6 w-6 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium ${theme === t.id ? 'text-sage-400' : 'text-ink-300'}`}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-white/[0.05] pt-6">
            <h3 className="text-sm font-semibold text-ink-100">Design Morphism Style</h3>
            <p className="mt-0.5 text-xs text-ink-500">Transform the entire application layout with premium design languages.</p>
            
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { id: 'glassmorphism', name: 'Glassmorphism', desc: 'Frosted & blurred reflection', icon: IconGlass },
                { id: 'minimalism', name: 'Minimalism', desc: 'Sleek, flat & spacious', icon: IconSquare },
                { id: 'neobrutalism', name: 'Neo-Brutalism', desc: 'Bold outlines & high contrast', icon: IconBolt },
                { id: 'claymorphism', name: 'Claymorphism', desc: 'Soft 3D pillowy surfaces', icon: IconCloud },
                { id: 'skeuomorphism', name: 'Skeuomorphism', desc: 'Tactile physical feel', icon: IconAdjustmentsHorizontal },
              ].map((m) => {
                const MorphIcon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMorphism(m.id)}
                    className={`group relative flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-300 ${
                      morphism === m.id 
                        ? 'border-sage-400/50 bg-sage-400/10' 
                        : 'border-white/[0.05] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <MorphIcon className="h-5 w-5 text-ink-300 group-hover:text-ink-100 transition-colors" strokeWidth={1.8} />
                      {morphism === m.id && (
                        <span className="h-2 w-2 rounded-full bg-sage-400 animate-pulse" />
                      )}
                    </div>
                  <span className={`mt-2 text-xs font-bold ${morphism === m.id ? 'text-sage-400' : 'text-white'}`}>
                    {m.name}
                  </span>
                  <span className="text-[10px] leading-tight text-ink-500 group-hover:text-ink-400 transition-colors">
                    {m.desc}
                  </span>
                </button>
              );
            })}
            </div>

            {morphism !== 'glassmorphism' && (
              <div className="mt-8 border-t border-white/[0.05] pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-100">Custom Color Palette</h3>
                    <p className="text-xs text-ink-500 mt-0.5">Customize specific interface elements. Adjust colors in the miniature layout before applying.</p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !isColorPaletteExpanded;
                      setIsColorPaletteExpanded(next);
                      localStorage.setItem('aura_color_palette_expanded', String(next));
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/[0.08] hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all shrink-0"
                    type="button"
                    title={isColorPaletteExpanded ? "Collapse Palette Settings" : "Expand Palette Settings"}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isColorPaletteExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {isColorPaletteExpanded && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Theme Presets */}
                    <div className="mb-6 rounded-2xl bg-white/[0.01] border border-white/[0.04] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-ink-200">Curated Presets</span>
                        <button
                          type="button"
                          onClick={() => {
                            const defaultScheme = {
                              background: '#090a09',
                              sidebar: '#101210',
                              player: '#161a16',
                              widgets: '#1c221c'
                            };
                            setTempColors(defaultScheme);
                            setCustomColors(defaultScheme);
                            showAlert('Reset to default color scheme!');
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider text-sage-400 hover:text-sage-300 transition-colors"
                        >
                          Reset to Default
                        </button>
                      </div>
                      
                      <div className="space-y-6">
                        {[
                          {
                            category: 'Soft & Muted Tones',
                            presets: [
                              {
                                name: 'Cream & Coffee',
                                colors: { background: '#f5ebe0', sidebar: '#e3d5ca', player: '#d5bdaf', widgets: '#eddfd3' },
                                preview: ['#f5ebe0', '#e3d5ca', '#d5bdaf', '#eddfd3']
                              },
                              {
                                name: 'Sakura Petal',
                                colors: { background: '#fff0f3', sidebar: '#ffe5ec', player: '#ffccd5', widgets: '#ffb3c1' },
                                preview: ['#fff0f3', '#ffe5ec', '#ffccd5', '#ffb3c1']
                              },
                              {
                                name: 'Lavender Fields',
                                colors: { background: '#f3e8ff', sidebar: '#e9d5ff', player: '#d8b4fe', widgets: '#c084fc' },
                                preview: ['#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc']
                              },
                              {
                                name: 'Mint Sorbet',
                                colors: { background: '#f0fdf4', sidebar: '#dcfce7', player: '#bbf7d0', widgets: '#86efac' },
                                preview: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac']
                              },
                              {
                                name: 'Peach Mousse',
                                colors: { background: '#fff7ed', sidebar: '#ffedd5', player: '#fed7aa', widgets: '#ffedd5' },
                                preview: ['#fff7ed', '#ffedd5', '#fed7aa', '#ffedd5']
                              },
                              {
                                name: 'Sky Haze',
                                colors: { background: '#f0f9ff', sidebar: '#e0f2fe', player: '#bae6fd', widgets: '#7dd3fc' },
                                preview: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc']
                              },
                              {
                                name: 'Desert Sage',
                                colors: { background: '#f4f4f2', sidebar: '#e8e8e4', player: '#d8d8d6', widgets: '#ecefe6' },
                                preview: ['#f4f4f2', '#e8e8e4', '#d8d8d6', '#ecefe6']
                              }
                            ]
                          },
                          {
                            category: 'Medium & Cozy Tones',
                            presets: [
                              {
                                name: 'Nordic Frost',
                                colors: { background: '#1e222b', sidebar: '#181b22', player: '#242933', widgets: '#282c37' },
                                preview: ['#1e222b', '#181b22', '#242933', '#282c37']
                              },
                              {
                                name: 'Forest Moss',
                                colors: { background: '#141c16', sidebar: '#0f1410', player: '#1a241d', widgets: '#222f26' },
                                preview: ['#141c16', '#0f1410', '#1a241d', '#222f26']
                              },
                              {
                                name: 'Midnight Plum',
                                colors: { background: '#17121c', sidebar: '#110e15', player: '#1e1724', widgets: '#261e2e' },
                                preview: ['#17121c', '#110e15', '#1e1724', '#261e2e']
                              },
                              {
                                name: 'Ocean Abyss',
                                colors: { background: '#0d1b2a', sidebar: '#1b263b', player: '#415a77', widgets: '#778da9' },
                                preview: ['#0d1b2a', '#1b263b', '#415a77', '#778da9']
                              },
                              {
                                name: 'Rosewood Manor',
                                colors: { background: '#2b1e1e', sidebar: '#201515', player: '#362525', widgets: '#402d2d' },
                                preview: ['#2b1e1e', '#201515', '#362525', '#402d2d']
                              },
                              {
                                name: 'Warm Chestnut',
                                colors: { background: '#1c1510', sidebar: '#140e0b', player: '#261d16', widgets: '#30241c' },
                                preview: ['#1c1510', '#140e0b', '#261d16', '#30241c']
                              },
                              {
                                name: 'Slate Horizon',
                                colors: { background: '#2d3748', sidebar: '#1a202c', player: '#4a5568', widgets: '#718096' },
                                preview: ['#2d3748', '#1a202c', '#4a5568', '#718096']
                              }
                            ]
                          },
                          {
                            category: 'Hard & Bold Tones',
                            presets: [
                              {
                                name: 'Cyber Sunset',
                                colors: { background: '#1c0d0d', sidebar: '#120909', player: '#261212', widgets: '#301616' },
                                preview: ['#1c0d0d', '#120909', '#261212', '#301616']
                              },
                              {
                                name: 'Retro Terminal',
                                colors: { background: '#001200', sidebar: '#000a00', player: '#001f00', widgets: '#002900' },
                                preview: ['#001200', '#000a00', '#001f00', '#002900']
                              },
                              {
                                name: 'Neon Tokyo',
                                colors: { background: '#0a0410', sidebar: '#12071d', player: '#1a0a2a', widgets: '#260f3d' },
                                preview: ['#0a0410', '#12071d', '#1a0a2a', '#260f3d']
                              },
                              {
                                name: 'Electric Acid',
                                colors: { background: '#080c05', sidebar: '#0d1408', player: '#131e0c', widgets: '#1c2a11' },
                                preview: ['#080c05', '#0d1408', '#131e0c', '#1c2a11']
                              },
                              {
                                name: 'Molten Magma',
                                colors: { background: '#0f0a0a', sidebar: '#180f0f', player: '#241515', widgets: '#2e1b1b' },
                                preview: ['#0f0a0a', '#180f0f', '#241515', '#2e1b1b']
                              },
                              {
                                name: 'Toxic Waste',
                                colors: { background: '#050a0a', sidebar: '#091212', player: '#0d1a1a', widgets: '#122424' },
                                preview: ['#050a0a', '#091212', '#0d1a1a', '#122424']
                              },
                              {
                                name: 'Vampire Crimson',
                                colors: { background: '#050000', sidebar: '#100000', player: '#1a0000', widgets: '#250000' },
                                preview: ['#050000', '#100000', '#1a0000', '#250000']
                              },
                              {
                                name: 'Royal Purple',
                                colors: { background: '#1a0933', sidebar: '#120524', player: '#261047', widgets: '#34165c' },
                                preview: ['#1a0933', '#120524', '#261047', '#34165c']
                              }
                            ]
                          }
                        ].map((cat) => (
                          <div key={cat.category} className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 block px-1">{cat.category}</span>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {cat.presets.map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => {
                                    setTempColors(preset.colors);
                                  }}
                                  className="flex flex-col items-stretch text-left rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 p-2 transition-all gap-1.5 group"
                                >
                                  <span className="text-[10px] font-bold text-ink-300 group-hover:text-white transition-colors truncate">{preset.name}</span>
                                  <div className="flex h-3 rounded overflow-hidden">
                                    {preset.preview.map((color, idx) => (
                                      <div key={idx} className="flex-1" style={{ backgroundColor: color }} />
                                    ))}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Color Pickers */}
                      <div className="space-y-4">
                        {[
                          { key: 'background', label: 'Main Background' },
                          { key: 'sidebar', label: 'Left Sidebar' },
                          { key: 'player', label: 'Bottom Player Bar' },
                          { key: 'widgets', label: 'General Cards & Panels' }
                        ].map((part) => (
                          <div key={part.key} className="rounded-xl bg-white/[0.01] border border-white/[0.04] p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-ink-200">{part.label}</span>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="color" 
                                  value={tempColors[part.key]} 
                                  onChange={(e) => setTempColors(prev => ({ ...prev, [part.key]: e.target.value }))}
                                  className="h-6 w-6 border-0 bg-transparent cursor-pointer rounded overflow-hidden" 
                                />
                                <input 
                                  type="text" 
                                  maxLength={7}
                                  value={tempColors[part.key]} 
                                  onChange={(e) => setTempColors(prev => ({ ...prev, [part.key]: e.target.value }))}
                                  className="w-18 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] font-mono text-white text-center outline-none focus:border-sage-400" 
                                />
                              </div>
                            </div>
                            
                            {/* Curated Grid */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {[
                                '#090a09', '#050505', '#000000', // Darks
                                '#121212', '#161a1d', '#1e2022', // Coals
                                '#1c2541', '#0f2a4a', '#1a3a3a', // Deep Blues/Teals
                                '#2a1b3d', '#3e1f47', '#4a1525', // Deep Purples/Crimson
                                '#1c3a27', '#2e3d30', '#2d2d2a'  // Forest/Slate
                              ].map((hex) => (
                                <button
                                  key={hex}
                                  type="button"
                                  onClick={() => setTempColors(prev => ({ ...prev, [part.key]: hex }))}
                                  className={`h-4.5 w-4.5 rounded-full border transition-all ${
                                    tempColors[part.key].toLowerCase() === hex.toLowerCase()
                                      ? 'border-white scale-110 shadow-lg'
                                      : 'border-transparent hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="flex gap-2.5 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomColors(tempColors);
                              showAlert('Color scheme applied to player!');
                            }}
                            className="flex-1 rounded-xl bg-sage-400 text-ink-950 font-bold py-3 text-xs uppercase tracking-wider hover:bg-sage-300 transition-all active:scale-[0.98]"
                          >
                            Apply Color Scheme
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const defaultScheme = {
                                background: '#090a09',
                                sidebar: '#101210',
                                player: '#161a16',
                                widgets: '#1c221c'
                              };
                              setTempColors(defaultScheme);
                              setCustomColors(defaultScheme);
                              showAlert('Reset to default color scheme!');
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 text-ink-300 font-bold px-4 py-3 text-xs uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Miniature Site Layout Mockup */}
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-black/40 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-3">Live Miniature Preview</span>
                        
                        {/* Layout Grid */}
                        <div 
                          className="relative w-full aspect-[16/10] max-w-[340px] rounded-xl border border-white/10 overflow-hidden shadow-2xl flex flex-col"
                          style={{ backgroundColor: tempColors.background }}
                        >
                          {/* Main Content Area */}
                          <div className="flex-1 flex min-h-0">
                            {/* Mini Sidebar */}
                            <div 
                              className="w-[24%] border-r border-white/5 p-2 flex flex-col gap-1.5"
                              style={{ backgroundColor: tempColors.sidebar }}
                            >
                              <div className="h-3 w-8 bg-white/20 rounded mb-2" />
                              <div className="h-2 w-full bg-white/10 rounded" />
                              <div className="h-2 w-full bg-white/5 rounded" />
                              <div className="h-2 w-full bg-white/5 rounded" />
                            </div>
                            
                            {/* Mini Body */}
                            <div className="flex-1 p-3 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <div className="h-3.5 w-16 bg-white/15 rounded" />
                                <div className="h-3 w-3 rounded-full bg-white/10" />
                              </div>
                              
                              {/* Simulated Cards/Widgets */}
                              <div className="grid grid-cols-2 gap-2">
                                <div 
                                  className="rounded-lg p-2 flex flex-col gap-1.5 border border-white/5"
                                  style={{ backgroundColor: tempColors.widgets }}
                                >
                                  <div className="aspect-video w-full bg-white/5 rounded" />
                                  <div className="h-1.5 w-[80%] bg-white/15 rounded" />
                                  <div className="h-1 w-[50%] bg-white/5 rounded" />
                                </div>
                                
                                <div 
                                  className="rounded-lg p-2 flex flex-col gap-1.5 border border-white/5"
                                  style={{ backgroundColor: tempColors.widgets }}
                                >
                                  <div className="aspect-video w-full bg-white/5 rounded" />
                                  <div className="h-1.5 w-[70%] bg-white/15 rounded" />
                                  <div className="h-1 w-[40%] bg-white/5 rounded" />
                                </div>
                              </div>

                              {/* Text Line */}
                              <div className="h-2 w-[90%] bg-white/5 rounded mt-auto" />
                            </div>
                          </div>
                          
                          {/* Mini Bottom Bar */}
                          <div 
                            className="h-[20%] border-t border-white/5 px-2 flex items-center justify-between gap-2"
                            style={{ backgroundColor: tempColors.player }}
                          >
                            <div className="flex items-center gap-1">
                              <div className="h-5 w-5 bg-white/15 rounded" />
                              <div className="flex flex-col gap-0.5">
                                <div className="h-1.5 w-8 bg-white/25 rounded" />
                                <div className="h-1 w-6 bg-white/10 rounded" />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-white/20" />
                              <div className="h-3.5 w-3.5 rounded-full bg-white" />
                              <div className="h-2 w-2 rounded-full bg-white/20" />
                            </div>
                            <div className="h-1 w-8 bg-white/10 rounded" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Ambient Visualizer</h2>
          <p className="mt-1 text-sm text-ink-500">Fine-tune how the interface reacts to your music.</p>

          {/* ── Render Engine Picker ── */}
          <div className="mt-6 border-t border-white/[0.05] pt-6">
            <h3 className="text-sm font-semibold text-ink-100">Background Render Engine</h3>
            <p className="mt-1 text-xs text-ink-500 leading-relaxed max-w-xl">
              Choose how the ambient background is drawn. WebGL uses the GPU for richer visuals. CSS uses the CPU with DOM elements — better for strong CPU / weak GPU devices.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'webgl',
                  label: 'WebGL (GPU)',
                  badge: 'Recommended',
                  description: 'GPU-accelerated shader rendering. Rich color orbs, album art overlay, chromatic aberration, and vignette breathing.',
                  icon: '✦',
                },
                {
                  id: 'css',
                  label: 'CSS (CPU)',
                  badge: null,
                  description: 'DOM-based color orbs driven by JavaScript. Lighter on GPU — ideal for integrated graphics or older devices.',
                  icon: '◈',
                },
              ].map((engine) => {
                const isSelected = ambientMode === engine.id;
                return (
                  <button
                    key={engine.id}
                    onClick={() => setAmbientMode(engine.id)}
                    className={`relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-300 ${
                      isSelected
                        ? 'border-sage-400/60 bg-sage-400/[0.06] shadow-[0_0_20px_rgba(163,230,53,0.07)]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    {engine.badge && (
                      <span className="absolute top-3 right-3 rounded-full bg-sage-400/10 border border-sage-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-sage-400">
                        {engine.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`text-xl leading-none ${isSelected ? 'text-sage-400' : 'text-ink-500'}`}>{engine.icon}</span>
                      <span className={`text-sm font-bold ${isSelected ? 'text-sage-400' : 'text-ink-200'}`}>{engine.label}</span>
                    </div>
                    <p className="text-[11px] text-ink-500 leading-relaxed">{engine.description}</p>
                    {isSelected && (
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sage-400">● Active</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mt-6 space-y-8 border-t border-white/[0.05] pt-8">
            {[
              { id: 'glow', label: 'Global Glow Intensity', icon: IconSparkles, description: 'Overall brightness and energy of the ambient orbs.' },
              { id: 'bass', label: 'Bass & Woofers', icon: IconVolume2, description: 'Sensitivity to sub-bass and kick drums.' },
              { id: 'mids', label: 'Vocals & Mids', icon: IconMicrophone, description: 'Reaction to human voice and central instruments.' },
              { id: 'highs', label: 'Highs & Sparkle', icon: IconDiamond, description: 'Sensitivity to cymbals, hi-hats, and sharp transients.' },
            ].map((s) => {
              const VisIcon = s.icon;
              return (
                <div key={s.id} className="group flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <VisIcon className="h-4 w-4 text-sage-400" strokeWidth={1.8} />
                      <h3 className="text-sm font-semibold text-ink-100">{s.label}</h3>
                      <span className="ml-auto text-xs font-mono text-sage-400">{(ambientSettings[s.id] * 100).toFixed(0)}%</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500 leading-relaxed">{s.description}</p>
                  </div>
                  
                  <div className="relative flex w-full items-center gap-4 sm:w-64">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={ambientSettings[s.id]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setAmbientSettings(prev => ({ ...prev, [s.id]: val }));
                      }}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-sage-400 outline-none transition-all hover:bg-white/20 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                    />
                    <button 
                      onClick={() => setAmbientSettings(prev => ({ ...prev, [s.id]: 1.0 }))}
                      className="text-[10px] font-bold uppercase tracking-tighter text-ink-500 hover:text-sage-400"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 border-t border-white/[0.05] pt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-ink-100">Presets</h3>
              {!showSaveInput ? (
                <button 
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-2 rounded-lg bg-sage-400/10 px-3 py-1.5 text-xs font-bold text-sage-400 transition hover:bg-sage-400/20 self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Save Current
                </button>
              ) : (
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Preset name..." 
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-ink-100 outline-none focus:border-sage-400/50 sm:w-48 sm:flex-none"
                  />
                  <button 
                    onClick={handleSave} 
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-400/20 text-sage-400 hover:bg-sage-400/30"
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setShowSaveInput(false)} 
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-ink-500 hover:bg-white/10 hover:text-white"
                    title="Cancel"
                  >
                    <Plus className="h-4 w-4 rotate-45" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[...defaultPresets, ...customPresets].map((p) => {
                const isSelected = JSON.stringify(ambientSettings) === JSON.stringify(p.settings);
                const isCustom = !defaultPresets.find(dp => dp.id === p.id);
                
                return (
                  <div key={p.id} className="group relative">
                    <button
                      onClick={() => setAmbientSettings(p.settings)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 ${
                        isSelected 
                          ? 'border-sage-400 bg-sage-400 text-ink-950' 
                          : 'border-white/10 bg-white/5 text-ink-400 hover:border-white/20 hover:bg-white/10 hover:text-ink-100'
                      }`}
                    >
                      {p.name}
                    </button>
                    {isCustom && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAmbientPreset(p.id); }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-lg sm:hidden sm:group-hover:flex"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-white/[0.05] pt-6">
              <h3 className="text-sm font-semibold text-ink-100">Interactive Backdrop Particles</h3>
              <p className="mt-1 text-xs text-ink-500">Customize where the dynamic, music-reactive floating particles are shown.</p>
              
              <div className="mt-4 flex flex-wrap gap-2.5">
                {[
                  { id: 'off', label: 'Off', icon: IconEyeOff, desc: 'Turn off particles completely' },
                  { id: 'app', label: 'App Interface', icon: IconDeviceDesktop, desc: 'Show only in main background' },
                  { id: 'player', label: 'Player Screen', icon: IconMusic, desc: 'Show only in expanded player' },
                  { id: 'both', label: 'Everywhere', icon: IconSparkles, desc: 'Show on both screens' },
                ].map((mode) => {
                  const isSelected = particlesMode === mode.id;
                  const ModeIcon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setParticlesMode(mode.id)}
                      title={mode.desc}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all duration-300 ${
                        isSelected 
                          ? 'border-sage-400 bg-sage-400 text-ink-950 shadow-md scale-[1.02]' 
                          : 'border-white/10 bg-white/5 text-ink-400 hover:border-white/20 hover:bg-white/10 hover:text-ink-100'
                      }`}
                    >
                      <ModeIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 border-t border-white/[0.05] pt-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-ink-100">Stereo Channel Separation</h3>
                  <p className="mt-1 text-xs text-ink-500 leading-relaxed max-w-md">When enabled, left and right audio channels react independently across visualizer bars, ambient orbs, and backdrop particles.</p>
                </div>
                <label className="uiverse-switch">
                  <input 
                    type="checkbox" 
                    checked={stereoSeparationEnabled}
                    onChange={() => setStereoSeparationEnabled(!stereoSeparationEnabled)}
                    title="Toggle Stereo Channel Separation"
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Topbar Alerts Section */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <h2 className="text-lg font-medium text-ink-100">Topbar Alerts</h2>
          <p className="mt-1 text-sm text-ink-500">Configure what real-time capsules are displayed in the application topbar.</p>
          
          <div className="mt-6 space-y-4 border-t border-white/[0.05] pt-6">
            {/* 1. Date & Time Alert */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-ink-200">Date & Time Display</span>
                <span className="text-xs text-ink-500 mt-0.5">Show real-time day, month, date, and ticking clock in the topbar</span>
              </div>
              <label className="uiverse-switch">
                <input 
                  type="checkbox" 
                  checked={enableDateTimeAlert}
                  onChange={() => setEnableDateTimeAlert(!enableDateTimeAlert)}
                  title="Toggle Date & Time Display"
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* 2. Live Match Score Alert */}
            <div className="border-t border-white/[0.05] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink-200">Live Match Score Alert</span>
                  <span className="text-xs text-ink-500 mt-0.5">Show real-time sports scores and alert capsules in the topbar</span>
                </div>
                <label className="uiverse-switch">
                  <input 
                    type="checkbox" 
                    checked={enableLiveMatchScoreAlert}
                    onChange={() => setEnableLiveMatchScoreAlert(!enableLiveMatchScoreAlert)}
                    title="Toggle Live Match Score Alert"
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {enableLiveMatchScoreAlert && (
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-ink-200">Preferred Sport Feed</span>
                    <span className="text-[11px] text-ink-500 mt-0.5">Select which sport you want to track in the topbar</span>
                  </div>
                  <select
                    value={liveMatchSport}
                    onChange={(e) => setLiveMatchSport(e.target.value)}
                    className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-ink-100 outline-none focus:border-sage-400 cursor-pointer"
                  >
                    <option value="soccer" className="bg-ink-950 text-white">Football / Soccer (FIFA World Cup)</option>
                    <option value="cricket" className="bg-ink-950 text-white">Cricket (International)</option>
                    <option value="basketball" className="bg-ink-950 text-white">Basketball (NBA)</option>
                    <option value="football" className="bg-ink-950 text-white">American Football (NFL)</option>
                  </select>
                </div>
              )}
            </div>

            {/* 3. Future Alerts Placeholder */}
            <div className="flex items-center justify-between border-t border-white/[0.05] pt-4 opacity-50">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-ink-200">Weather & Air Quality Alerts</span>
                <span className="text-xs text-ink-500 mt-0.5">Integrate hyper-local weather alerts (Coming Soon)</span>
              </div>
              <label className="uiverse-switch">
                <input 
                  disabled
                  type="checkbox" 
                  checked={false}
                  title="Coming Soon"
                />
                <span className="slider opacity-50 cursor-not-allowed"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Network & Sync</h2>
          <p className="mt-1 text-sm text-ink-500">Manage real-time playback synchronization across your devices.</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
            <span className="text-sm text-ink-300">Cross-Device Playback</span>
            <label className="uiverse-switch">
              <input 
                type="checkbox" 
                checked={crossPlayEnabled}
                onChange={() => setCrossPlayEnabled(!crossPlayEnabled)}
                title={crossPlayEnabled ? "Cross-Play is ON" : "Cross-Play is OFF"}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Playback Settings</h2>
          <p className="mt-1 text-sm text-ink-500">Customize your audio listening experience.</p>
          
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
            <div className="flex flex-col">
              <span className="text-sm text-ink-300">Audio Crossfade</span>
              <span className="text-[11px] text-ink-500 mt-0.5">Smoothly transition between tracks when changing songs</span>
            </div>
            <select
              value={crossfadeDuration}
              onChange={(e) => setCrossfadeDuration(parseInt(e.target.value, 10))}
              className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-ink-100 outline-none focus:border-sage-400 cursor-pointer"
            >
              <option value={0} className="bg-ink-950 text-white">Off</option>
              <option value={2} className="bg-ink-950 text-white">2 Seconds</option>
              <option value={4} className="bg-ink-950 text-white">4 Seconds</option>
              <option value={6} className="bg-ink-950 text-white">6 Seconds</option>
              <option value={8} className="bg-ink-950 text-white">8 Seconds</option>
              <option value={10} className="bg-ink-950 text-white">10 Seconds</option>
            </select>
          </div>

          {/* 3D Spatial Audio & Binaural Soundstage */}
          <div className="mt-4 border-t border-white/[0.05] pt-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-200 font-medium">3D Spatial Audio & Soundstage</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sage-400/10 text-sage-300 border border-sage-400/20 flex items-center gap-1">
                    <Headphones className="w-2.5 h-2.5" /> AirPods / HRTF
                  </span>
                </div>
                <span className="text-[11px] text-ink-500 mt-0.5 max-w-md">
                  Transforms stereo audio into a 3D binaural soundstage with out-of-head studio acoustic positioning.
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={spatialEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSpatialEnabled(val);
                    setSpatialAudioEnabled(val);
                  }}
                />
                <span className="slider"></span>
              </label>
            </div>

            {spatialEnabled && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-ink-300 font-medium">Acoustic Soundstage</span>
                    <span className="text-[10px] text-ink-500">Virtual environment reflection profile</span>
                  </div>
                  <select
                    value={spatialMode}
                    onChange={(e) => {
                      const m = e.target.value;
                      setSpatialMode(m);
                      setSpatialAudioMode(m);
                    }}
                    className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-ink-100 outline-none focus:border-sage-400 cursor-pointer"
                  >
                    {SPATIAL_PRESETS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-ink-950 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-ink-400 font-medium">Soundstage Width</span>
                    <span className="text-ink-300 font-mono text-[11px]">{Math.round(spatialWidth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={spatialWidth}
                    onChange={(e) => {
                      const w = parseFloat(e.target.value);
                      setSpatialWidth(w);
                      setSpatialAudioWidth(w);
                    }}
                    className="w-full accent-sage-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-ink-600">
                    <span>100% (Standard)</span>
                    <span>150% (Recommended)</span>
                    <span>200% (Super-Wide)</span>
                  </div>
                </div>

                <p className="text-[10px] text-ink-500 leading-relaxed italic border-t border-white/[0.04] pt-2">
                  Tip: Sonora's built-in HRTF Binaural Engine creates out-of-head 3D stage depth across any headphones or AirPods.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Spotify Smart Bridge & Sound Output Sync */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.686.473-1.045.253-2.865-1.75-6.471-2.146-10.72-1.176-.407.094-.814-.162-.907-.57-.094-.408.162-.815.57-.908 4.654-1.064 8.643-.615 11.849 1.356.359.219.473.687.253 1.045zm1.472-3.272c-.274.446-.86.588-1.306.313-3.28-2.015-8.28-2.599-12.16-1.422-.501.152-1.034-.135-1.186-.637-.152-.501.135-1.034.637-1.186 4.432-1.346 9.948-.696 13.702 1.626.446.275.588.86.313 1.306zm.126-3.41c-3.935-2.337-10.427-2.553-14.19-1.411-.605.184-1.246-.16-1.43-.765-.184-.606.16-1.247.765-1.431 4.331-1.314 11.499-1.062 16.027 1.625.545.323.725 1.033.402 1.578-.323.546-1.033.726-1.574.404z"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-medium text-ink-100 flex items-center gap-2">
                  Spotify Smart Bridge
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    spotifyBridgeState?.connected 
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' 
                      : 'bg-white/10 text-ink-400 border border-white/10'
                  }`}>
                    {spotifyBridgeState?.connected ? (spotifyBridgeState?.active ? 'Live Connected' : 'Paused') : 'Disconnected'}
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-ink-500">
                  Play songs in your Spotify App (Desktop/Mobile) and Sonora automatically outputs full audio, live ambient WebGL shaders, 3D Spatial Audio, and synchronized lyrics.
                </p>
              </div>
            </div>
            {spotifyBridgeState?.connected && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={spotifyBridgeState?.active}
                  onChange={(e) => setSpotifyBridgeEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            )}
          </div>

          <div className="mt-4 border-t border-white/[0.05] pt-4 flex flex-col gap-3">
            {spotifyBridgeState?.connected ? (
              <div className="flex flex-col gap-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-emerald-200">Bridge Active & Connected</span>
                    <span className="text-[11px] text-emerald-400/80 mt-0.5">
                      {spotifyBridgeState?.diagnostics?.message || 'Listening for active playback on Spotify app...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const res = await syncNow();
                        if (res) {
                          showAlert(res.message, "Spotify Status");
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 text-xs font-semibold transition"
                    >
                      Sync Now
                    </button>
                    <button
                      onClick={() => setSpotifyToken(null)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-medium transition"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-ink-300 font-medium">Connect with 1-Click OAuth or Spotify Token</span>
                  <span className="text-[11px] text-ink-500">Works with Free, Modded (ad-blocked), or Premium Spotify accounts.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const token = prompt("Enter your Spotify Access Token:");
                      if (token && token.trim()) {
                        setSpotifyToken(token.trim());
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition"
                  >
                    Paste Token
                  </button>
                  <button
                    onClick={() => startSpotifyAuth()}
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 text-xs font-bold shadow-md transition"
                  >
                    Connect Spotify
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant Settings */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100 flex items-center gap-2">
            <IconSparkles className="h-5 w-5 text-sage-400" />
            AI Assistant
          </h2>
          <p className="mt-1 text-sm text-ink-500">The Sonora AI Assistant features are fully enabled and managed server-side by the administrator.</p>
          
          <div className="mt-6 border-t border-white/[0.05] pt-6 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink-200">Musixmatch API Key</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  placeholder="Enter your Musixmatch API Key..." 
                  value={musixmatchKey}
                  onChange={(e) => setMusixmatchKey(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-sage-400" 
                />
                <button
                  type="button"
                  onClick={handleSaveMusixmatchKey}
                  className="rounded-xl bg-sage-400 text-ink-950 font-bold px-4 py-2.5 text-xs uppercase tracking-wider hover:bg-sage-300 transition-all active:scale-[0.98]"
                >
                  Save Key
                </button>
                {musixmatchKey && (
                  <button
                    type="button"
                    onClick={handleDeleteMusixmatchKey}
                    className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-3 py-2.5 text-xs uppercase hover:bg-red-500/20 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                Configure your Musixmatch API key to fetch lyrics. If no key is set or the song is not found on Musixmatch, Sonora will fall back to LRCLIB automatically. Get an API key at <a href="https://developer.musixmatch.com/" target="_blank" rel="noopener noreferrer" className="text-sage-400 hover:underline">Musixmatch Developer Portal</a>.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Performance</h2>
          <p className="mt-1 text-sm text-ink-500">Enable Performance Mode to disable heavy visual effects and save battery on low-end devices.</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
            <div className="flex flex-col">
              <span className="text-sm text-ink-300">Performance Mode</span>
              {morphism !== 'glassmorphism' && (
                <span className="text-[11px] text-sage-400 mt-1 font-medium">
                  Locked to ON (Performance mode enforced for non-glassmorphism)
                </span>
              )}
            </div>
            <label className="uiverse-switch">
              <input 
                type="checkbox" 
                disabled={morphism !== 'glassmorphism'}
                checked={morphism !== 'glassmorphism' || !ambientEffectsEnabled}
                onChange={() => setAmbientEffectsEnabled(!ambientEffectsEnabled)}
                title={morphism !== 'glassmorphism' ? "Locked to ON (Performance Mode enforced for non-glassmorphism)" : !ambientEffectsEnabled ? "Performance Mode is ON" : "Performance Mode is OFF"}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
            <div className="flex flex-col">
              <span className="text-sm text-ink-300">Background Ambiance Play</span>
              <span className="text-[11px] text-ink-500 mt-0.5">
                Turn off ambiance background system when app is minimized or running in the background to prevent device heating
              </span>
            </div>
            <label className="uiverse-switch">
              <input 
                type="checkbox" 
                checked={backgroundAmbiancePlay}
                onChange={() => setBackgroundAmbiancePlay(!backgroundAmbiancePlay)}
                title={backgroundAmbiancePlay ? "Background Ambiance Play saver is ON" : "Background Ambiance Play saver is OFF"}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Display Settings</h2>
          <p className="mt-1 text-sm text-ink-500">Configure how the application occupies your screen display.</p>
          
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
            <span className="text-sm text-ink-300">Fullscreen Mode</span>
            <label className="uiverse-switch">
              <input 
                type="checkbox" 
                checked={isFullscreen}
                onChange={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              />
              <span className="slider"></span>
            </label>
          </div>

          {isNativeApp && (
            <>
              {/* Native Screen Layout Selection */}
              <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.05] pt-4">
                <div className="flex flex-col">
                  <span className="text-sm text-ink-300">Screen Layout Style</span>
                  <span className="text-[11px] text-ink-500 mt-0.5">Select how the application is drawn on your mobile/tablet screen.</span>
                </div>
                
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { id: 'fullscreen', name: 'Edge-to-Edge Fullscreen', desc: 'Spans behind status bar / notch' },
                    { id: 'curved', name: 'Curved Floating Card', desc: 'Adds corner curves and status bar padding' }
                  ].map((styleOpt) => {
                    const isActive = nativeLayout === styleOpt.id;
                    return (
                      <button
                        key={styleOpt.id}
                        type="button"
                        onClick={() => handleSaveNativeLayout(styleOpt.id)}
                        className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-300 ${
                          isActive 
                            ? 'border-sage-400/50 bg-sage-400/10' 
                            : 'border-white/[0.05] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className={`text-xs font-bold ${isActive ? 'text-sage-400' : 'text-white'}`}>{styleOpt.name}</span>
                        <span className="text-[10px] leading-snug text-ink-500">{styleOpt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
                <div className="flex flex-col">
                  <span className="text-sm text-ink-300">Auto-adjust Screen Zoom</span>
                  <span className="text-[11px] text-ink-500 mt-0.5">Automatically optimize app scale for phone (90%) or tablet (75%) screens</span>
                </div>
                <label className="uiverse-switch">
                  <input 
                    type="checkbox" 
                    checked={isAutoZoom}
                    onChange={(e) => handleToggleAutoZoom(e.target.checked)}
                    title={isAutoZoom ? "Auto-Zoom is ON" : "Auto-Zoom is OFF"}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {!isAutoZoom && (
                <div className="mt-4 border-t border-white/[0.05] pt-4 flex flex-col gap-3.5 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-300">Custom Zoom Level</span>
                    <span className="text-sm font-mono font-bold text-sage-400">{zoomPercent}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range"
                      min="50"
                      max="150"
                      step="5"
                      value={zoomPercent}
                      onChange={(e) => handleZoomChange(parseInt(e.target.value, 10))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-sage-400 outline-none transition-all hover:bg-white/20 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                    />
                    <button
                      type="button"
                      onClick={() => handleZoomChange(100)}
                      className="text-[10px] font-bold uppercase tracking-tighter text-ink-500 hover:text-sage-400 shrink-0"
                    >
                      Reset (100%)
                    </button>
                  </div>
                </div>
              )}

              {isReloadingZoom && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-sage-400/10 border border-sage-400/20 px-4 py-2.5 text-xs text-sage-400 animate-pulse">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Applying screen scaling. The app will reload automatically in a moment...</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Account</h2>
          <p className="mt-1 text-sm text-ink-500">Manage your profile and account settings.</p>
          
          <div className="mt-6 flex flex-col gap-6 border-t border-white/[0.05] pt-6 sm:flex-row sm:items-center">
            {user ? (
              <>
                <div className="relative h-24 w-24 shrink-0">
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="h-full w-full rounded-3xl border border-white/10 object-cover shadow-2xl transition-transform hover:scale-105 duration-500"
                  />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-4 border-ink-950 shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 group/input">
                        <input 
                          autoFocus
                          type="text" 
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                          className="text-2xl font-black text-ink-100 bg-white/[0.05] border-b-2 border-sage-400 outline-none px-2 py-1 rounded-t-lg transition-all"
                        />
                        <button 
                          onClick={handleUpdateName}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-400 text-ink-950 shadow-lg shadow-sage-400/20 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => setIsEditingName(false)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-ink-500 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Plus className="h-5 w-5 rotate-45" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-3xl font-black text-ink-100 truncate tracking-tight">{user.displayName}</h3>
                        <button 
                          onClick={() => { setIsEditingName(true); setNewName(user.displayName); }}
                          className="group/edit relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-ink-500 hover:bg-sage-400/10 hover:text-sage-400 border border-white/[0.05] hover:border-sage-400/20 transition-all duration-300"
                          title="Rename Profile"
                        >
                          <Edit2 className="h-4 w-4 transition-transform group-hover/edit:scale-110" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink-500 mt-1 opacity-80">{user.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-sage-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sage-400 border border-sage-400/20 shadow-lg shadow-sage-400/5">
                      <Shield className="h-3 w-3" />
                      Premium Member
                    </div>
                    <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-ink-500 border border-white/[0.05]" title={`Firebase UID: ${user.uid}`}>
                      UID: {customUserId || user.uid}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] p-4 border border-dashed border-white/10">
                <p className="text-sm text-ink-500 italic">Sign in to sync your profile across devices.</p>
                <button className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-black hover:scale-105 transition">Sign In</button>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-white/[0.05] pt-8">
            <div 
              className="flex items-center gap-3 mb-4 cursor-pointer group select-none"
              onClick={() => {
                const next = !isSessionsOpen;
                setIsSessionsOpen(next);
                if (next) refreshSessions(); // Refresh when opening
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-400/10 text-sage-400 transition-transform group-hover:scale-105">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink-100 flex items-center gap-2 transition-colors group-hover:text-sage-400">
                  Security & Active Sessions
                  <span className="rounded bg-sage-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sage-400 border border-sage-400/20">
                    {sessions.length} {sessions.length === 1 ? 'Device' : 'Devices'}
                  </span>
                  {isSessionsOpen ? (
                    <ChevronUp className="h-4 w-4 ml-1 text-ink-400 transition-colors group-hover:text-sage-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1 text-ink-400 transition-colors group-hover:text-sage-400" />
                  )}
                </h3>
                <p className="text-[10px] text-ink-500 font-medium">Manage and secure your account across platforms.</p>
              </div>
              <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  title="Refresh sessions"
                  onClick={async () => {
                    setIsRefreshing(true);
                    refreshSessions();
                    setTimeout(() => setIsRefreshing(false), 1000);
                  }}
                  className="p-1 text-ink-500 hover:text-sage-400 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-sage-400' : ''}`} />
                </button>
                <div className="group/info relative">
                  <Info className="h-3 w-3 text-ink-500 cursor-help transition-colors hover:text-sage-400" />
                  <div className="absolute right-0 bottom-full mb-2 w-56 rounded-xl bg-[#0e100f]/95 backdrop-blur-xl border border-white/10 p-3 text-[10px] text-ink-300 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-50">
                    <p className="font-bold text-sage-400 mb-1 text-xs">Session Security</p>
                    Devices are marked as <span className="text-green-500 font-bold">Online</span> when active, and <span className="text-ink-500 font-bold">Offline</span> after 65 seconds of inactivity. Remotely logged out devices are terminated within 30 seconds.
                  </div>
                </div>
              </div>
            </div>

            <div className={`space-y-4 transition-all duration-500 overflow-hidden ${isSessionsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 !mb-0'}`}>
              {sessions.length > 0 ? (
                [...sessions].sort((a, b) => {
                  // Always show current device first
                  if (a.id === currentSessionId) return -1;
                  if (b.id === currentSessionId) return 1;
                  return new Date(b.lastSeen) - new Date(a.lastSeen);
                }).map((session) => {
                  const Icon = getDeviceIcon(session.deviceType, session.device || "");
                  const isCurrent = session.id === currentSessionId;
                  const online = isOnline(session.lastSeen);
                  
                  return (
                    <div key={session.id} className={`group flex items-center justify-between rounded-xl p-3 sm:p-4 border transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-sage-400/[0.03] border-sage-400/10' 
                        : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/[0.05]'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 ${
                          isCurrent ? 'bg-sage-400/10 text-sage-400' : 'bg-white/5 text-ink-400'
                        }`}>
                          <Icon className="h-5 w-5" />
                          {online && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-ink-950"></span>
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            {editingSessionId === session.id ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                                  className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-ink-100 outline-none focus:border-sage-400 transition-all w-40"
                                />
                                <button onClick={() => handleRename(session.id)} className="p-1 text-sage-400 hover:scale-110 transition">
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <h4 className={`text-sm font-semibold transition-colors ${isCurrent ? 'text-sage-400' : 'text-ink-200'}`}>
                                  {session.device || "Unknown Device"}
                                </h4>
                                <button 
                                  onClick={() => { setEditingSessionId(session.id); setEditingName(session.device); }}
                                  className="text-ink-600 hover:text-sage-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                  title="Rename device"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                            {isCurrent && (
                              <span className="rounded bg-sage-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-sage-400 border border-sage-400/20">
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="text-[10px] font-mono text-sage-400 bg-sage-400/5 border border-sage-400/10 px-1.5 py-0.5 rounded">
                              ID: {session.id}
                            </p>
                            <div className="h-1 w-1 rounded-full bg-white/10" />
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${online ? 'text-green-500' : 'text-ink-600'}`}>
                              {online ? 'Online' : 'Offline'}
                            </p>
                            <div className="h-1 w-1 rounded-full bg-white/10 hidden sm:block" />
                            <p className="text-[10px] text-ink-500">
                              Logged in <span className="text-ink-400">{session.createdAt ? new Date(session.createdAt).toLocaleString() : 'Just now'}</span>
                            </p>
                            {session.location && (
                              <>
                                <div className="h-1 w-1 rounded-full bg-white/10 hidden sm:block" />
                                <p className="text-[10px] text-ink-400">
                                  {session.location}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!isCurrent && (
                        <button 
                          onClick={() => terminateSession(session.id)}
                          className="group/logout relative flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-ink-600 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300" 
                          title="Log out from this device"
                        >
                          <LogOut className="h-4 w-4 group-hover/logout:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                  <p className="text-sm text-ink-500">No active sessions found.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-1">
             <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.05] hover:bg-white/[0.05] transition cursor-pointer">
                <h4 className="text-sm font-semibold text-ink-100">Privacy & Visibility</h4>
                <p className="text-xs text-ink-500 mt-1">Control your profile visibility and data usage.</p>
             </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">Help & Support / Feedback</h2>
          <p className="mt-1 text-sm text-ink-500">Have an issue, suggestion, or request? Submit a message directly to the administrator.</p>
          
          <div className="mt-6 border-t border-white/[0.05] pt-6">
            {queryStatus === 'success' ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" strokeWidth={2.5} />
                <p className="text-xs text-ink-200 font-semibold">Message submitted successfully!</p>
                <p className="text-[10px] text-ink-500 mt-1">The system administrator will review your submission shortly.</p>
                <button
                  type="button"
                  onClick={() => setQueryStatus('idle')}
                  className="mt-3 text-[10px] font-bold uppercase tracking-widest text-sage-400 hover:text-white transition"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuerySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-300 block">Message Topic</label>
                  <select
                    value={queryTopic}
                    onChange={(e) => setQueryTopic(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-ink-100 outline-none focus:border-sage-400/50 cursor-pointer"
                  >
                    <option value="improvement" className="bg-[#121212] text-ink-100">Improvement / Feedback Query</option>
                    <option value="request" className="bg-[#121212] text-ink-100">Feature / Song Request</option>
                    <option value="other" className="bg-[#121212] text-ink-100">General Inquiry / Other</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-300 block">Your Message</label>
                  <textarea
                    value={queryMessage}
                    onChange={(e) => setQueryMessage(e.target.value)}
                    placeholder={
                      queryTopic === 'improvement' ? 'Describe improvements or feedback you have...' :
                      queryTopic === 'request' ? 'Describe what song, feature, or metadata you want added...' :
                      'Write your message to the system administrator...'
                    }
                    required
                    rows="4"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-ink-100 placeholder-ink-500 outline-none focus:border-sage-400/50 focus:bg-white/[0.08] transition-all resize-none"
                  />
                </div>
                
                {queryError && (
                  <p className="text-xs text-red-400 font-semibold">{queryError}</p>
                )}
                
                <button
                  type="submit"
                  disabled={queryStatus === 'submitting' || !queryMessage.trim()}
                  className="w-full rounded-xl bg-sage-400 text-ink-950 font-semibold py-3 text-xs uppercase tracking-wider hover:bg-sage-400/90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {queryStatus === 'submitting' ? 'Submitting query...' : 'Submit Message'}
                </button>
              </form>
            )}

            {/* Message History & Admin Replies */}
            {userQueries.length > 0 && (
              <div className="mt-8 border-t border-white/[0.05] pt-6 text-left">
                <h3 className="text-sm font-semibold text-ink-200 mb-4 flex items-center justify-between">
                  <span>Support Ticket History</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-ink-400">
                    {userQueries.length} {userQueries.length === 1 ? 'Message' : 'Messages'}
                  </span>
                </h3>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {userQueries.map((q) => {
                    const topicLabels = {
                      suspension: "Suspension Query / Appeal",
                      improvement: "Improvement Query",
                      request: "Feature / Song Request",
                      other: "General Inquiry / Other"
                    };
                    return (
                      <div key={q.id} className="bg-[#0e100f] border border-white/[0.05] rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            q.topic === 'suspension' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            q.topic === 'improvement' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            q.topic === 'request' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {topicLabels[q.topic] || q.topic}
                          </span>
                          <span className="text-[10px] text-ink-500 font-mono">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-ink-300 whitespace-pre-wrap leading-relaxed">{q.message}</p>

                        {q.admin_reply ? (
                          <div className="bg-sage-400/5 border border-sage-400/10 rounded-lg p-3 mt-2 space-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-sage-400 block">Admin Response:</span>
                            <p className="text-xs text-ink-300 leading-relaxed">{q.admin_reply}</p>
                            {q.repliedAt && (
                              <span className="text-[8px] text-ink-500 block font-mono">
                                Replied on {new Date(q.repliedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] text-ink-500 font-medium mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Awaiting Review...</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-ink-100">About Sonora</h2>
          <p className="mt-1 text-sm text-ink-500">Platform information, updates, and legal notices.</p>
          
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-1">
             {/* Application Updates */}
             <div 
               className="rounded-xl bg-white/[0.03] p-5 border border-white/[0.05] space-y-4"
             >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      Application Updates
                    </h4>
                    <p className="text-xs text-ink-500">
                      Current Version: <span className="font-mono text-purple-400 font-semibold">v{CURRENT_VERSION}</span>
                    </p>
                  </div>
                  
                  {hasUpdate ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider animate-pulse">
                      Update Available
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      Up to date
                    </span>
                  )}
                </div>

                {hasUpdate ? (
                  <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3.5 space-y-1.5">
                      <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <span>New Version Available: v{appVersion}</span>
                      </div>
                      <p className="text-xs text-ink-300 leading-relaxed font-mono whitespace-pre-wrap bg-black/30 p-2.5 rounded border border-white/[0.05]">
                        {siteSettings?.app_changelog || "No release notes provided."}
                      </p>
                    </div>
                    
                    <button
                      disabled={isUpdating}
                      onClick={handleUpdateApp}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 text-xs uppercase tracking-wider hover:from-purple-600 hover:to-indigo-700 transition active:scale-[0.98] shadow-lg shadow-purple-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          {updateProgress || "Downloading update..."}
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Update Now
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 pt-2 border-t border-white/[0.05]">
                    <button
                      disabled={isCheckingUpdates}
                      onClick={handleCheckForUpdates}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-ink-200 font-semibold py-2.5 text-xs transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdates ? 'animate-spin text-purple-400' : ''}`} />
                      {isCheckingUpdates ? 'Checking for updates...' : 'Check for Updates'}
                    </button>

                    {localStorage.getItem('sonora_active_version') && (
                      <button
                        onClick={() => {
                          localStorage.removeItem('sonora_cached_js');
                          localStorage.removeItem('sonora_cached_css');
                          localStorage.removeItem('sonora_active_version');
                          showAlert("OTA update cache cleared. Reverting to base package version...", "System Reset").then(() => {
                            window.location.reload();
                          });
                        }}
                        className="rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 font-semibold px-4 py-2.5 text-xs transition hover:bg-red-500/10 active:scale-[0.98] shrink-0"
                      >
                        Revert Base
                      </button>
                    )}
                  </div>
                )}
             </div>

             {/* Server Connection (Native App) */}
             <div className="rounded-xl bg-white/[0.03] p-5 border border-white/[0.05] space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                    <IconCloud className="h-4 w-4 text-sky-400" />
                    Server Connection
                  </h4>
                  <p className="text-xs text-ink-500">
                    Configure the backend server URL for this app. Update this when your tunnel restarts with a new address.
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-1.5">Active Server URL</label>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => { setServerUrl(e.target.value); setServerTestResult(null); }}
                      placeholder="e.g. https://abc-xyz.trycloudflare.com"
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-sage-400 font-mono tracking-wide"
                    />
                  </div>

                  {/* Connection test result */}
                  {serverTestResult && (
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
                      serverTestResult === 'testing' ? 'bg-sky-500/5 text-sky-400 border border-sky-500/10' :
                      serverTestResult === 'ok' ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10' :
                      'bg-red-500/5 text-red-400 border border-red-500/10'
                    }`}>
                      {serverTestResult === 'testing' && <RefreshCw className="h-3 w-3 animate-spin" />}
                      {serverTestResult === 'ok' && <Check className="h-3 w-3" />}
                      {serverTestResult === 'fail' && <Info className="h-3 w-3" />}
                      <span>{serverTestMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestServerUrl()}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-ink-200 font-semibold py-2.5 text-xs transition active:scale-[0.98]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Test Connection
                    </button>
                    <button
                      onClick={handleSaveServerUrl}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sage-400 text-ink-950 font-bold py-2.5 text-xs transition hover:bg-sage-500 active:scale-[0.98]"
                    >
                      <Save className="h-3 w-3" />
                      Save & Reconnect
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setServerUrl(window.DEFAULT_NATIVE_SERVER_URL || '');
                      setServerTestResult(null);
                    }}
                    className="w-full text-center text-[10px] font-medium text-ink-500 hover:text-ink-300 transition py-1"
                  >
                    Reset to default URL
                  </button>
                </div>
              </div>

             {/* Legal & Copyright */}
             <div 
               onClick={() => setIsLegalOpen(!isLegalOpen)}
               className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.05] hover:bg-white/[0.05] transition cursor-pointer"
             >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                      Legal & Copyright
                      {isLegalOpen ? <ChevronUp className="h-4 w-4 ml-1 text-ink-400" /> : <ChevronDown className="h-4 w-4 ml-1 text-ink-400" />}
                    </h4>
                    <p className="text-xs text-ink-500 mt-1">Platform ownership, media rights, and terms of use.</p>
                  </div>
                </div>
                
                <div className={`transition-all duration-500 overflow-hidden ${isLegalOpen ? 'max-h-[2500px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
                  <div className="rounded-xl bg-black/40 p-6 border border-white/[0.05] shadow-inner text-sm text-ink-300 leading-relaxed cursor-auto" onClick={e => e.stopPropagation()}>
                    <p className="font-bold text-white mb-6">© 2026 Sonora. All Rights Reserved.</p>
                    
                    <h5 className="font-bold text-white mb-2">Intellectual Property</h5>
                    <p className="mb-6">The Sonora platform—including its custom interface systems, ambient audio-reactive visualizer engine, synchronization architecture, playback systems, interaction design, and original frontend implementation—is the intellectual property of Sonora and its developers.</p>
                    <p className="mb-6">Unauthorized reproduction, redistribution, reverse-engineering, or commercial reuse of Sonora’s original platform systems, UI structures, animations, branding elements, and proprietary interaction mechanics without permission is prohibited.</p>
                    
                    <h5 className="font-bold text-white mb-2">Third-Party Media & Streaming Rights</h5>
                    <p className="mb-6">Sonora operates as an independent immersive music interface and playback environment. All music metadata, artist content, album artwork, streaming media, and third-party assets remain the property of their respective owners, labels, platforms, and licensors, including:</p>
                    <ul className="list-disc pl-5 mb-6 space-y-1">
                      <li><strong>Spotify AB</strong></li>
                      <li><strong>Apple Inc.</strong></li>
                      <li><strong>Google LLC</strong></li>
                      <li><strong>Associated Content Providers</strong></li>
                    </ul>
                    <p>Sonora does not claim ownership over externally sourced media or third-party services used for integration, inspiration, metadata delivery, or streaming functionality.</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
