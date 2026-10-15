import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { AlbumArt } from "./AlbumArt";
import { usePlayer } from "../context/PlayerContext";

function getDefaultBio(track) {
  if (!track) return "";
  return track.genre
    ? `Experience the latest ${track.genre} release from ${track.artist}${track.releaseDate ? `, originally released in ${new Date(track.releaseDate).getFullYear()}` : ''}. Add it to your library and enjoy.`
    : `Listen to one of the top trending songs worldwide right now. Add it to your library and enjoy.`;
}

export function HeroRecommendation({ globalHits = [] }) {
  const { playContext, toggleLikeGlobal } = usePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bios, setBios] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const fetchedIds = useRef(new Set());
  const autoplayRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const containerRef = useRef(null);

  const resetAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (!globalHits || globalHits.length === 0) return;
    autoplayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % globalHits.length);
    }, 6000);
  }, [globalHits]);

  useEffect(() => {
    resetAutoplay();
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [resetAutoplay]);

  const goTo = (idx) => {
    setCurrentIndex((idx + globalHits.length) % globalHits.length);
    resetAutoplay();
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Only treat as horizontal swipe if horizontal movement dominates
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      goTo(currentIndex + (dx < 0 ? 1 : -1));
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMouseDown = (e) => {
    touchStartX.current = e.clientX;
  };

  const handleMouseUp = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.clientX - touchStartX.current;
    if (Math.abs(dx) > 60) {
      goTo(currentIndex + (dx < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  const featuredTrack = globalHits && globalHits.length > 0 ? globalHits[currentIndex] : null;

  useEffect(() => {
    if (!featuredTrack || fetchedIds.current.has(featuredTrack.id)) return;

    fetchedIds.current.add(featuredTrack.id);

    fetch("/api/ai/bio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-key": localStorage.getItem("aura_gemini_api_key") || "",
        "x-groq-key": localStorage.getItem("aura_groq_api_key") || ""
      },
      body: JSON.stringify({
        title: featuredTrack.title,
        artist: featuredTrack.artist,
        genre: featuredTrack.genre,
        releaseDate: featuredTrack.releaseDate
      })
    })
    .then(res => {
      if (!res.ok) throw new Error("API failed");
      return res.json();
    })
    .then(data => {
      if (data && data.bio) {
        setBios(prev => ({ ...prev, [featuredTrack.id]: data.bio }));
      } else {
        setBios(prev => ({ ...prev, [featuredTrack.id]: getDefaultBio(featuredTrack) }));
      }
    })
    .catch(() => {
      setBios(prev => ({ ...prev, [featuredTrack.id]: getDefaultBio(featuredTrack) }));
    });
  }, [featuredTrack?.id]);

  useEffect(() => {
    setIsExpanded(false);
  }, [featuredTrack?.id]);

  if (!globalHits || globalHits.length === 0) return null;
  if (!featuredTrack) return null;

  return (
    <section
      ref={containerRef}
      className="reveal grid gap-6 py-8 md:grid-cols-[minmax(260px,0.68fr),1fr] md:items-center lg:gap-10 overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="relative animate-in slide-in-from-right-8 fade-in zoom-in-95 duration-700 ease-out" key={featuredTrack.id}>
        <AlbumArt cover={featuredTrack.cover} className="aspect-square min-h-[260px] w-full md:min-h-[360px]">
          <div className="absolute bottom-7 left-7">
            <p className="text-xs uppercase tracking-[0.24em] text-white/48">Trending Now • {currentIndex + 1} of {globalHits.length}</p>
            <p className="mt-2 text-xl font-semibold text-white/88">{featuredTrack.album || 'Single'}</p>
          </div>
        </AlbumArt>
      </div>

      <div className="max-w-2xl min-w-0 animate-in slide-in-from-right-12 fade-in duration-700 ease-out" key={`info-${featuredTrack.id}`}>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-sage-400/80">Tonight's recommendation</p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-normal text-ink-100 sm:text-5xl lg:text-6xl line-clamp-2 break-words">
          {featuredTrack.title}
        </h1>
        <p className="mt-5 text-lg text-ink-300 truncate">{featuredTrack.artist}</p>
        {(() => {
          const bioText = bios[featuredTrack.id] || getDefaultBio(featuredTrack);
          const isLong = bioText.length > 160;
          return (
            <p
              onClick={isLong ? () => setIsExpanded(!isExpanded) : undefined}
              className={`mt-5 max-w-xl text-base leading-7 text-ink-400 transition-colors duration-200 ${
                isLong ? 'cursor-pointer hover:text-ink-200' : ''
              }`}
              title={isLong ? (isExpanded ? "Click to collapse" : "Click to show full description") : undefined}
            >
              {isLong && !isExpanded ? (
                <>
                  {bioText.slice(0, 155).trim()}
                  <span className="text-sage-400 font-bold hover:text-sage-300 ml-1">...</span>
                </>
              ) : (
                bioText
              )}
            </p>
          );
        })()}
        <div className="mt-9 flex items-center gap-3">
          <button
            onClick={() => playContext(globalHits, currentIndex)}
            className="flex h-12 items-center gap-3 rounded-full bg-ink-100 px-6 text-sm font-semibold text-ink-950 transition duration-200 hover:bg-white" type="button"
          >
            <Play className="h-4 w-4 fill-current" strokeWidth={2} />
            Play
          </button>
          <button
            onClick={() => toggleLikeGlobal(featuredTrack, !featuredTrack.isLiked)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] transition duration-200 hover:border-white/[0.14] hover:bg-white/[0.055] ${featuredTrack.isLiked ? 'text-sage-400' : 'text-ink-300 hover:text-ink-100'}`}
            type="button"
            aria-label="Save track"
          >
            <Heart className="h-5 w-5" strokeWidth={1.8} fill={featuredTrack.isLiked ? "currentColor" : "none"} />
          </button>

          {/* Nav arrows — desktop */}
          <div className="ml-auto hidden md:flex items-center gap-2">
            <button
              onClick={() => goTo(currentIndex - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-ink-300 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-ink-300 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mt-8 flex flex-wrap gap-2">
          {globalHits.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-sage-400' : 'w-1.5 bg-white/[0.1]'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
