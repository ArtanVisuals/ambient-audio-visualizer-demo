import React, { useState } from "react";
import { Youtube, Sparkles, X, Play, Loader2, Music2, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { extractAndSetColors } from "./AudioVisualizer";

function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const PRESET_TRACKS = [
  {
    name: "Synthwave Sunset",
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    genre: "Synthwave / Chill"
  },
  {
    name: "Lofi Rain & Coffee",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    genre: "Lofi Hip Hop"
  },
  {
    name: "Cyberpunk Horizon",
    url: "https://www.youtube.com/watch?v=N3akj0Y6Pcs",
    genre: "Electronic / Bass"
  },
  {
    name: "Deep Ambient Space",
    url: "https://www.youtube.com/watch?v=S_MOd40zlsk",
    genre: "Space Ambient"
  }
];

export function YoutubeFetchModal({ isOpen, onClose }) {
  const { queue, setQueue, setCurrentTrackIndex, setIsPlaying } = usePlayer();
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successTrack, setSuccessTrack] = useState(null);

  if (!isOpen) return null;

  const handleFetch = async (targetUrl = urlInput) => {
    const url = (targetUrl || "").trim();
    if (!url) {
      setError("Please paste a valid YouTube URL.");
      return;
    }

    const videoId = getYouTubeId(url);
    if (!videoId) {
      setError("Invalid YouTube URL. Please use a format like https://www.youtube.com/watch?v=... or https://youtu.be/...");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessTrack(null);

    let title = "YouTube Audio Stream";
    let artist = "YouTube Creator";
    let cover = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      // 1. Fetch metadata via noembed
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) title = data.title;
          if (data.author_name) artist = data.author_name;
          if (data.thumbnail_url) cover = data.thumbnail_url;
        }
      } catch (e) {
        console.warn("noembed fetch fallback:", e);
      }

      // 2. Extract vibrant colors from cover image to power the WebGL Ambiance background
      extractAndSetColors(cover);

      // 3. Create song object
      const newTrack = {
        id: `yt_${videoId}_${Date.now()}`,
        title: title,
        artist: artist,
        album: "YouTube Music",
        cover: cover,
        audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
        duration: 240,
        source: "youtube"
      };

      // 4. Prepend to queue and set as current playing track
      const updatedQueue = [newTrack, ...queue.filter(t => t.id !== newTrack.id)];
      setQueue(updatedQueue);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      setSuccessTrack(newTrack);

      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1200);

    } catch (err) {
      console.error("YouTube fetch error:", err);
      setError("Failed to fetch YouTube details. Please check the URL and try again.");
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text);
          handleFetch(text);
        }
      }
    } catch (e) {
      console.warn("Clipboard access denied:", e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121413]/90 p-6 md:p-8 shadow-2xl backdrop-blur-2xl text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400">
            <Youtube className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Fetch from YouTube
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Live Engine
              </span>
            </h2>
            <p className="text-xs text-white/50">
              Paste any YouTube song link to stream audio and react with the WebGL ambiance visualizer.
            </p>
          </div>
        </div>

        {/* URL Input Form */}
        <div className="mt-5 space-y-3">
          <div className="relative flex items-center">
            <input 
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFetch();
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 pr-24 text-sm text-white placeholder-white/30 outline-none focus:border-red-500/60 focus:bg-white/[0.08] transition"
              autoFocus
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={handlePaste}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white/70 hover:text-white transition"
              >
                Paste
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleFetch()}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Fetching Metadata & Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-white" />
                <span>Fetch Song & Play Ambiance</span>
              </>
            )}
          </button>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successTrack && (
          <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <div className="truncate">
              <span className="font-semibold">{successTrack.title}</span> loaded and playing!
            </div>
          </div>
        )}

        {/* Quick Test Presets */}
        <div className="mt-6 border-t border-white/[0.08] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2.5 flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-sage-400" />
            Or Try These Instant Presets:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_TRACKS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setUrlInput(preset.url);
                  handleFetch(preset.url);
                }}
                className="flex flex-col items-start p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.07] hover:border-white/15 transition text-left group"
              >
                <span className="text-xs font-semibold text-white/90 group-hover:text-red-400 transition truncate w-full">
                  {preset.name}
                </span>
                <span className="text-[10px] text-white/40 truncate w-full">
                  {preset.genre}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
