import React, { useEffect, useRef, useState, useMemo } from "react";
import { ListMusic, Volume2, Infinity, ChevronUp, ChevronDown, X, Play } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { AlbumArt } from "../AlbumArt";
import { MarqueeText } from "../MarqueeText";

export function NowPlayingQueue({ 
  isOpen, 
  onClose, 
  morphism, 
  setProgress, 
  setRepeatCount,
  matchedHeight
}) {
  const {
    queue: playlist,
    currentTrackIndex,
    setCurrentTrackIndex,
    setIsPlaying,
    isPlaying,
    currentTrack,
    openTrackMenu,
    autoplayEnabled,
    setAutoplayEnabled
  } = usePlayer();

  const [expandTop, setExpandTop] = useState(false);
  const [expandBottom, setExpandBottom] = useState(false);

  const scrollContainerRef = useRef(null);
  const nowPlayingItemRef = useRef(null);

  // Derive previous tracks and upcoming tracks
  const prevTracks = useMemo(() => {
    if (currentTrackIndex <= 0) return [];
    return playlist.slice(0, currentTrackIndex).map((track, i) => ({
      track,
      originalIndex: i
    }));
  }, [playlist, currentTrackIndex]);

  const nextTracks = useMemo(() => {
    if (currentTrackIndex >= playlist.length - 1) return [];
    return playlist.slice(currentTrackIndex + 1).map((track, i) => ({
      track,
      originalIndex: currentTrackIndex + 1 + i
    }));
  }, [playlist, currentTrackIndex]);

  // Center now-playing song in the scroll view on open or track change
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (scrollContainerRef.current && nowPlayingItemRef.current) {
        const container = scrollContainerRef.current;
        const item = nowPlayingItemRef.current;
        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const relativeTop = itemRect.top - containerRect.top;

        container.scrollTo({
          top: container.scrollTop + relativeTop - (containerRect.height / 2) + (itemRect.height / 2),
          behavior: 'smooth'
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isOpen, currentTrackIndex, expandTop, expandBottom]);

  if (!isOpen) return null;

  // Compute dynamic height and translation matching media controls box exactly in default state
  let dynamicHeight = matchedHeight ? `${matchedHeight}px` : "390px";
  let transformClass = "translate-y-0";

  if (expandTop && expandBottom) {
    dynamicHeight = "min(84vh, 760px)";
    transformClass = "translate-y-0";
  } else if (expandTop) {
    dynamicHeight = "min(68vh, 620px)";
    transformClass = "-translate-y-12 md:-translate-y-16";
  } else if (expandBottom) {
    dynamicHeight = "min(68vh, 620px)";
    transformClass = "translate-y-8 md:translate-y-12";
  }

  return (
    <div
      className={`relative z-20 flex w-full max-w-[360px] md:max-w-[330px] lg:max-w-[390px] xl:max-w-[430px] flex-col shrink-0 surface p-4 md:p-5 rounded-[2.2rem] border shadow-2xl transition-all duration-500 ease-out animate-in fade-in zoom-in-95 ${transformClass}`}
      style={{
        height: dynamicHeight,
        maxHeight: (expandTop || expandBottom) ? '85vh' : (matchedHeight ? `${matchedHeight}px` : undefined),
        boxShadow: '0 24px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)',
        contain: 'layout style',
        transform: 'translateZ(0)',
        willChange: 'transform, height'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sage-400">
            <ListMusic className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">Queue</span>
            <span className="text-[10px] font-semibold text-white/40">({playlist.length})</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setAutoplayEnabled(!autoplayEnabled)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider transition-all duration-200 ${
              autoplayEnabled 
                ? 'bg-sage-400/20 text-sage-300 border border-sage-400/30 shadow-sm' 
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
            title="Autoplay Similar Tracks"
          >
            <Infinity className="h-2.5 w-2.5" />
            <span>AUTOPLAY</span>
          </button>

          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Close Queue"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Top Expand / Collapse Arrow (for Previous Songs) */}
      <div className="flex justify-center pt-1 pb-0.5 shrink-0">
        <button
          onClick={() => setExpandTop(!expandTop)}
          className={`group flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide transition-all duration-300 ${
            expandTop 
              ? 'bg-sage-400/15 text-sage-300 border border-sage-400/30' 
              : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
          }`}
          title={expandTop ? "Collapse Previous Songs" : "Expand Previous Songs"}
        >
          <ChevronUp className={`h-3 w-3 transition-transform duration-300 ${expandTop ? 'rotate-180 text-sage-300' : 'group-hover:-translate-y-0.5'}`} />
          <span>{expandTop ? "Collapse Top" : prevTracks.length > 0 ? `Past Songs (${prevTracks.length})` : "Past Songs"}</span>
        </button>
      </div>

      {/* Main Scrollable Queue List with Top & Bottom Fade Mask */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-1 py-1 space-y-2 select-none scroll-smooth min-h-0"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)'
        }}
      >
        {/* ─── 1. Previously Played Section (2 previous songs by default) ─── */}
        {prevTracks.length > 0 ? (
          <div className="space-y-1">
            <div className="px-1.5 pt-0.5 pb-0.5">
              <span className="text-[8.5px] font-bold tracking-[0.14em] uppercase text-white/35">
                Previously Played {prevTracks.length > 2 && !expandTop && "(Last 2)"}
              </span>
            </div>

            {(expandTop ? prevTracks : prevTracks.slice(-2)).map(({ track, originalIndex }) => (
              <button
                key={`prev-${originalIndex}`}
                onClick={() => {
                  setCurrentTrackIndex(originalIndex);
                  setProgress(0);
                  setIsPlaying(true);
                  setRepeatCount(0);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openTrackMenu(track, e.clientX, e.clientY);
                }}
                className="group flex w-full items-center gap-2.5 p-1.5 rounded-xl transition-all duration-200 text-left bg-white/[0.02] hover:bg-white/[0.07] border border-white/[0.03] hover:border-white/[0.08]"
              >
                <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity">
                  <AlbumArt cover={track.cover} className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-3 w-3 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold text-white/70 group-hover:text-white truncate transition-colors leading-tight">
                    {track.title}
                  </p>
                  <p className="text-[10px] text-white/35 group-hover:text-white/50 truncate transition-colors mt-0.5">
                    {track.artist}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-2 py-1 text-center text-[9px] text-white/20 italic">
            Start of queue
          </div>
        )}

        {/* ─── 2. Now Playing Section (Prominently Highlighted) ─── */}
        {currentTrack && (
          <div ref={nowPlayingItemRef} className="py-0.5">
            <div className="px-1.5 pb-0.5">
              <span className="text-[8.5px] font-extrabold tracking-[0.15em] uppercase text-sage-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-pulse" />
                Now Playing
              </span>
            </div>

            <div 
              className="relative flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(195,208,184,0.18) 0%, rgba(195,208,184,0.06) 100%)',
                borderColor: 'rgba(195,208,184,0.35)',
                boxShadow: '0 8px 24px -4px rgba(195,208,184,0.15)'
              }}
            >
              <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden shadow-md">
                <AlbumArt cover={currentTrack.cover} className="h-full w-full object-cover" />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <div className="flex items-end gap-[2px] h-3">
                      <span className="w-[2.5px] bg-sage-300 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" style={{ height: '70%' }} />
                      <span className="w-[2.5px] bg-sage-300 rounded-full animate-[pulse_0.9s_ease-in-out_infinite]" style={{ height: '100%' }} />
                      <span className="w-[2.5px] bg-sage-300 rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" style={{ height: '50%' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <MarqueeText
                  text={currentTrack.title}
                  className="text-xs font-bold text-white tracking-tight leading-tight"
                />
                <p className="text-[10.5px] font-medium text-sage-300/80 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              <Volume2 className="h-3.5 w-3.5 text-sage-400 shrink-0 mr-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {/* ─── 3. Up Next Section ─── */}
        <div className="space-y-1">
          <div className="px-1.5 pt-0.5 pb-0.5 flex items-center justify-between">
            <span className="text-[8.5px] font-bold tracking-[0.14em] uppercase text-white/35">
              Up Next
            </span>
            <span className="text-[9.5px] text-white/30 font-medium">
              {nextTracks.length} tracks
            </span>
          </div>

          {nextTracks.length > 0 ? (
            nextTracks.map(({ track, originalIndex }, idx) => (
              <button
                key={`next-${originalIndex}`}
                onClick={() => {
                  setCurrentTrackIndex(originalIndex);
                  setProgress(0);
                  setIsPlaying(true);
                  setRepeatCount(0);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openTrackMenu(track, e.clientX, e.clientY);
                }}
                className="group flex w-full items-center gap-2.5 p-1.5 rounded-xl transition-all duration-200 text-left bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.03] hover:border-white/[0.08]"
              >
                <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden">
                  <AlbumArt cover={track.cover} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-3 w-3 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold text-white/90 group-hover:text-white truncate transition-colors leading-tight">
                    {track.title}
                  </p>
                  <p className="text-[10px] text-white/40 group-hover:text-white/60 truncate transition-colors mt-0.5">
                    {track.artist}
                  </p>
                </div>
                <span className="text-[9px] font-bold text-white/20 group-hover:text-white/40 px-1">
                  #{idx + 1}
                </span>
              </button>
            ))
          ) : (
            <div className="py-2 text-center text-[10px] text-white/30 italic">
              End of queue
            </div>
          )}
        </div>
      </div>

      {/* Bottom Expand / Collapse Arrow (for Upcoming Songs) */}
      <div className="flex justify-center pt-1 pb-0.5 shrink-0 border-t border-white/[0.05]">
        <button
          onClick={() => setExpandBottom(!expandBottom)}
          className={`group flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide transition-all duration-300 ${
            expandBottom 
              ? 'bg-sage-400/15 text-sage-300 border border-sage-400/30' 
              : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
          }`}
          title={expandBottom ? "Collapse Upcoming Queue" : "Expand Upcoming Queue"}
        >
          <span>{expandBottom ? "Collapse Bottom" : `More Up Next (${nextTracks.length})`}</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${expandBottom ? 'rotate-180 text-sage-300' : 'group-hover:translate-y-0.5'}`} />
        </button>
      </div>
    </div>
  );
}

export default NowPlayingQueue;
