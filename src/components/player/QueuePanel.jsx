import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ListMusic, Volume2, Infinity } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { AlbumArt } from "../AlbumArt";
import { MarqueeText } from "../MarqueeText";

export function QueuePanel({ 
  isOpen, 
  onClose, 
  queueAnchorPos, 
  morphism, 
  isExpanded, 
  setProgress, 
  setRepeatCount 
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

  const queueScrollContainerRef = useRef(null);
  const nowPlayingRef = useRef(null);

  // Scroll active track to center on open or track change
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (queueScrollContainerRef.current && nowPlayingRef.current) {
        const container = queueScrollContainerRef.current;
        const element = nowPlayingRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top;

        container.scrollTop = container.scrollTop + relativeTop - (containerRect.height / 2) + (elementRect.height / 2);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, currentTrackIndex]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Invisible full-screen dismiss layer — no background, no z-fighting */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />
      {/* Queue panel — pops up above whichever button triggered it */}
      <div
        className="queue-panel surface border"
        style={{
          position: 'fixed',
          right: queueAnchorPos
            ? `${Math.max(8, Math.min(queueAnchorPos.right, window.innerWidth - 316))}px`
            : '24px',
          bottom: queueAnchorPos ? `${queueAnchorPos.bottom}px` : '88px',
          zIndex: 9999,
          width: '300px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: queueAnchorPos
            ? `${Math.min(queueAnchorPos.availableHeight, window.innerHeight * 0.80)}px`
            : '65vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          border: morphism === 'glassmorphism' ? '1px solid rgba(255,255,255,0.10)' : undefined,
          background: morphism === 'glassmorphism' ? (isExpanded ? 'var(--theme-bg)' : 'var(--theme-surface)') : undefined,
          backdropFilter: morphism === 'glassmorphism' ? (isExpanded ? 'none' : 'blur(24px)') : undefined,
          WebkitBackdropFilter: morphism === 'glassmorphism' ? (isExpanded ? 'none' : 'blur(24px)') : undefined,
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
          animation: 'queueSlideUp 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 10px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Queue</h3>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>({playlist.length})</span>
          </div>
          <button
            onClick={() => setAutoplayEnabled(!autoplayEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              color: autoplayEnabled ? 'var(--theme-sage, #c3d0b8)' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.2s',
              backgroundColor: autoplayEnabled ? 'rgba(195,208,184,0.1)' : 'transparent',
            }}
            title="Autoplay Similar Tracks"
          >
            <Infinity size={12} />
            <span>AUTOPLAY</span>
          </button>
        </div>

        {/* Scrollable list */}
        <div ref={queueScrollContainerRef} style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none', paddingBottom: '8px' }}>

          {/* Previously played */}
          {currentTrackIndex > 0 && (
            <div style={{ padding: '0 8px 4px', opacity: 0.45 }}>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '4px 8px 8px', margin: 0 }}>Previously played</p>
              {playlist.slice(0, currentTrackIndex).map((track, i) => (
                <button
                  key={`prev-${i}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTrackIndex(i);
                    setProgress(0);
                    setIsPlaying(true);
                    onClose();
                    setRepeatCount(0);
                  }}
                  onContextMenu={(e) => { e.preventDefault(); openTrackMenu(track, e.clientX, e.clientY); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '8px', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = morphism === 'glassmorphism' ? 'rgba(255,255,255,0.06)' : 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <AlbumArt cover={track.cover} className="h-10 w-10 shrink-0 rounded-lg grayscale" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Now playing */}
          <div ref={nowPlayingRef} style={{ padding: '0 8px 4px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(195,208,184)', padding: '4px 8px 8px', margin: 0 }}>Now Playing</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '12px', border: '1px solid var(--theme-accent-glow)', background: 'var(--theme-accent-glow)' }}>
              <AlbumArt cover={currentTrack.cover} className="h-10 w-10 shrink-0 rounded-lg" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <MarqueeText
                  text={currentTrack.title}
                  style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(195,208,184)', margin: 0 }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist}</p>
              </div>
              <Volume2 style={{ width: '16px', height: '16px', color: 'rgb(195,208,184)', flexShrink: 0, marginRight: '4px' }} strokeWidth={2.5} />
            </div>
          </div>

          {/* Up next */}
          {playlist.slice(currentTrackIndex + 1).length > 0 ? (
            <div style={{ padding: '4px 8px 4px' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', padding: '8px 8px 6px', margin: 0 }}>Up Next</p>
              {playlist.slice(currentTrackIndex + 1).map((track, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTrackIndex(currentTrackIndex + 1 + i);
                    setProgress(0);
                    setIsPlaying(true);
                    onClose();
                    setRepeatCount(0);
                  }}
                  onContextMenu={(e) => { e.preventDefault(); openTrackMenu(track, e.clientX, e.clientY); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '8px', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = morphism === 'glassmorphism' ? 'rgba(255,255,255,0.06)' : 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <AlbumArt cover={track.cover} className="h-10 w-10 shrink-0 rounded-lg" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8e8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>End of queue</div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
