import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { ensureAudioAnalyser, setBeatPlaying } from "./AudioVisualizer";
import { X, Maximize2, Sparkles, AlertTriangle, Tv, Shield } from "lucide-react";

export function GlobalTvPlayer() {
  const { 
    tvStream, 
    setTvStream, 
    tvBeatAmbient, 
    setTvBeatAmbient, 
    tvSandboxEnabled,
    setTvSandboxEnabled,
    broadcastTvStream, 
    isPlaying,
    siteSettings
  } = usePlayer();
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const [targetRect, setTargetRect] = useState(null);
  const [hlsLoaded, setHlsLoaded] = useState(false);
  const [videoError, setVideoError] = useState("");
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // 1. Monitor layout position of tv-player-portal-target on /tv page
  useEffect(() => {
    const updateRect = () => {
      if (location.pathname === "/tv") {
        const target = document.getElementById("tv-player-portal-target");
        if (target) {
          const rect = target.getBoundingClientRect();
          setTargetRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          });
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    updateRect();

    // Check continuously to ensure responsive updates during shifts or image loading
    let active = true;
    const loop = () => {
      if (!active) return;
      updateRect();
      requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [location.pathname, tvStream]);

  // Helper: Detect URL Type
  const detectStreamType = (url) => {
    if (!url) return "iframe";
    const trimmed = url.trim();
    if (trimmed.startsWith("<iframe") || trimmed.includes("</iframe>")) {
      return "iframe_code";
    }
    if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(trimmed)) {
      return "youtube";
    }
    if (/twitch\.tv/i.test(trimmed)) {
      return "twitch";
    }
    if (/\.m3u8/i.test(trimmed)) {
      return "hls";
    }
    if (/\.(mp4|webm|ogg|mov)/i.test(trimmed)) {
      return "video";
    }
    return "iframe";
  };

  const getYoutubeEmbedUrl = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=0&rel=0&modestbranding=1&showinfo=0`;
    }
    return url;
  };

  const getTwitchEmbedUrl = (url) => {
    const regExp = /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/i;
    const match = url.match(regExp);
    if (match && match[1]) {
      return `https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}&autoplay=true&muted=false`;
    }
    return url;
  };

  const getSandboxedIframeHtml = (iframeString) => {
    if (!iframeString.includes("<iframe")) return iframeString;
    
    // If sandbox is disabled, remove all sandbox attributes from the iframe HTML string
    if (!tvSandboxEnabled) {
      return iframeString
        .replace(/sandbox="[^"]*"/gi, "")
        .replace(/sandbox='[^']*'/gi, "")
        .replace(/\bsandbox\b/gi, "");
    }

    if (!/sandbox=/i.test(iframeString)) {
      return iframeString.replace(
        /<iframe/i, 
        `<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; gyroscope"`
      );
    }
    return iframeString;
  };

  // 2. Setup HLS and normal video players (runs globally, preserves DOM)
  useEffect(() => {
    if (!tvStream) return;
    const detectedType = detectStreamType(tvStream.url);
    const finalType = tvStream.type === "auto" ? detectedType : tvStream.type;

    if (finalType !== "hls" && finalType !== "video") return;
    
    const video = videoRef.current;
    if (!video) return;

    const streamUrlToLoad = tvStream.url;

    const playVideo = () => {
      video.play().catch(err => {
        console.warn("Autoplay blocked or failed:", err);
      });
    };

    const initHlsPlayer = () => {
      if (window.Hls) {
        if (window.Hls.isSupported()) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          const hls = new window.Hls({
            enableWorker: true,
            lowLatencyMode: true,
            maxMaxBufferLength: 10,
            backBufferLength: 5
          });

          hlsRef.current = hls;
          hls.loadSource(streamUrlToLoad);
          hls.attachMedia(video);
          
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            playVideo();
          });

          hls.on(window.Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case window.Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case window.Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  setVideoError("Failed to play HLS stream. Check URL or CORS settings.");
                  break;
              }
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrlToLoad;
          video.addEventListener("loadedmetadata", playVideo);
        } else {
          setVideoError("HLS streaming is not supported on this browser.");
        }
      }
    };

    if (finalType === "hls") {
      if (window.Hls) {
        initHlsPlayer();
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js";
        script.async = true;
        script.onload = () => {
          setHlsLoaded(true);
          initHlsPlayer();
        };
        document.body.appendChild(script);
      }
    } else {
      video.src = streamUrlToLoad;
      video.load();
      video.addEventListener("loadeddata", playVideo);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.src = "";
        video.removeEventListener("loadeddata", playVideo);
      }
    };
  }, [tvStream]);

  // 3. Ambient visualizer beat connector
  useEffect(() => {
    if (!tvStream) return;
    const detectedType = detectStreamType(tvStream.url);
    const finalType = tvStream.type === "auto" ? detectedType : tvStream.type;

    const video = videoRef.current;
    if (!video || (finalType !== "hls" && finalType !== "video")) {
      return;
    }

    if (tvBeatAmbient) {
      ensureAudioAnalyser(video);
      setBeatPlaying(true);
    }
  }, [tvStream, tvBeatAmbient, targetRect]);

  // 4. Pause TV stream if a song starts playing
  useEffect(() => {
    if (isPlaying && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  if (!tvStream || siteSettings?.enable_live_tv === false) return null;

  const detectedType = detectStreamType(tvStream.url);
  const finalType = tvStream.type === "auto" ? detectedType : tvStream.type;
  const isRawIframe = finalType === "iframe_code";

  // Build the unified player markup
  const playerContent = (
    <div className="w-full h-full absolute inset-0 z-10 flex items-center justify-center bg-black">
      
      {videoError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-black/80 text-red-400 gap-2.5 text-center">
          <AlertTriangle className="h-6 w-6" />
          <p className="text-xs">{videoError}</p>
        </div>
      )}

      {/* Type 1: Iframe embed (Raw HTML embed code) */}
      {finalType === "iframe" && isRawIframe && (
        <div 
          className="w-full h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_iframe]:bg-black"
          dangerouslySetInnerHTML={{ __html: getSandboxedIframeHtml(tvStream.url) }}
        />
      )}

      {/* Type 2: Iframe link (URL pasted as custom page frame) */}
      {finalType === "iframe" && !isRawIframe && (
        <iframe
          src={tvStream.url}
          className="w-full h-full border-0 bg-black"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; gyroscope"
          sandbox={tvSandboxEnabled ? "allow-scripts allow-same-origin allow-forms allow-presentation" : undefined}
        />
      )}

      {/* Type 3: YouTube Video / Live */}
      {finalType === "youtube" && (
        <iframe
          src={getYoutubeEmbedUrl(tvStream.url)}
          className="w-full h-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}

      {/* Type 4: Twitch Live Stream */}
      {finalType === "twitch" && (
        <iframe
          src={getTwitchEmbedUrl(tvStream.url)}
          className="w-full h-full border-0 bg-black"
          allowFullScreen
        />
      )}

      {/* Type 5: HLS / Native Video file player */}
      {(finalType === "hls" || finalType === "video") && (
        <video
          ref={videoRef}
          controls
          playsInline
          className="w-full h-full object-contain bg-black"
        />
      )}
    </div>
  );

  const isOnTvPage = location.pathname === "/tv";

  // Dynamic Styles: Overlay the placeholder on /tv, otherwise float as PiP
  const containerStyle = (isOnTvPage && targetRect)
    ? {
        position: "fixed",
        left: `${targetRect.left}px`,
        top: `${targetRect.top}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        zIndex: 30,
        borderRadius: "1.5rem",
        transition: "left 0.15s ease-out, top 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out",
        boxShadow: "0 32px 80px rgba(0, 0, 0, 0.8)",
        overflow: "hidden",
        pointerEvents: "auto"
      }
    : {
        position: "fixed",
        bottom: "6.5rem",
        right: "1.5rem",
        width: "20rem",
        height: "12rem",
        zIndex: 90,
        borderRadius: "1rem",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 10px 10px -5px rgba(0, 0, 0, 0.25)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
        pointerEvents: "auto",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
      };

  return (
    <div 
      style={containerStyle}
      className={!isOnTvPage ? "group" : undefined}
      title={!isOnTvPage ? "Click to go back to TV Page" : undefined}
    >
      {/* Actual Player Content */}
      <div className="w-full h-full absolute inset-0 z-0">
        {playerContent}
      </div>

      {/* Click-through cover to navigate (only in PiP mode) */}
      {!isOnTvPage && (
        <div 
          onClick={() => navigate("/tv")}
          className="w-full h-full absolute inset-0 z-10 cursor-pointer bg-transparent"
        />
      )}

      {/* Hover Controls Overlay (only in PiP mode) */}
      {!isOnTvPage && (
        <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          
          <div className="flex items-center gap-1.5 min-w-0">
            <Tv className="h-4.5 w-4.5 text-sage-400 shrink-0" />
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[150px]">
              Live Stream Feed
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle TV Beat Ambient */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const val = !tvBeatAmbient;
                setTvBeatAmbient(val);
                broadcastTvStream(tvStream, val, tvSandboxEnabled);
              }}
              className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-colors ${
                tvBeatAmbient 
                  ? "bg-sage-400 border-sage-400 text-ink-950" 
                  : "bg-black/40 border-white/10 text-white/60 hover:text-white"
              }`}
              title="Toggle Beat Reactivity"
            >
              <Sparkles className="h-3 w-3" />
            </button>

            {/* Toggle TV Sandbox / Shield */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const val = !tvSandboxEnabled;
                setTvSandboxEnabled(val);
                broadcastTvStream(tvStream, tvBeatAmbient, val);
              }}
              className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-colors ${
                tvSandboxEnabled 
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30" 
                  : "bg-black/40 border-white/10 text-white/60 hover:text-white"
              }`}
              title="Toggle Redirect Shield"
            >
              <Shield className="h-3 w-3" />
            </button>

            {/* Maximize */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate("/tv");
              }}
              className="h-6 w-6 rounded-lg bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-black/60 flex items-center justify-center transition-colors"
            >
              <Maximize2 className="h-3 w-3" />
            </button>

            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTvStream(null);
                broadcastTvStream(null);
              }}
              className="h-6 w-6 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
