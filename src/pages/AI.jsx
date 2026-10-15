import { useState, useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { 
  Sparkles, 
  Send, 
  Play, 
  Pause, 
  Sliders,
  Tv,
  Clock,
  Layout,
  RefreshCw,
  Music
} from "lucide-react";

export function AI() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    skipNext,
    skipPrev,
    playTrack,
    liveMatchSport,
    showAlert,
    user,
    setAmbientEffectsEnabled,
    setTheme,
    setParticlesMode,
    setCrossPlayEnabled,
    setCrossfadeDuration,
    setMorphism,
    setEnableDateTimeAlert,
    setEnableLiveMatchScoreAlert,
    setLiveMatchSport,
    ambientEffectsEnabled,
    theme,
    particlesMode,
    crossPlayEnabled,
    crossfadeDuration,
    morphism,
    enableDateTimeAlert,
    enableLiveMatchScoreAlert
  } = usePlayer();

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("sonora_ai_chat_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        role: "assistant",
        content: "Hello! I am **Sonora AI**, your music & live assistant. Ask me to recommend songs, explain the current track, check live sports scores, or control your player!"
      }
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatListRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("sonora_ai_chat_history", JSON.stringify(messages));
    window.dispatchEvent(new Event("sonora_ai_history_updated"));
  }, [messages]);

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem("sonora_ai_chat_history");
      if (saved) {
        try { setMessages(JSON.parse(saved)); } catch (e) { console.error(e); }
      }
    };
    window.addEventListener("sonora_ai_history_updated", handleSync);
    return () => window.removeEventListener("sonora_ai_history_updated", handleSync);
  }, []);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const executeAIAction = async (action) => {
    if (!action || !action.type) return;
    try {
      switch (action.type) {
        case "TOGGLE_PLAY": togglePlay(); break;
        case "NEXT_TRACK": skipNext(); break;
        case "PREV_TRACK": skipPrev(); break;
        case "PLAY_TRACK":
          if (action.value) {
            const songName = action.value;
            const res = await fetch(`/api/search?q=${encodeURIComponent(songName)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.songs && data.songs.length > 0) {
                playTrack(data.songs[0]);
                setMessages(prev => [...prev, { role: "assistant", content: `⚡ **Sonora Playback**: Found and playing "${data.songs[0].title}" by ${data.songs[0].artist}.` }]);
              } else {
                setMessages(prev => [...prev, { role: "assistant", content: `⚠️ Could not find a song matching "${songName}" on the server.` }]);
              }
            }
          }
          break;
        case "TOGGLE_SETTING":
          if (action.setting) {
            const val = action.value;
            let friendlyName = action.setting;
            switch (action.setting) {
              case "ambient_effects": setAmbientEffectsEnabled(val === true || val === 'true'); friendlyName = "Ambient Visualizer"; break;
              case "theme": setTheme(val); friendlyName = `Theme to ${val}`; break;
              case "particles_mode": setParticlesMode(val); friendlyName = `Particles Mode to ${val}`; break;
              case "crossplay": setCrossPlayEnabled(val === true || val === 'true'); friendlyName = "Cross-Device Playback"; break;
              case "crossfade": setCrossfadeDuration(Number(val)); friendlyName = `Audio Crossfade to ${val}s`; break;
              case "morphism": setMorphism(val); friendlyName = `Morphism Mode to ${val}`; break;
              case "date_time_alert": setEnableDateTimeAlert(val === true || val === 'true'); friendlyName = "Date & Time Header Alert"; break;
              case "live_score_alert": setEnableLiveMatchScoreAlert(val === true || val === 'true'); friendlyName = "Live Sports Header Alert"; break;
              case "preferred_sport": setLiveMatchSport(val); friendlyName = `Preferred Sport Feed to ${val}`; break;
              default: break;
            }
            setMessages(prev => [...prev, { role: "assistant", content: `⚙️ **Settings Update**: Changed ${friendlyName} settings successfully.` }]);
            showAlert(`Updated ${friendlyName}!`);
          }
          break;
        case "CREATE_PLAYLIST":
          if (action.name) {
            const pName = action.name;
            if (!user || user.isAnonymous) { showAlert("Please sign in first to create playlists!"); break; }
            const res = await fetch('/api/playlists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-user-id': user?.uid || '' },
              body: JSON.stringify({ name: pName })
            });
            if (res.ok) {
              setMessages(prev => [...prev, { role: "assistant", content: `⚡ **Sonora AI**: Successfully created playlist "${pName}"!` }]);
              showAlert(`Created playlist "${pName}"!`);
            } else {
              const err = await res.json();
              showAlert(`Failed: ${err.error || 'Server error'}`);
            }
          }
          break;
        case "ADD_TO_PLAYLIST":
          if (action.songTitle && action.playlistName) {
            const sName = action.songTitle;
            const pName = action.playlistName;
            if (!user || user.isAnonymous) { showAlert("Please sign in first!"); break; }
            const sRes = await fetch(`/api/search?q=${encodeURIComponent(sName)}`);
            if (!sRes.ok) { showAlert(`Could not find song "${sName}"`); break; }
            const sData = await sRes.json();
            const song = sData.songs && sData.songs.find(s => s.title.toLowerCase().includes(sName.toLowerCase()) || sName.toLowerCase().includes(s.title.toLowerCase()));
            if (!song) { showAlert(`Could not find track matching "${sName}"`); break; }
            const pRes = await fetch('/api/playlists', { headers: { 'x-user-id': user?.uid || '' } });
            if (!pRes.ok) { showAlert("Failed to retrieve playlists"); break; }
            const playlists = await pRes.json();
            const playlist = playlists.find(p => p.name.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(p.name.toLowerCase()));
            if (!playlist) { showAlert(`Could not find playlist named "${pName}"`); break; }
            const addRes = await fetch(`/api/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-user-id': user?.uid || '' },
              body: JSON.stringify({ trackId: song.id })
            });
            if (addRes.ok) {
              setMessages(prev => [...prev, { role: "assistant", content: `⚡ **Sonora AI**: Added "${song.title}" to playlist "${playlist.name}"!` }]);
              showAlert(`Added "${song.title}" to "${playlist.name}"!`);
            } else {
              const err = await addRes.json();
              showAlert(`Failed: ${err.error || 'Server error'}`);
            }
          }
          break;
        default: console.warn("Unhandled AI Action:", action);
      }
    } catch (err) { console.error("AI action execution failed:", err); }
  };

  const handleSend = async (textToSend = input) => {
    const text = textToSend.trim();
    if (!text) return;
    const updatedMessages = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    if (textToSend === input) setInput("");
    setIsLoading(true);
    const geminiKey = localStorage.getItem("aura_gemini_api_key") || "";
    const groqKey = localStorage.getItem("aura_groq_api_key") || "";

    try {
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-gemini-key": geminiKey,
          "x-groq-key": groqKey
        },
        body: JSON.stringify({
          messages: apiMessages,
          currentTrack: currentTrack?.title ? currentTrack : null,
          playbackState: { isPlaying, progressFormatted: "N/A" },
          sport: liveMatchSport || "soccer"
        })
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Server failed"); }
      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      if (data.action) executeAIAction(data.action);
    } catch (err) {
      console.warn("Live Sonora AI failed:", err);
      if (geminiKey || groqKey) {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ **Sonora AI Error**: ${err.message || "Something went wrong while contacting the AI API."}` }]);
        setIsLoading(false);
        return;
      }
      const lowerText = text.toLowerCase();
      let reply = ""; let action = null;
      if (lowerText.includes("skip") || lowerText.includes("next")) { reply = "Sure! Skipping to next."; action = { type: "NEXT_TRACK" }; }
      else if (lowerText.includes("previous") || lowerText.includes("prev") || lowerText.includes("back")) { reply = "Playing previous track."; action = { type: "PREV_TRACK" }; }
      else if (lowerText.includes("pause") || lowerText.includes("stop") || lowerText.includes("play")) { reply = isPlaying ? "Pausing playback." : "Resuming playback."; action = { type: "TOGGLE_PLAY" }; }
      else if (lowerText.includes("song") || lowerText.includes("track") || lowerText.includes("playing")) {
        reply = currentTrack?.title ? `Now playing **"${currentTrack.title}"** by **${currentTrack.artist}**.` : "No song playing right now.";
      } else if (lowerText.includes("sport") || lowerText.includes("score")) {
        reply = `Tracking **${liveMatchSport?.toUpperCase() || 'SOCCER'}**. Add a Groq API Key (Recommended for free Llama 3.3) for live scores!`;
      } else { reply = "I'm in **Offline Mode**. Add a **Groq API Key (Recommended)** in Settings to unlock full AI!"; }
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (action) executeAIAction(action);
    } finally { setIsLoading(false); }
  };

  const clearChat = () => {
    if (window.confirm("Reset conversation history?")) {
      const defaultMsg = [{ role: "assistant", content: "Hello! I am **Sonora AI**, your music & live assistant. Ask me anything!" }];
      setMessages(defaultMsg);
      localStorage.setItem("sonora_ai_chat_history", JSON.stringify(defaultMsg));
      window.dispatchEvent(new Event("sonora_ai_history_updated"));
    }
  };

  const renderMarkdown = (content) => {
    if (!content) return null;
    return content.split("\n").map((line, idx) => {
      let clean = line;
      clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      clean = clean.replace(/\*(.*?)\*/g, "<em>$1</em>");
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
      if (isBullet) {
        return <li key={idx} className="ml-4 list-disc text-sm mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: clean.trim().substring(2) }} />;
      }
      return <p key={idx} className="text-sm leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: clean }} />;
    });
  };

  const suggestions = [
    { label: "🎵 Play chill track", prompt: "Play some chill music" },
    { label: "⚙️ Turn off Visualizer", prompt: "Turn off the ambient visualizer" },
    { label: "⏰ Toggle Topbar Clock", prompt: "Hide the date and time alert in the header" },
    { label: "⚽ Select Cricket Feed", prompt: "Set preferred sport to cricket" },
    { label: "📂 Create Playlist", prompt: "Create a playlist named Midnight Drive" }
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 pb-16">
      
      {/* LEFT SIDE: Dashboard */}
      <div className="w-full lg:w-80 shrink-0 space-y-6">
        
        {/* Bio Card */}
        <div className="rounded-2xl border bg-white/[0.02] p-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3.5 mb-4">
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(195,208,184,0.1)', color: '#c3d0b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sonora AI</h2>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c3d0b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Core Brain v2.5</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Connected to client controls, settings, playlist managers, and Google Search grounding.
          </p>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Grounding Status</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34d399' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
              Connected
            </span>
          </div>
        </div>

        {/* Context Monitor */}
        <div className="rounded-2xl border bg-white/[0.02] p-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Live Context Monitor</h3>
          
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {currentTrack?.cover ? (
              <img src={currentTrack.cover} alt="Cover" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <Music style={{ width: 20, height: 20 }} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack?.title || "No Active Song"}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack?.artist || "Player Idle"}</p>
            </div>
            {currentTrack && (
              <button onClick={togglePlay} style={{ padding: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {isPlaying ? <Pause style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
              </button>
            )}
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            {[
              { icon: <Sliders style={{ width: 14, height: 14, opacity: 0.5 }} />, label: "Ambient visualizer", value: ambientEffectsEnabled ? "ON" : "OFF", active: ambientEffectsEnabled },
              { icon: <Layout style={{ width: 14, height: 14, opacity: 0.5 }} />, label: "Theme Preset", value: theme || "Abyss", active: true },
              { icon: <Clock style={{ width: 14, height: 14, opacity: 0.5 }} />, label: "Header Clock", value: enableDateTimeAlert ? "VISIBLE" : "HIDDEN", active: enableDateTimeAlert },
              { icon: <Tv style={{ width: 14, height: 14, opacity: 0.5 }} />, label: "Sport scores", value: enableLiveMatchScoreAlert ? "VISIBLE" : "HIDDEN", active: enableLiveMatchScoreAlert },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{item.icon} {item.label}</span>
                <span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 700, borderRadius: 4, background: item.active ? 'rgba(195,208,184,0.1)' : 'rgba(255,255,255,0.05)', color: item.active ? '#c3d0b8' : 'rgba(255,255,255,0.3)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={clearChat}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)', padding: '12px 0', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          Reset Chat Conversation
        </button>
      </div>

      {/* RIGHT SIDE: Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500, maxHeight: 700, borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden', position: 'relative' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles style={{ width: 18, height: 18, color: '#c3d0b8' }} />
              INTELLIGENT COMPANION
            </h1>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Control, customize, playlist, and fetch scores</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c3d0b8' }} />
            Vibe Mode
          </div>
        </div>

        {/* Messages */}
        <div ref={chatListRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{ display: 'flex', flexDirection: 'column', maxWidth: '80%', alignSelf: msg.role === "user" ? 'flex-end' : 'flex-start', alignItems: msg.role === "user" ? 'flex-end' : 'flex-start' }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {msg.role === "user" ? "You" : "Sonora AI"}
              </span>
              <div style={{
                borderRadius: 16,
                padding: '12px 18px',
                fontSize: 13,
                lineHeight: 1.6,
                ...(msg.role === "user"
                  ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }
                  : { background: 'rgba(195,208,184,0.05)', border: '1px solid rgba(195,208,184,0.1)', color: 'rgba(255,255,255,0.8)' }
                )
              }}>
                {renderMarkdown(msg.content)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '80%' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sonora AI</span>
              <div style={{ borderRadius: 16, padding: '12px 18px', background: 'rgba(195,208,184,0.05)', border: '1px solid rgba(195,208,184,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="animate-bounce" style={{ width: 8, height: 8, borderRadius: '50%', background: '#c3d0b8', animationDelay: '0s' }} />
                <span className="animate-bounce" style={{ width: 8, height: 8, borderRadius: '50%', background: '#c3d0b8', animationDelay: '0.15s' }} />
                <span className="animate-bounce" style={{ width: 8, height: 8, borderRadius: '50%', background: '#c3d0b8', animationDelay: '0.3s' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div style={{ padding: '10px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexWrap: 'wrap', gap: 8, background: 'rgba(255,255,255,0.005)' }}>
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSend(s.prompt)}
              style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to toggle settings, create a playlist, play a song, or search the web..."
              style={{ width: '100%', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', padding: '14px 56px 14px 16px', fontSize: 13, color: '#fff', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{ position: 'absolute', right: 10, padding: 8, borderRadius: 12, background: '#c3d0b8', color: '#0a0a0a', border: 'none', cursor: 'pointer', opacity: (isLoading || !input.trim()) ? 0.4 : 1 }}
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
