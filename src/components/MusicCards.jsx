import { Play, Minimize2, Maximize2, ChevronDown, ChevronUp } from "lucide-react";
import { AlbumArt } from "./AlbumArt";
import { usePlayer } from "../context/PlayerContext";
import { useRef, useState, useEffect, memo } from "react";

const handleMouseMove = (e) => {
  let rect = e.currentTarget._cachedRect;
  if (!rect) {
    rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget._cachedRect = rect;
  }
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
  e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
};

const handleMouseLeaveCard = (e) => {
  e.currentTarget._cachedRect = null;
};

/** Compact horizontal scroll cards (140 px wide) used for library / newly-added sections */
export const SmallCards = memo(function SmallCards({ items }) {
  const { playContext, openTrackMenu } = usePlayer();
  const pressTimer = useRef(null);

  const handlePressStart = (e, track) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    pressTimer.current = setTimeout(() => {
      openTrackMenu(track, clientX, clientY);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
      {items.map((item, index) => (
        <article
          className="group glow-card w-[140px] shrink-0 rounded-xl p-1.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.035] cursor-pointer"
          key={item.id || item.title}
          onMouseMove={handleMouseMove}
          style={{ "--delay": `${index * 35}ms` }}
          onContextMenu={(e) => { e.preventDefault(); openTrackMenu(item, e.clientX, e.clientY); }}
          onMouseDown={(e) => handlePressStart(e, item)}
          onMouseUp={handlePressEnd}
          onMouseLeave={(e) => { handlePressEnd(); handleMouseLeaveCard(e); }}
          onTouchStart={(e) => handlePressStart(e, item)}
          onTouchEnd={handlePressEnd}
          onTouchMove={handlePressEnd}
        >
          <AlbumArt cover={item.cover} className="aspect-square transition duration-300 group-hover:scale-[1.018] group-hover:shadow-hover">
            <button
              onClick={() => playContext(items, index)}
              className="absolute bottom-2 right-2 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-ink-100 text-ink-950 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
              type="button"
              aria-label={`Play ${item.title}`}
            >
              <Play className="h-3 w-3 fill-current" />
            </button>
          </AlbumArt>
          <h3 className="mt-2 truncate text-xs font-medium text-ink-100">{item.title}</h3>
          <p className="mt-0.5 truncate text-xs text-ink-500">{item.artist}</p>
        </article>
      ))}
    </div>
  );
});

export const HorizontalCards = memo(function HorizontalCards({ items }) {
  const { playContext, openTrackMenu } = usePlayer();
  const pressTimer = useRef(null);

  const handlePressStart = (e, track) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    pressTimer.current = setTimeout(() => {
      openTrackMenu(track, clientX, clientY);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
      {items.map((item, index) => (
        <article
          className="group glow-card w-[174px] shrink-0 rounded-xl p-2 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.035] cursor-pointer"
          key={item.id || item.title}
          onMouseMove={handleMouseMove}
          style={{ "--delay": `${index * 45}ms` }}
          onContextMenu={(e) => { e.preventDefault(); openTrackMenu(item, e.clientX, e.clientY); }}
          onMouseDown={(e) => handlePressStart(e, item)}
          onMouseUp={handlePressEnd}
          onMouseLeave={(e) => { handlePressEnd(); handleMouseLeaveCard(e); }}
          onTouchStart={(e) => handlePressStart(e, item)}
          onTouchEnd={handlePressEnd}
          onTouchMove={handlePressEnd}
        >
          <AlbumArt cover={item.cover} className="aspect-square transition duration-300 group-hover:scale-[1.018] group-hover:shadow-hover">
            <button
              onClick={() => playContext(items, index)}
              className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-ink-100 text-ink-950 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
              type="button"
              aria-label={`Play ${item.title}`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          </AlbumArt>
          <h3 className="mt-3 truncate text-sm font-medium text-ink-100">{item.title}</h3>
          <p className="mt-1 truncate text-sm text-ink-500">{item.artist}</p>
        </article>
      ))}
    </div>
  );
});

export const AlbumGrid = memo(function AlbumGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <article
          className="group glow-card rounded-xl bg-white/[0.025] p-3 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.055]"
          key={item.title}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeaveCard}
        >
          <AlbumArt cover={item.cover} className="aspect-square transition duration-300 group-hover:shadow-hover" />
          <div className="mt-4">
            <h3 className="truncate text-sm font-semibold text-ink-100">{item.title}</h3>
            <p className="mt-1 truncate text-sm text-ink-500">{item.artist}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-500">{item.type}</p>
          </div>
        </article>
      ))}
    </div>
  );
});

export const RecommendationCards = memo(function RecommendationCards({ items }) {
  const { openTrackMenu } = usePlayer();
  const pressTimer = useRef(null);

  const handlePressStart = (e, track) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    pressTimer.current = setTimeout(() => {
      openTrackMenu(track, clientX, clientY);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <article 
          className="group glow-card flex items-center gap-4 rounded-xl border border-white/[0.055] bg-white/[0.03] p-3 transition duration-300 hover:border-white/[0.1] hover:bg-white/[0.055] cursor-pointer" 
          key={item.id || item.title}
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => { e.preventDefault(); openTrackMenu(item, e.clientX, e.clientY); }}
          onMouseDown={(e) => handlePressStart(e, item)}
          onMouseUp={handlePressEnd}
          onMouseLeave={(e) => { handlePressEnd(); handleMouseLeaveCard(e); }}
          onTouchStart={(e) => handlePressStart(e, item)}
          onTouchEnd={handlePressEnd}
          onTouchMove={handlePressEnd}
        >
          <AlbumArt cover={item.cover} className="h-20 w-20 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink-100">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-500">{item.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
});

const getColorHash = (str) => {
  if (!str) return '167, 139, 250'; // default lavender
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const r = Math.round(Math.abs((hash & 0xFF0000) >> 16) % 180 + 50);
  const g = Math.round(Math.abs((hash & 0x00FF00) >> 8) % 180 + 50);
  const b = Math.round(Math.abs(hash & 0x0000FF) % 180 + 50);
  return `${r}, ${g}, ${b}`;
};

const formatDuration = (seconds) => {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const TrendingCards = memo(function TrendingCards({ items, title = "Trending Now", subtitle = "Top charts globally" }) {
  const { playContext, openTrackMenu, isPlaying, ambientEffectsEnabled } = usePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTrendingExpanded, setIsTrendingExpanded] = useState(false);
  const pressTimer = useRef(null);

  // Touch swipe refs
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Transition state for single track view
  const [activeItem, setActiveItem] = useState(null);
  const [fade, setFade] = useState(true);

  // Initialize active item
  useEffect(() => {
    if (items && items.length > 0 && !activeItem) {
      setActiveItem(items[currentIndex]);
    }
  }, [items, currentIndex, activeItem]);

  // Handle auto-advance
  useEffect(() => {
    if (!items || items.length === 0 || isHovered || isTrendingExpanded) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [items, isHovered, isTrendingExpanded]);

  // Handle smooth transition of single card contents
  useEffect(() => {
    if (!items || items.length === 0) return;
    setFade(false);
    const timeout = setTimeout(() => {
      setActiveItem(items[currentIndex]);
      setFade(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [currentIndex, items]);

  if (!items || items.length === 0 || !activeItem) return null;

  // Touch Swipe Gestures
  const handleTouchStart = (e) => {
    if (isTrendingExpanded) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (isTrendingExpanded || touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx < 0) {
        // Swipe left -> Next Song
        setCurrentIndex((prev) => (prev + 1) % items.length);
      } else {
        // Swipe right -> Prev Song
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Compute color based on current index item
  const currentItem = items[currentIndex];
  const color = getColorHash(currentItem.cover || currentItem.title);

  // Dynamic transparency logic:
  // Transparent when a song is playing AND ambient effects are enabled
  const isTransparent = isPlaying && ambientEffectsEnabled;

  const handlePressStart = (e, track) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    pressTimer.current = setTimeout(() => {
      openTrackMenu(track, clientX, clientY);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="flex justify-start w-full">
      <article
        onContextMenu={(e) => {
          if (!isTrendingExpanded) {
            e.preventDefault();
            openTrackMenu(activeItem, e.clientX, e.clientY);
          }
        }}
        onMouseLeave={(e) => {
          handlePressEnd();
          setIsHovered(false);
          handleMouseLeaveCard(e);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        className="group glow-card relative flex flex-col w-full max-w-3xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 cursor-default border-0 select-none overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          backgroundColor: isTransparent ? "rgba(255, 255, 255, 0.01)" : `rgba(${color}, 0.28)`,
          boxShadow: isTransparent 
            ? "none" 
            : `0 16px 48px 0 rgba(0, 0, 0, 0.45), 0 0 32px 0 rgba(${color}, 0.12)`,
          maxHeight: isTrendingExpanded ? "1200px" : "144px", // Height animation ceiling
          transition: 'background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.6s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease',
        }}
      >
        {/* COLLAPSED VIEW */}
        <div 
          onClick={() => {
            if (!isTrendingExpanded) {
              playContext(items, currentIndex);
            }
          }}
          className={`flex w-full items-center gap-3 sm:gap-6 cursor-pointer transition-all duration-300 ${isTrendingExpanded ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}
          style={{
            transition: 'opacity 0.25s ease-in-out',
          }}
        >
          {/* Fading Content Wrapper */}
          <div 
            className="flex-1 min-w-0 flex items-center gap-3 sm:gap-6"
            style={{
              opacity: fade ? 1 : 0,
              transform: fade ? 'scale(1) translateY(0)' : 'scale(0.98) translateY(2px)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
          >
            {/* Left: Cover Art */}
            <div className="relative h-16 w-16 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl shadow-xl transition-transform duration-300 group-hover:scale-[1.03]">
              <AlbumArt cover={activeItem.cover} className="h-full w-full object-cover" />
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-black shadow-md transform scale-90 transition-transform duration-300 group-hover:scale-100">
                  <Play className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* Right: Meta Details */}
            <div className="min-w-0 flex-1 flex flex-col justify-between h-16 sm:h-24 py-0.5 sm:py-1.5">
              <div>
                <h3 className="truncate text-base sm:text-xl font-black text-white tracking-tight leading-tight">
                  {activeItem.title}
                </h3>
                <p className="truncate text-xs sm:text-sm font-semibold text-ink-400 mt-0.5 sm:mt-1.5">
                  {activeItem.artist}
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2.5 mt-auto">
                <span className="rounded-md px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-[9px] font-bold tracking-wider uppercase border bg-white/[0.04] border-white/[0.08] text-ink-300">
                  PREVIEW 30s
                </span>
                {activeItem.duration && (
                  <span className="text-[10px] sm:text-[11px] text-ink-500 font-semibold font-mono">
                    {formatDuration(activeItem.duration)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expand controls (Chevron expand button + dots) */}
          <div className="shrink-0 flex flex-col items-center gap-2 sm:gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsTrendingExpanded(true)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white transition-all duration-200"
              aria-label="View all songs"
            >
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Slider Dots */}
            <div className="flex gap-0.5 sm:gap-1 bg-black/40 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-white/5 backdrop-blur-sm">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-2.5 sm:w-3.5 bg-white' : 'w-1 bg-white/30'}`}
                  aria-label={`Go to track ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* EXPANDED VIEW LIST */}
        <div 
          className={`flex flex-col w-full transition-all duration-300 ${isTrendingExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 sm:pb-4 mb-3 sm:mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">{title}</h2>
              <p className="text-[10px] sm:text-xs text-ink-400 font-medium mt-0.5">{subtitle}</p>
            </div>
            <button
              onClick={() => setIsTrendingExpanded(false)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white transition-all duration-200"
              aria-label="Minimize view"
            >
              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* List of Tracks */}
          <div className="flex flex-col gap-1.5 sm:gap-2 max-h-[320px] sm:max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
            {items.map((track, idx) => {
              const isCurrentPlaying = activeItem.id === track.id;
              return (
                <div
                  key={track.id || track.title}
                  onClick={() => {
                    setCurrentIndex(idx);
                    playContext(items, idx);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openTrackMenu(track, e.clientX, e.clientY);
                  }}
                  onMouseDown={(e) => handlePressStart(e, track)}
                  onMouseUp={handlePressEnd}
                  className={`group/item flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer ${
                    isCurrentPlaying 
                      ? 'bg-white/[0.08] shadow-inner' 
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Track Index */}
                  <span className="w-4 sm:w-5 text-center text-[10px] sm:text-xs font-bold text-ink-500 font-mono">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>

                  {/* Album Art */}
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-md sm:rounded-lg shadow-md">
                    <AlbumArt cover={track.cover} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 fill-white text-white" />
                    </div>
                  </div>

                  {/* Track Details */}
                  <div className="min-w-0 flex-1">
                    <h4 className={`truncate text-xs sm:text-sm font-bold tracking-tight transition-colors duration-200 ${
                      isCurrentPlaying ? 'text-sage-300' : 'text-white'
                    }`}>
                      {track.title}
                    </h4>
                    <p className="truncate text-[10px] sm:text-xs text-ink-400 font-medium mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {/* Right Badges */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="rounded px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold tracking-wider uppercase border bg-white/[0.04] border-white/[0.08] text-ink-300">
                      PREVIEW
                    </span>
                    {track.duration && (
                      <span className="text-[10px] sm:text-xs text-ink-500 font-bold font-mono">
                        {formatDuration(track.duration)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </article>
    </div>
  );
});

