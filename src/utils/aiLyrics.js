import { parseLyrics } from "./lyrics";

/**
 * AI Synced Lyrics Generator & Real-Time Audio Transcriber
 * Powered by Google Gemini 1.5 Flash Audio API + Groq Whisper + Web Speech live fallback.
 */

// Helper to convert an AudioBuffer or Blob to Base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate full synchronized LRC lyrics using Gemini / AI
 * @param {Object} track - The active track object
 * @param {HTMLAudioElement} [audioEl] - Optional audio element to extract actual audio stream
 */
export async function generateAiSyncedLyrics(track, audioEl) {
  if (!track) throw new Error("No track provided");

  const cacheKey = `sonora_ai_lrc_${track.id || track.title || 'unknown'}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return { lyricsText: cached, parsed: parseLyrics(cached) };
  }

  const payload = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration || 180,
    audioUrl: track.audioUrl || (audioEl?.src?.startsWith('http') ? audioEl.src : null)
  };

  const res = await fetch('/api/tracks/generate-ai-lyrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Generation failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.lyrics) {
    throw new Error("No lyrics returned by AI");
  }

  // Cache locally
  localStorage.setItem(cacheKey, data.lyrics);

  return {
    lyricsText: data.lyrics,
    parsed: parseLyrics(data.lyrics)
  };
}

/**
 * Real-Time Live Speech-to-Text Transcriber (Browser Web Speech API)
 * Listens to audio playback and streams real-time lyric subtitles.
 */
export class RealtimeLiveTranscriber {
  constructor(onLyric) {
    this.onLyric = onLyric;
    this.recognition = null;
    this.isListening = false;
    this.startTime = 0;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const results = event.results;
        for (let i = event.resultIndex; i < results.length; i++) {
          const transcript = results[i][0].transcript.trim();
          const isFinal = results[i].isFinal;
          if (transcript) {
            this.onLyric?.({
              text: transcript,
              isFinal,
              timestamp: Date.now()
            });
          }
        }
      };

      this.recognition.onerror = (e) => {
        console.warn("[Live Lyrics] Speech recognition error:", e.error);
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try { this.recognition.start(); } catch (_) {}
        }
      };
    }
  }

  start() {
    if (!this.recognition || this.isListening) return false;
    try {
      this.isListening = true;
      this.startTime = Date.now();
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn("[Live Lyrics] Failed to start:", e);
      this.isListening = false;
      return false;
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;
    this.isListening = false;
    try {
      this.recognition.stop();
    } catch (_) {}
  }
}
