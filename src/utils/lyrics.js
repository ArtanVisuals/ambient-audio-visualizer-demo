/**
 * Synced Lyrics Engine
 * Provides preloaded synced lyrics for default tracks and auto-generates
 * aesthetic, beat-aligned mock lyrics for searched/external songs.
 */

const PRELOADED_LYRICS = {
  // Nightcrawlers - Kansy (example default track)
  "kansy": `
[00:00.00] ♫ (Deep House Intro)
[00:08.50] Yeah, I feel it in the air tonight
[00:12.00] The rhythm's moving through the neon light
[00:16.00] We are the nightcrawlers, chasing the sun
[00:20.20] Under the city lights, we have begun
[00:24.50] Ooh, feel the bassline drop
[00:28.00] Once we start, we ain't ever gonna stop
[00:32.00] In the shadows of the metropolitan glow
[00:36.50] This is the place where the dreamers go
[00:40.80] Yeah, feel the energy rising high
[00:44.20] We're reaching up to touch the cosmic sky
[00:48.00] ♫ (Synthesizer Solo)
[00:58.00] Walk with me through the midnight street
[01:02.30] Feel the vibration under our feet
[01:06.00] No yesterday, no tomorrow in sight
[01:10.50] We live our lives in the neon light
[01:14.80] Ooh, feel the bassline drop
[01:18.20] Once we start, we ain't ever gonna stop
[01:22.50] ♫ (Outro Fade)
  `,
  "default_track": `
[00:00.00] ♫ (Ambient Instrumental Intro)
[00:12.00] Welcome to the sound of Sonora
[00:18.00] Close your eyes and let the frequency guide you
[00:24.00] Floating high above the atmosphere
[00:30.00] Colors blending in the twilight glow
[00:36.00] Feel the rhythm sync up with your heartbeat
[00:42.00] ♫ (Ambient Visualizer Break)
[00:54.00] We fade into the deep, quiet spaces
[01:00.00] Where the melodies play without an end
[01:06.00] Thank you for listening with us tonight
  `
};

export function parseLyrics(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      const time = min * 60 + sec;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export function getSyncedLyrics(track, duration = 180) {
  if (!track) return [];

  // Match by title substring or id
  const titleLower = (track.title || "").toLowerCase();
  let lrcText = "";

  if (track.lyrics && track.lyrics.trim().toLowerCase() !== "none" && track.lyrics.trim() !== "") {
    lrcText = track.lyrics;
  } else if (titleLower.includes("nightcrawlers") || titleLower.includes("kansy")) {
    lrcText = PRELOADED_LYRICS["kansy"];
  } else if (PRELOADED_LYRICS[track.id]) {
    lrcText = PRELOADED_LYRICS[track.id];
  } else {
    // If no lyrics are saved in database or preloaded, return empty array so player shows "Lyrics not available"
    return [];
  }

  return parseLyrics(lrcText);
}
