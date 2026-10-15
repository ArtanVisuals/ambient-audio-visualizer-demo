import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { 
  Tv, 
  Link, 
  Play, 
  X, 
  Info, 
  Sparkles, 
  AlertTriangle,
  PlayCircle,
  Globe,
  ExternalLink,
  Shield
} from "lucide-react";

export function TvStream() {
  const { 
    tvStream, 
    setTvStream, 
    tvBeatAmbient, 
    setTvBeatAmbient, 
    tvSandboxEnabled,
    setTvSandboxEnabled,
    broadcastTvStream, 
    isPlaying,
    setIsPlaying,
    siteSettings
  } = usePlayer();

  if (siteSettings?.enable_live_tv === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md p-8 rounded-3xl premium-glass border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.6)] space-y-4">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Tv className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Live TV Disabled</h2>
          <p className="text-sm text-ink-400 leading-relaxed">
            Live TV feature has been temporarily disabled by the administrator. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  const [streamUrl, setStreamUrl] = useState("");
  const [inputType, setInputType] = useState("auto"); // "auto", "video", "youtube", "twitch", "iframe"
  const [aspectRatio, setAspectRatio] = useState("16/9"); // "16/9", "4/3", "fit"
  const [cinemaMode, setCinemaMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync input value with active global stream on mount/change
  useEffect(() => {
    if (tvStream) {
      setStreamUrl(tvStream.url);
      setInputType(tvStream.type);
    }
  }, [tvStream]);

  // Helper: Detect URL Type
  const detectStreamType = (input) => {
    const trimmed = input.trim();
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
    if (/^https?:\/\//i.test(trimmed)) {
      return "iframe";
    }
    return "iframe";
  };

  // Handle Stream Submit
  const handleStartStream = (e) => {
    if (e) e.preventDefault();
    if (!streamUrl.trim()) return;

    setErrorMessage("");
    const detected = detectStreamType(streamUrl);
    let finalType = inputType === "auto" ? detected : inputType;
    let finalUrl = streamUrl.trim();

    // Pause audio music playback
    if (isPlaying) {
      setIsPlaying(false);
    }

    const newStream = {
      url: finalUrl,
      type: finalType
    };

    setTvStream(newStream);
    broadcastTvStream(newStream);
  };

  // Preset Channels
  const presets = [
    {
      name: "NASA Live Stream",
      url: "https://www.youtube.com/watch?v=21X5lGlDOfg",
      type: "youtube",
      desc: "Official NASA TV live broadcast"
    },
    {
      name: "Lo-Fi Hip Hop Radio",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      type: "youtube",
      desc: "Relaxing beats live stream"
    },
    {
      name: "Big Buck Bunny HD",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      type: "hls",
      desc: "Standard HLS test channel"
    },
    {
      name: "Tears of Steel HLS",
      url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      type: "hls",
      desc: "Sci-fi HD test stream"
    }
  ];

  const handleSelectPreset = (preset) => {
    setStreamUrl(preset.url);
    setInputType(preset.type);
    
    // Pause audio music playback
    if (isPlaying) {
      setIsPlaying(false);
    }

    const newStream = {
      url: preset.url,
      type: preset.type
    };

    setTvStream(newStream);
    broadcastTvStream(newStream);
  };

  // Clear stream and go back to setup screen
  const handleCloseStream = () => {
    setTvStream(null);
    broadcastTvStream(null);
    setErrorMessage("");
  };

  // Cinema Backlight colors
  const glowStyle = cinemaMode && tvStream ? {
    boxShadow: `0 0 100px 10px rgba(var(--ambient-r, 30), var(--ambient-g, 40), var(--ambient-b, 35), 0.15)`
  } : {};

  return (
    <div className="w-full max-w-6xl mx-auto px-1 animate-in fade-in duration-500">
      
      {/* 1. Setup Stream View (when no stream URL is active) */}
      {!tvStream && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 text-center">
          
          {/* Animated Glow in the background */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-sage-400/5 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />

          <div className="w-full max-w-xl relative z-10 space-y-8">
            
            {/* Header Title */}
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-sage-400 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <Tv className="h-10 w-10 animate-pulse" strokeWidth={1.2} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                Sonora Live TV
              </h1>
              <p className="text-sm text-ink-400 max-w-md mx-auto leading-relaxed">
                Stream live channels, matches, or embed web streams. Perfect for watching FIFA World Cup while working or chillin' to music.
              </p>
            </div>

            {/* Input Form Card */}
            <form onSubmit={handleStartStream} className="p-6 rounded-3xl premium-glass space-y-4 shadow-[0_24px_64px_rgba(0,0,0,0.6)] text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-500 block">
                  Stream Link or Iframe Code
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-ink-500">
                    <Link className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Paste any stream link, video URL, or iframe embed code"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-sage-400/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Format selection */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 pt-1">
                {[
                  { value: "auto", label: "Auto-detect" },
                  { value: "iframe", label: "Web Link / Embed" },
                  { value: "hls", label: "HLS (.m3u8)" },
                  { value: "youtube", label: "YouTube" },
                  { value: "twitch", label: "Twitch" }
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setInputType(t.value)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                      inputType === t.value
                        ? "bg-sage-400 border-sage-400 text-ink-950 shadow-[0_0_12px_rgba(var(--ambient-r,195),var(--ambient-g,208),var(--ambient-b,184),0.2)]"
                        : "bg-white/[0.02] border-white/5 text-ink-400 hover:text-ink-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={!streamUrl.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black font-bold py-3.5 text-sm uppercase tracking-wider hover:bg-sage-400 hover:text-ink-950 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none shadow-lg"
              >
                <Play className="h-4 w-4 fill-current" />
                Stream Live Channel
              </button>
            </form>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs text-left flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Where to find FIFA World Cup Streams Guide */}
            <div className="text-left bg-white/[0.015] border border-white/[0.06] rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-[11px]">
                <Globe className="h-4 w-4 text-sage-400" />
                <span>Where to find FIFA World Cup Streams</span>
              </div>

              <div className="space-y-3.5 text-xs text-ink-400">
                {/* Section 1: Official */}
                <div className="space-y-1">
                  <span className="font-semibold text-ink-200 uppercase tracking-widest text-[9px] block">Official Broadcast Portals:</span>
                  <p className="leading-relaxed">
                    Open these in a new tab to access your local broadcaster (they may require login):
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: "JioCinema (India)", url: "https://www.jiocinema.com" },
                      { name: "BBC iPlayer (UK)", url: "https://www.bbc.co.uk/iplayer" },
                      { name: "Tubi TV (US Free)", url: "https://tubitv.com" },
                      { name: "SBS On Demand (AUS)", url: "https://www.sbs.com.au/ondemand" }
                    ].map((b) => (
                      <a 
                        key={b.name}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white px-2.5 py-1 rounded-lg transition"
                      >
                        <span>{b.name}</span>
                        <ExternalLink className="h-3 w-3 text-ink-500" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Section 2: Unofficial sports directories */}
                <div className="space-y-1 pt-1.5">
                  <span className="font-semibold text-ink-200 uppercase tracking-widest text-[9px] block">Live Sports Directories:</span>
                  <p className="leading-relaxed">
                    These websites list free live streams for active matches just before kick-off. Open them, choose the match, and grab the stream link:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: "Sportsurge", url: "https://sportsurge.net" },
                      { name: "StreamEast", url: "https://www.streameast.to" },
                      { name: "MethStreams", url: "https://methstreams.com" },
                      { name: "BuffStreams", url: "https://buffstreams.app" }
                    ].map((dir) => (
                      <a 
                        key={dir.name}
                        href={dir.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white px-2.5 py-1 rounded-lg transition"
                      >
                        <span>{dir.name}</span>
                        <ExternalLink className="h-3 w-3 text-ink-500" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Section 3: Inspect element trick */}
                <div className="pt-2 border-t border-white/[0.05] space-y-1 bg-white/[0.01] p-3 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-sage-400 font-semibold text-[10px] uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Secret Tip: Get the "Clean" Ad-Free Link</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-ink-400">
                    To completely bypass ads on free stream sites, extract the player link directly:
                  </p>
                  <ol className="list-decimal pl-4 pt-1 space-y-1 text-ink-500 leading-normal text-[11px]">
                    <li>Open the stream on any portal.</li>
                    <li>Right-click near the player and choose <strong className="text-ink-300 font-medium">Inspect</strong> (or press <kbd className="bg-white/5 px-1 py-0.5 rounded font-mono text-[10px]">F12</kbd>).</li>
                    <li>Locate the <code className="text-ink-300 font-mono font-normal">&lt;iframe src="..."&gt;</code> element.</li>
                    <li>Copy the URL inside that <code className="text-ink-300 font-mono font-normal">src</code> attribute and paste it above!</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Helper tips */}
            <div className="text-left bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 space-y-2.5 text-xs text-ink-400">
              <div className="flex items-center gap-2 text-ink-300 font-semibold uppercase tracking-wider text-[10px]">
                <Info className="h-3.5 w-3.5 text-sage-400" />
                <span>Redirect Shield &amp; Safe Embeds Active</span>
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-ink-400 leading-relaxed">
                <li>
                  <strong className="text-ink-200 font-semibold">Spam Filter:</strong> Free streaming websites often carry aggressive pop-ups. Our player wraps the stream inside a secure sandbox to block new windows, pop-ups, and auto-redirects. If a stream refuses to load or demands that sandbox attributes be removed, you can turn off the Redirect Shield using the control bar.
                </li>
                <li>
                  <strong className="text-ink-200 font-semibold">Iframe Codes:</strong> If the streaming site offers a copyable <code className="text-ink-200 bg-white/5 px-1 py-0.5 rounded font-mono font-normal">Embed Code</code> or HTML iframe, paste it directly!
                </li>
              </ul>
            </div>

            {/* Presets Grid */}
            <div className="space-y-4 text-left pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Sample Channels (Click to test)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.02] text-left hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-ink-400 group-hover:text-sage-400 transition-colors">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-200 truncate group-hover:text-white transition-colors">
                        {preset.name}
                      </p>
                      <p className="text-[11px] text-ink-500 truncate mt-0.5">
                        {preset.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Active Streaming View */}
      {tvStream && (
        <div className="flex flex-col space-y-4 py-4 md:py-8">
          
          {/* Top Panel Controls */}
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shrink-0" title="Live stream active" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-400">Streaming Live</p>
                <p className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md mt-0.5" title={tvStream.url}>
                  {tvStream.url}
                </p>
              </div>
            </div>

            {/* Control Bar Actions */}
            <div className="flex items-center gap-2">
              
              {/* Aspect Ratio */}
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-ink-200 hover:text-white cursor-pointer outline-none focus:border-sage-400/50"
              >
                <option value="16/9" className="bg-ink-950">16:9 Screen</option>
                <option value="4/3" className="bg-ink-950">4:3 Screen</option>
                <option value="fit" className="bg-ink-950">Fit Height</option>
              </select>

              {/* Redirect Shield Toggle */}
              <button
                onClick={() => {
                  const val = !tvSandboxEnabled;
                  setTvSandboxEnabled(val);
                  broadcastTvStream(tvStream, tvBeatAmbient, val);
                }}
                className={`flex h-8 px-3 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition ${
                  tvSandboxEnabled 
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30" 
                    : "bg-white/5 border-white/10 text-ink-400 hover:text-white"
                }`}
                title="Toggle Redirect Shield / Sandbox"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Shield {tvSandboxEnabled ? "On" : "Off"}</span>
              </button>

              {/* Ambiance Visualizer Reactivity toggle */}
              <button
                onClick={() => {
                  const val = !tvBeatAmbient;
                  setTvBeatAmbient(val);
                  broadcastTvStream(tvStream, val, tvSandboxEnabled);
                }}
                className={`flex h-8 px-3 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition ${
                  tvBeatAmbient 
                    ? "bg-sage-400 border-sage-400 text-ink-950 shadow-[0_0_12px_rgba(var(--ambient-r,195),var(--ambient-g,208),var(--ambient-b,184),0.2)]" 
                    : "bg-white/5 border-white/10 text-ink-400 hover:text-white"
                }`}
                title="Toggle Beat-Reactive Background Glow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Beat Reactive Ambient</span>
              </button>

              {/* Cinema Backlight mode */}
              <button
                onClick={() => setCinemaMode(!cinemaMode)}
                className={`hidden sm:flex h-8 px-3 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition ${
                  cinemaMode 
                    ? "bg-sage-400/20 border-sage-400/30 text-sage-400" 
                    : "bg-white/5 border-white/10 text-ink-400 hover:text-white"
                }`}
                title="Toggle Ambient Theatre Glow"
              >
                <span>Cinema Glow</span>
              </button>

              {/* Close Stream / Back */}
              <button
                onClick={handleCloseStream}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
                title="Close Stream & Return"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Target Element for Portaled Global Video Player */}
          <div 
            id="tv-player-portal-target"
            className="relative w-full overflow-hidden rounded-3xl bg-black border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.8)] transition-all duration-500"
            style={{ 
              aspectRatio: aspectRatio === "fit" ? "unset" : aspectRatio === "4/3" ? "4/3" : "16/9",
              maxHeight: aspectRatio === "fit" ? "75vh" : "unset",
              ...glowStyle
            }}
          />

          {/* Subtext advice */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between px-3 text-xs text-ink-500">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-sage-400" />
              <span>Feel free to navigate to Home or Search. The player will automatically float in the bottom corner and keep playing without reloading!</span>
            </div>
            
            {tvSandboxEnabled ? (
              <div className="flex items-center gap-1.5 text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full px-3 py-1 font-medium">
                <Shield className="h-3 w-3" />
                <span>Redirect Shield is active on this stream</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 rounded-full px-3 py-1 font-medium">
                <AlertTriangle className="h-3 w-3 animate-pulse" />
                <span>Shield disabled: Ads and popups may occur</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
