import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "../context/PlayerContext";
import { Sparkles, X, Send, Play, Pause, SkipForward, SkipBack, MessageSquare, Volume2, ShieldAlert } from "lucide-react";

export function SonoraAIWidget() {
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
    setLiveMatchSport
  } = usePlayer();

  const [isOpen, setIsOpen] = useState(false);
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
  const messagesEndRef = useRef(null);

  // Sync messages to localStorage
  useEffect(() => {
    localStorage.setItem("sonora_ai_chat_history", JSON.stringify(messages));
    window.dispatchEvent(new Event("sonora_ai_history_updated"));
  }, [messages]);

  // Listen for history updates from page/widget
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem("sonora_ai_chat_history");
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener("sonora_ai_history_updated", handleSync);
    return () => window.removeEventListener("sonora_ai_history_updated", handleSync);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  // Execute player actions returned by the AI
  const executeAIAction = async (action) => {
    if (!action || !action.type) return;

    try {
      switch (action.type) {
        case "TOGGLE_PLAY":
          togglePlay();
          break;
        case "NEXT_TRACK":
          skipNext();
          break;
        case "PREV_TRACK":
          skipPrev();
          break;
        case "PLAY_TRACK":
          if (action.value) {
            const songName = action.value;
            const res = await fetch(`/api/search?q=${encodeURIComponent(songName)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.songs && data.songs.length > 0) {
                playTrack(data.songs[0]);
                setMessages(prev => [
                  ...prev,
                  { role: "assistant", content: `⚡ **Sonora Playback**: Found and playing "${data.songs[0].title}" by ${data.songs[0].artist}.` }
                ]);
              } else {
                setMessages(prev => [
                  ...prev,
                  { role: "assistant", content: `⚠️ Could not find a song matching "${songName}" on the server.` }
                ]);
              }
            }
          }
          break;
        case "TOGGLE_SETTING":
          if (action.setting) {
            const val = action.value;
            let friendlyName = action.setting;
            switch (action.setting) {
              case "ambient_effects":
                setAmbientEffectsEnabled(val === true || val === 'true');
                friendlyName = "Ambient Visualizer";
                break;
              case "theme":
                setTheme(val);
                friendlyName = `Theme to ${val}`;
                break;
              case "particles_mode":
                setParticlesMode(val);
                friendlyName = `Particles Mode to ${val}`;
                break;
              case "crossplay":
                setCrossPlayEnabled(val === true || val === 'true');
                friendlyName = "Cross-Device Playback";
                break;
              case "crossfade":
                setCrossfadeDuration(Number(val));
                friendlyName = `Audio Crossfade to ${val}s`;
                break;
              case "morphism":
                setMorphism(val);
                friendlyName = `Morphism Mode to ${val}`;
                break;
              case "date_time_alert":
                setEnableDateTimeAlert(val === true || val === 'true');
                friendlyName = "Date & Time Header Alert";
                break;
              case "live_score_alert":
                setEnableLiveMatchScoreAlert(val === true || val === 'true');
                friendlyName = "Live Sports Header Alert";
                break;
              case "preferred_sport":
                setLiveMatchSport(val);
                friendlyName = `Preferred Sport Feed to ${val}`;
                break;
              default:
                break;
            }
            const updateMsg = `⚙️ **Settings Update**: Changed ${friendlyName} settings successfully.`;
            setMessages(prev => [...prev, { role: "assistant", content: updateMsg }]);
            showAlert(`Updated ${friendlyName}!`);
          }
          break;
        case "CREATE_PLAYLIST":
          if (action.name) {
            const pName = action.name;
            if (!user || user.isAnonymous) {
              showAlert("Please sign in first to create playlists!");
              break;
            }
            const res = await fetch('/api/playlists', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.uid || ''
              },
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
            if (!user || user.isAnonymous) {
              showAlert("Please sign in first to add tracks to playlists!");
              break;
            }
            // 1. Search for track
            const sRes = await fetch(`/api/search?q=${encodeURIComponent(sName)}`);
            if (!sRes.ok) {
              showAlert(`Could not find song "${sName}"`);
              break;
            }
            const sData = await sRes.json();
            const song = sData.songs && sData.songs.find(s => s.title.toLowerCase().includes(sName.toLowerCase()) || sName.toLowerCase().includes(s.title.toLowerCase()));
            if (!song) {
              showAlert(`Could not find track matching "${sName}"`);
              break;
            }
            // 2. Find playlist
            const pRes = await fetch('/api/playlists', {
              headers: { 'x-user-id': user?.uid || '' }
            });
            if (!pRes.ok) {
              showAlert("Failed to retrieve playlists");
              break;
            }
            const playlists = await pRes.json();
            const playlist = playlists.find(p => p.name.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(p.name.toLowerCase()));
            if (!playlist) {
              showAlert(`Could not find playlist named "${pName}"`);
              break;
            }
            // 3. Add to playlist
            const addRes = await fetch(`/api/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.uid || ''
              },
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
        default:
          console.warn("Unhandled AI Action:", action);
      }
    } catch (err) {
      console.error("AI action execution failed:", err);
    }
  };

  const handleSend = async (textToSend = input) => {
    const text = textToSend.trim();
    if (!text) return;

    // Add user message
    const updatedMessages = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    if (textToSend === input) setInput("");
    setIsLoading(true);

    const geminiKey = localStorage.getItem("aura_gemini_api_key") || "";
    const groqKey = localStorage.getItem("aura_groq_api_key") || "";

    // Live AI mode - Try this first!
    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

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
          playbackState: {
            isPlaying,
            progressFormatted: "N/A"
          },
          sport: liveMatchSport || "soccer"
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Server failed to process AI response");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      
      if (data.action) {
        executeAIAction(data.action);
      }
    } catch (err) {
      console.warn("Live Sonora AI failed, falling back to local offline responses:", err);

      if (geminiKey || groqKey) {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `❌ **Sonora AI Error**: ${err.message || "Something went wrong while contacting the AI API. Please verify your API Key is correct in Settings."}`
          }
        ]);
        return;
      }

      // Simulate Agent response (Offline/Mock Mode)
      const lowerText = text.toLowerCase();
      let reply = "";
      let action = null;

      if (lowerText.includes("skip") || lowerText.includes("next")) {
        reply = "Sure! I am skipping to the next song in your queue.";
        action = { type: "NEXT_TRACK" };
      } else if (lowerText.includes("previous") || lowerText.includes("prev") || lowerText.includes("back")) {
        reply = "Alright, playing the previous track.";
        action = { type: "PREV_TRACK" };
      } else if (lowerText.includes("pause") || lowerText.includes("stop") || lowerText.includes("play")) {
        reply = isPlaying ? "Pausing playback." : "Resuming playback.";
        action = { type: "TOGGLE_PLAY" };
      } else if (lowerText.includes("song") || lowerText.includes("track") || lowerText.includes("playing")) {
        if (currentTrack && currentTrack.title) {
          reply = `You are currently listening to **"${currentTrack.title}"** by **${currentTrack.artist}** from the album *${currentTrack.album || "N/A"}*.\n\n*(To get deep lyrics analyses and track reviews, please add a Groq API Key (Recommended for free Llama 3.3) in Settings!)*`;
        } else {
          reply = "You don't have any song playing right now. Select a song from Home or Search to get started!";
        }
      } else if (lowerText.includes("sport") || lowerText.includes("score") || lowerText.includes("match") || lowerText.includes("game")) {
        reply = `Live sports scores tracking is configured to track **${liveMatchSport?.toUpperCase() || 'SOCCER'}**.\n\nTo fetch live internet scores and summaries directly from ESPN scoreboard CDN, please configure your Groq API Key (Recommended for free Llama 3.3) in Settings!`;
      } else {
        reply = "I'm in **Offline/Mock Mode** right now. I can help you with simple playback controls (like typing 'skip' or 'pause') and check your current song context.\n\nTo unlock my full AI brain, please go to **Settings** and paste your **Groq API Key (Recommended)**!";
      }

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (action) {
        executeAIAction(action);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse basic markdown elements securely
  const renderMarkdown = (content) => {
    if (!content) return null;
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      let cleanLine = line;

      // Handle simple bold formatting
      const boldRegex = /\*\*(.*?)\*\*/g;
      cleanLine = cleanLine.replace(boldRegex, "<strong>$1</strong>");

      // Handle simple italic formatting
      const italicRegex = /\*(.*?)\*/g;
      cleanLine = cleanLine.replace(italicRegex, "<em>$1</em>");

      // Handle bullet points
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
      if (isBullet) {
        const bulletText = cleanLine.trim().substring(2);
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-xs text-ink-200 mb-1 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: bulletText }}
          />
        );
      }

      return (
        <p
          key={idx}
          className="text-xs text-ink-200 leading-relaxed mb-2.5"
          dangerouslySetInnerHTML={{ __html: cleanLine }}
        />
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-28 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sage-400 text-ink-950 shadow-[0_4px_20px_rgba(195,208,184,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 group"
        title="Chat with Sonora AI"
      >
        <Sparkles className="h-5 w-5 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute inset-0 rounded-full border border-sage-400/30 animate-ping pointer-events-none" />
      </button>

      {/* Sliding Side Drawer Panel */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Dismiss tap target on left */}
          <div className="flex-1" onClick={() => setIsOpen(false)} />

          {/* Drawer Body */}
          <div className="relative w-full max-w-sm md:max-w-md h-full bg-[#0d0f0d]/90 backdrop-blur-3xl border-l border-white/[0.08] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sage-400/10 text-sage-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-100 uppercase tracking-wider">Sonora AI</h3>
                  <p className="text-[10px] text-ink-500 font-medium">Music & Live Scores Companion</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-ink-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col max-w-[85%] ${
                    msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <span className="text-[9px] font-semibold text-ink-500 mb-1 uppercase tracking-wider">
                    {msg.role === "user" ? "You" : "Sonora AI"}
                  </span>
                  
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-white/5 border border-white/10 text-ink-100"
                        : "bg-sage-400/5 border border-sage-400/15 text-ink-200 shadow-[0_0_15px_rgba(195,208,184,0.02)]"
                    }`}
                  >
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              ))}

              {/* Bouncing Loader */}
              {isLoading && (
                <div className="flex flex-col max-w-[85%] mr-auto items-start">
                  <span className="text-[9px] font-semibold text-ink-500 mb-1 uppercase tracking-wider">Sonora AI</span>
                  <div className="rounded-2xl px-4 py-3 bg-sage-400/5 border border-sage-400/10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce duration-500" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce duration-500" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce duration-500" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Chips Suggestions */}
            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-white/[0.04] bg-white/[0.005]">
              {currentTrack?.title && (
                <button
                  onClick={() => handleSend("Tell me about this song details and review")}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-ink-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  🎵 About Current Song
                </button>
              )}
              <button
                onClick={() => handleSend(`What are the live scores of today's ${liveMatchSport || 'soccer'} matches?`)}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-ink-300 hover:bg-white/10 hover:text-white transition-all"
              >
                🏆 Sports Scores
              </button>
              <button
                onClick={() => handleSend("Suggest a nice playlist for studying and focus")}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-ink-300 hover:bg-white/10 hover:text-white transition-all"
              >
                ✨ Study Recommendations
              </button>
              <button
                onClick={() => handleSend("Skip this song")}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-ink-300 hover:bg-white/10 hover:text-white transition-all"
              >
                🔀 Skip Track
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-4 border-t border-white/[0.06] bg-white/[0.01] flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask Sonora AI anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs text-white placeholder-ink-500 outline-none focus:border-sage-400 focus:bg-white/[0.08] transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-xl bg-sage-400 text-ink-950 font-bold px-3 py-2 flex items-center justify-center hover:bg-sage-300 transition-all disabled:opacity-50 active:scale-[0.97]"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
