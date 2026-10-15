import { useState, useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { Heart, MoreHorizontal, Shuffle, Radio, PlayCircle, ListPlus, Share2, Play } from "lucide-react";
import { SonoraLoader } from "../components/SonoraLoader";
import { SonoraEmptyState } from "../components/SonoraEmptyState";
import { copyToClipboard } from "../utils/clipboard";

const explicitKeywords = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'motherfucker', 'dick', 'pussy', 'bastard', 'cock', 'slut', 'whore',
  'nigga', 'nigger', 'faggot'
];

const checkIsExplicit = (track) => {
  if (track && track.lyrics && typeof track.lyrics === 'string') {
    const lyricsLower = track.lyrics.toLowerCase();
    return explicitKeywords.some(word => lyricsLower.includes(word));
  }
  return false;
};

export function LikedSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const { playContext, shufflePlay, playNextMultiple, addMultipleToQueue, openTrackMenu, user, morphism, showAlert } = usePlayer();
  const pressTimer = useRef(null);

  const handleAction = (action) => {
    setIsPlaylistMenuOpen(false);
    if (songs.length === 0 && action !== 'share') return;
    
    switch (action) {
      case 'shuffle':
      case 'mix':
        shufflePlay(songs);
        break;
      case 'playNext':
        playNextMultiple(songs);
        break;
      case 'queue':
        addMultipleToQueue(songs);
        break;
      case 'share':
        copyToClipboard(window.location.href);
        showAlert('Playlist link copied to clipboard!');
        break;
      default:
        break;
    }
  };

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

  useEffect(() => {
    fetch('/api/tracks/liked', {
      headers: { 'x-user-id': user?.uid || '' }
    })
      .then(res => res.json())
      .then(data => {
        setSongs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(console.error);
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><SonoraLoader size="md" label="Loading your favorites…" /></div>;



  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-10 flex items-end justify-between border-b border-white/[0.05] pb-8">
        <div className="flex items-end gap-6">
          {morphism === "neobrutalism" ? (
            <div className="brutalist-button button-1 fireant-liked-songs select-none">
              <div className="openai-logo">
                <Heart className="openai-icon fill-black text-black" />
              </div>
              <div className="button-text text-black">
                <span>Favorite</span>
                <span>Songs</span>
              </div>
            </div>
          ) : (
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-400 to-sage-600 shadow-2xl">
              <Heart className="h-12 w-12 fill-ink-950 text-ink-950" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-widest text-ink-500">Playlist</p>
            <h1 className="mt-2 truncate text-4xl font-bold text-ink-100 md:text-5xl lg:text-6xl">Liked Songs</h1>
            <p className="mt-4 text-sm font-medium text-ink-300">{songs.length} songs</p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
            className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-ink-500 transition-colors hover:bg-white/[0.1] hover:text-ink-100"
            title="More Options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          
          {isPlaylistMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-white/[0.1] bg-ink-950 p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <button onClick={() => handleAction('shuffle')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
                <Shuffle className="h-4 w-4" /> Shuffle Play
              </button>
              <button onClick={() => handleAction('mix')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
                <Radio className="h-4 w-4" /> Start Mix
              </button>
              <button onClick={() => handleAction('playNext')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
                <PlayCircle className="h-4 w-4" /> Play Next
              </button>
              <button onClick={() => handleAction('queue')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
                <ListPlus className="h-4 w-4" /> Add to Queue
              </button>
              
              <div className="my-1.5 h-px w-full bg-white/[0.05]" />
              
              <button onClick={() => handleAction('share')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
                <Share2 className="h-4 w-4" /> Share Playlist
              </button>
            </div>
          )}
        </div>
      </div>

      {songs.length > 0 ? (
        <div className="space-y-2">
          {songs.map((track, idx) => (
            <div 
              key={track.id} 
              onClick={() => playContext(songs, idx)}
              onContextMenu={(e) => { e.preventDefault(); openTrackMenu(track, e.clientX, e.clientY); }}
              onMouseDown={(e) => handlePressStart(e, track)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={(e) => handlePressStart(e, track)}
              onTouchEnd={handlePressEnd}
              onTouchMove={handlePressEnd}
              className="group relative flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 hover:bg-white/[0.04]"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <img src={track.cover} alt={track.title} className="absolute inset-0 h-full w-full rounded-md object-cover group-hover:opacity-30 transition-opacity" />
                <span className="relative z-10 text-xs font-bold text-white shadow-black drop-shadow-md group-hover:hidden">{idx + 1}</span>
                <Play className="relative z-10 hidden h-4 w-4 text-white group-hover:block drop-shadow-md" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-ink-100">{track.title}</p>
                  {checkIsExplicit(track) && (
                    <span className="rounded bg-red-500/10 border border-red-500/20 px-1 py-0.2 text-[8px] font-black text-red-400 tracking-wide shrink-0">E</span>
                  )}
                </div>
                <p className="truncate text-xs text-ink-500">{track.artist}</p>
              </div>
              <span className="text-sm text-ink-500">{track.duration}</span>
              
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  openTrackMenu(track, e.clientX, e.clientY);
                }}
                className="ml-2 flex items-center justify-center text-ink-500 transition-colors hover:text-ink-100"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <SonoraEmptyState 
          title="You haven't liked any songs yet." 
          description="Tap the heart icon on any track to save it here." 
          screenText="EMPTY"
        />
      )}
    </div>
  );
}
