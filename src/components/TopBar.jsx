import { Bell, ChevronLeft, ChevronRight, Menu, Search, LogOut, Sparkles, MonitorSpeaker, Timer, Pause, Play, RotateCcw, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { WorldCupScoreIsland } from "./WorldCupScoreIsland";
import { MaintenanceTimerPill } from "./MaintenanceTimerPill";

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

const getDateTimeSegments = (date) => {
  if (!date) return { weekday: '', month: '', day: '', hour: '', minute: '', second: '', period: '' };
  
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = String(date.getDate());
  
  let hours = date.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hour = String(hours).padStart(2, '0');
  
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return { weekday, month, day, hour, minute, second, period };
};

const formatSeconds = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function TopBar() {
  const { 
    user, 
    loginWithGoogle, 
    logout, 
    isAuthLoading, 
    siteSettings, 
    sessions, 
    morphism,
    sleepTimerActive,
    setSleepTimerActive,
    sleepTimerSecondsLeft,
    setSleepTimerSecondsLeft,
    initialSleepDuration,
    enableDateTimeAlert,
    importStatus
  } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notifRef = useRef(null);

  const [isTimerExpanded, setIsTimerExpanded] = useState(false);
  const collapseTimerRef = useRef(null);
  const timerIslandRef = useRef(null);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (timerIslandRef.current && !timerIslandRef.current.contains(event.target)) {
        setIsTimerExpanded(false);
      }
    }
    if (isTimerExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTimerExpanded]);

  useEffect(() => {
    if (sleepTimerSecondsLeft === null) {
      setIsTimerExpanded(false);
    }
  }, [sleepTimerSecondsLeft]);


  const [currentTime, setCurrentTime] = useState(new Date());
  const [knownSessionIds, setKnownSessionIds] = useState(null);
  const [loginAlert, setLoginAlert] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  const isOnPlaylistsPage = location.pathname === '/playlists';
  const showBackgroundPopup = importStatus?.active && !isOnPlaylistsPage;
  const progress = importStatus?.progress || 0;
  const importStep = importStatus?.step || 'idle';

  useEffect(() => {
    if (loginAlert) {
      setActiveAlert(loginAlert);
    }
  }, [loginAlert]);

  const segments = getDateTimeSegments(currentTime);

  const sleepTimerMins = Math.floor((sleepTimerSecondsLeft || 0) / 60);
  const sleepTimerSecs = Math.floor((sleepTimerSecondsLeft || 0) % 60);
  const sleepTimerMinStr = sleepTimerMins.toString().padStart(2, '0');
  const sleepTimerSecStr = sleepTimerSecs.toString().padStart(2, '0');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sessions || sessions.length === 0 || !user) return;

    const currentSessionId = localStorage.getItem('aura_session_id');
    const newSessionIds = sessions.map(s => s.id);

    if (knownSessionIds === null) {
      // Establish baseline on first load
      setKnownSessionIds(newSessionIds);
    } else {
      // Find new login sessions
      const newLogins = sessions.filter(
        s => s.id !== currentSessionId && !knownSessionIds.includes(s.id)
      );

      if (newLogins.length > 0) {
        const latestLogin = newLogins[0];
        setLoginAlert({
          deviceName: latestLogin.device || 'Unknown Device',
          deviceId: latestLogin.id
        });

        // Set baseline to the new session IDs list so we don't alert again
        setKnownSessionIds(newSessionIds);
      } else {
        // If a session was removed, update the known sessions to keep in sync
        const hasRemovals = knownSessionIds.some(id => !newSessionIds.includes(id));
        if (hasRemovals) {
          setKnownSessionIds(newSessionIds);
        }
      }
    }
  }, [sessions, knownSessionIds, user]);

  // Dedicated automatic dismissal timer for loginAlert
  useEffect(() => {
    if (!loginAlert) return;
    const alertTimer = setTimeout(() => {
      setLoginAlert(null);
    }, 10000);
    return () => clearTimeout(alertTimer);
  }, [loginAlert]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = [];
  if (siteSettings?.admin_notification_message && siteSettings?.enable_admin_notification !== false) {
    notifications.push({
      id: 1,
      title: siteSettings.admin_notification_title || "New Feature Available!",
      message: siteSettings.admin_notification_message,
      time: "Just now",
      unread: true,
      type: "update"
    });
  }
  notifications.push({
    id: 2,
    title: "Welcome to " + (siteSettings?.site_title || "Sonora") + " Premium",
    message: "Enjoy ad-free, high-fidelity audio streaming with real-time room synchronization.",
    time: "2 hours ago",
    unread: false,
    type: "welcome"
  });

  const getClockMorphismClasses = () => {
    if (!enableDateTimeAlert) {
      return 'max-w-0 opacity-0 scale-75 pointer-events-none px-0 py-0 border-transparent shadow-none';
    }
    switch (morphism) {
      case 'neobrutalism':
        return 'rounded-none border-2 border-white bg-black shadow-[3px_3px_0px_0px_#ffffff] px-4 py-1.5';
      case 'claymorphism':
        return 'rounded-2xl border-none bg-white/[0.04] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.08),inset_-2px_-2px_4px_rgba(0,0,0,0.4)] px-4 py-2';
      case 'skeuomorphism':
        return 'rounded-2xl border border-white/[0.08] border-t-white/[0.15] border-l-white/[0.15] bg-gradient-to-br from-white/[0.05] to-white/[0.01] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.04),2px_2px_5px_rgba(0,0,0,0.4)] px-4 py-2';
      case 'minimalism':
        return 'rounded-full border border-white/[0.04] bg-white/[0.01] px-4 py-1';
      case 'glassmorphism':
      default:
        return 'rounded-full border border-white/[0.06] bg-white/[0.02] shadow-sm px-4 py-1.5 backdrop-blur-md';
    }
  };

  const getAlertMorphismClasses = () => {
    switch (morphism) {
      case 'neobrutalism':
        return 'rounded-none border-2 border-red-500 bg-black shadow-[3px_3px_0px_0px_#ef4444]';
      case 'claymorphism':
        return 'rounded-2xl border-none bg-red-900/10';
      case 'skeuomorphism':
        return 'rounded-2xl border border-red-500/80 bg-gradient-to-br from-red-500/15 to-red-500/5';
      case 'minimalism':
        return 'rounded-full border border-red-500/60 bg-red-950/20';
      case 'glassmorphism':
      default:
        return 'rounded-full border border-red-500 bg-red-950/20 backdrop-blur-md';
    }
  };

  return (
    <header className="sticky top-4 z-40 mb-8 flex w-full items-center justify-between rounded-[1.25rem] premium-glass px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-all hover:bg-white/[0.04] hover:border-white/[0.12]">
      <div className="flex w-full items-center justify-between">
        {/* Left: Brand Logo */}
        <div className="flex items-center pl-2 select-none">
          <span className="text-lg font-bold tracking-[0.35em] text-white/90 drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
            SONORA
          </span>
        </div>

        {/* Center: Date/Time & Dynamic Island */}
        <div className="flex items-center justify-center flex-1 mx-2 sm:mx-4 overflow-visible">
          <div className="flex items-center justify-center transition-all duration-700 ease-in-out gap-3">
            {/* Sleep Timer Capsule */}
            <div
              ref={timerIslandRef}
              onClick={() => {
                if (!isTimerExpanded) {
                  setIsTimerExpanded(true);
                  startCollapseTimer();
                }
              }}
              className={`transition-all duration-700 ease-in-out flex items-center justify-center overflow-hidden whitespace-nowrap ${
                isTimerExpanded ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.08]'
              } ${
                sleepTimerSecondsLeft !== null
                  ? (isTimerExpanded ? 'max-w-[320px] opacity-100 scale-100 mr-1 px-3 py-1.5' : 'max-w-[150px] opacity-100 scale-100 mr-1 px-3.5 py-1.5')
                  : 'max-w-0 opacity-0 scale-75 pointer-events-none mr-0 px-0 py-0 border-transparent shadow-none'
              } ${getClockMorphismClasses()}`}
              style={morphism !== 'glassmorphism' ? {
                '--text-primary': '#ffffff',
                '--text-secondary': 'rgba(255, 255, 255, 0.7)'
              } : {}}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-300 tracking-wide select-none">
                <Timer className={`h-3.5 w-3.5 text-indigo-400 ${sleepTimerActive ? 'animate-pulse' : 'opacity-60'}`} />
                <div className="flex items-center">
                  <TickerSegment value={sleepTimerMinStr[0]} />
                  <TickerSegment value={sleepTimerMinStr[1]} />
                  <span className={`mx-[1px] opacity-60 ${sleepTimerActive ? 'animate-pulse' : ''}`}>:</span>
                  <TickerSegment value={sleepTimerSecStr[0]} />
                  <TickerSegment value={sleepTimerSecStr[1]} />
                </div>
                
                <div
                  className={`flex items-center gap-1.5 overflow-hidden transition-all duration-500 ease-in-out ${
                    isTimerExpanded
                      ? 'max-w-[150px] opacity-100'
                      : 'max-w-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <span className="mx-1.5 h-3.5 w-[1px] bg-white/10 shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Pause / Resume */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSleepTimerActive(!sleepTimerActive);
                        startCollapseTimer();
                      }}
                      className="p-1 rounded hover:bg-white/10 text-ink-300 hover:text-white transition duration-150 shrink-0"
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
                      className="p-1 rounded hover:bg-white/10 text-ink-300 hover:text-white transition duration-150 shrink-0"
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
                      className="p-1 rounded hover:bg-red-500/10 text-ink-300 hover:text-red-400 transition duration-150 shrink-0"
                      title="Cancel"
                    >
                      <X className="h-3 w-3 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Clock Capsule */}
            <div
              className={`transition-all duration-700 ease-in-out ${getClockMorphismClasses()}`}
              style={morphism !== 'glassmorphism' ? {
                '--text-primary': '#ffffff',
                '--text-secondary': 'rgba(255, 255, 255, 0.7)'
              } : {}}
            >
              <div className="flex items-center gap-1 text-xs font-semibold text-ink-300 tracking-wide select-none">
                <TickerSegment value={segments.weekday} />
                <span>,</span>
                <TickerSegment value={segments.month} />
                <TickerSegment value={segments.day} />
                <span className="mx-1 opacity-60">•</span>
                
                {/* Time segments */}
                <div className="flex items-center">
                  <TickerSegment value={segments.hour[0]} />
                  <TickerSegment value={segments.hour[1]} />
                  <span className="mx-[1px] animate-pulse">:</span>
                  <TickerSegment value={segments.minute[0]} />
                  <TickerSegment value={segments.minute[1]} />
                  <span className="mx-[1px] opacity-60">:</span>
                  <TickerSegment value={segments.second[0]} />
                  <TickerSegment value={segments.second[1]} />
                </div>
                
                <span className="ml-1 text-[10px] font-bold opacity-80 uppercase">
                  <TickerSegment value={segments.period} />
                </span>
              </div>
            </div>

            {showBackgroundPopup && (
              <>
                <style>{`
                  @keyframes sheen-slide {
                    0% { transform: translateX(-110%); }
                    100% { transform: translateX(210%); }
                  }
                  .flux-progress-fill {
                    background: linear-gradient(90deg, #1d6ffb 0%, #48a8ff 35%, #74e1ff 55%, #48a8ff 78%, #1d6ffb 100%);
                    box-shadow: 0 0 14px rgba(29, 111, 251, 0.55), 0 0 24px rgba(116, 225, 255, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1.5px 2px rgba(0, 40, 120, 0.3);
                  }
                  .flux-sheen {
                    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
                    animation: sheen-slide 1.6s linear infinite;
                  }
                `}</style>
                <div
                  className="relative flex items-center justify-center overflow-hidden h-7 w-40 rounded-full border border-white/[0.15] bg-black/50 shadow-md transition-all duration-500 ease-in-out shrink-0 select-none animate-in slide-in-from-top-4 fade-in duration-300"
                >
                  {/* The Glowing Flux Progress Fill */}
                  <div 
                    className="absolute top-0 left-0 h-full flux-progress-fill transition-all duration-500 ease-out overflow-hidden" 
                    style={{ width: `${progress}%` }}
                  >
                    {/* Sliding Sheen Glider */}
                    <span 
                      className="absolute inset-y-0 left-0 w-1/2 rounded-full flux-sheen"
                      style={{ mixBlendMode: 'screen' }}
                    />
                  </div>
                  
                  {/* Text Overlay */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white select-none z-10 px-2 uppercase tracking-widest"
                    style={{ 
                      textShadow: '1px 1px 2px rgba(0,0,0,0.95), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' 
                    }}
                  >
                    {importStep === 'fetching_metadata' && (
                      <span className="flex items-center gap-1.5 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        Metadata...
                      </span>
                    )}

                    {importStep === 'importing_tracks' && (
                      <div className="flex items-center gap-1">
                        <span>Songs:</span>
                        <div className="flex items-center font-mono font-bold">
                          {Math.floor(progress / 100) > 0 && (
                            <TickerSegment value={String(Math.floor(progress / 100))} />
                          )}
                          <TickerSegment value={String(Math.floor((progress % 100) / 10))} />
                          <TickerSegment value={String(progress % 10)} />
                          <span>%</span>
                        </div>
                      </div>
                    )}

                    {importStep === 'lyrics_checklist' && (
                      <span className="animate-pulse">Checklist...</span>
                    )}

                    {importStep === 'fetching_lyrics' && (
                      <div className="flex items-center gap-1">
                        <span>Lyrics:</span>
                        <div className="flex items-center font-mono font-bold">
                          {Math.floor(progress / 100) > 0 && (
                            <TickerSegment value={String(Math.floor(progress / 100))} />
                          )}
                          <TickerSegment value={String(Math.floor((progress % 100) / 10))} />
                          <TickerSegment value={String(progress % 10)} />
                          <span>%</span>
                        </div>
                      </div>
                    )}

                    {importStep === 'completed' && (
                      <span className="text-sage-300 font-black animate-bounce">Complete</span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* World Cup Score Island Ticker */}
            <WorldCupScoreIsland />

            {/* Scheduled Maintenance Timer Pill */}
            <MaintenanceTimerPill />

            {/* Dynamic Island Alert Capsule */}
            <div
              className={`transition-all duration-700 ease-in-out flex items-center justify-center overflow-hidden whitespace-nowrap ${
                loginAlert
                  ? 'max-w-[400px] opacity-100 scale-100 pointer-events-auto ml-1 px-5 py-2.5'
                  : 'max-w-0 opacity-0 scale-75 pointer-events-none ml-0 px-0 py-0 border-transparent shadow-none'
              } ${getAlertMorphismClasses()}`}
              style={loginAlert && morphism !== 'neobrutalism' ? {
                borderColor: '#ef4444',
                boxShadow: morphism === 'claymorphism' 
                  ? 'inset 2px 2px 4px rgba(255, 255, 255, 0.1), inset -4px -4px 8px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(239, 68, 68, 0.25)' 
                  : (morphism === 'skeuomorphism' 
                    ? 'inset 1px 1px 0px rgba(255, 255, 255, 0.15), 3px 3px 6px rgba(239, 68, 68, 0.35)' 
                    : '0 0 20px rgba(239, 68, 68, 0.55)'),
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                '--text-primary': '#ffffff',
                '--text-secondary': 'rgba(255, 255, 255, 0.7)'
              } : (loginAlert ? {
                '--text-primary': '#ffffff',
                '--text-secondary': 'rgba(255, 255, 255, 0.7)'
              } : {
                borderWidth: 0,
                boxShadow: 'none'
              })}
            >
              {activeAlert && (
                <div 
                  className={`flex items-center gap-3 transition-opacity duration-500 ${
                    loginAlert ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-red-400 leading-none mb-1">
                      New Device Login Detected
                    </span>
                    <span className="text-[11px] font-bold text-ink-100 leading-none">
                      {activeAlert.deviceName}
                      <span className="text-[9px] text-ink-400 font-normal ml-1.5">
                        ({activeAlert.deviceId})
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden gap-2 md:flex">
            {[ChevronLeft, ChevronRight].map((Icon, index) => (
              <button
                onClick={() => navigate(index === 0 ? -1 : 1)}
                aria-label={index === 0 ? "Go back" : "Go forward"}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.035] text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-100"
                key={index}
                type="button"
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </button>
            ))}
          </div>

          {siteSettings?.enable_admin_notification !== false && (
            <div className="relative">
              <button 
                onClick={() => navigate("/notifications")}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.035] text-ink-400 hover:bg-white/[0.06] hover:text-ink-100 transition" 
                type="button" 
                aria-label="Notifications & Support"
              >
                <Bell className="h-4 w-4" strokeWidth={1.8} />
                {notifications.some(n => n.unread) && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                )}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 pl-2 border-l border-white/10">
            {user ? (
              <>
                <button 
                  onClick={logout}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.035] text-white/50 transition hover:bg-white/[0.06] hover:text-white"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <div className="group relative">
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="h-10 w-10 rounded-full border border-white/10 object-cover shadow-lg ring-2 ring-transparent transition duration-300 group-hover:ring-sage-400/50"
                  />
                </div>
              </>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex h-9 items-center justify-center rounded-lg bg-sage-400 px-4 text-xs font-bold text-ink-950 transition hover:bg-sage-300"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
