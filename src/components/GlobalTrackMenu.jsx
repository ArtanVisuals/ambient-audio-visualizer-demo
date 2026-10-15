import { useEffect, useState } from 'react';
import { PlayCircle, ListPlus, BookmarkPlus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export function GlobalTrackMenu() {
  const { trackMenu, closeTrackMenu, playNext, addToQueue, user, showAlert } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylists, setShowPlaylists] = useState(false);

  useEffect(() => {
    if (trackMenu) {
      setShowPlaylists(false);
    }
  }, [trackMenu]);

  useEffect(() => {
    if (showPlaylists) {
      if (!user || user.isAnonymous) {
        showAlert("Please sign in first to manage playlists!");
        setShowPlaylists(false);
        closeTrackMenu();
        return;
      }
      fetch('/api/playlists', {
        headers: { 'x-user-id': user.uid }
      })
        .then(res => res.json())
        .then(data => setPlaylists(data))
        .catch(console.error);
    }
  }, [showPlaylists, user]);

  if (!trackMenu) return null;

  const { track, x, y } = trackMenu;

  const handlePlayNext = (e) => {
    e.stopPropagation();
    playNext(track);
    closeTrackMenu();
  };

  const handleAddQueue = (e) => {
    e.stopPropagation();
    addToQueue(track);
    closeTrackMenu();
  };

  const handleAddPlaylist = async (playlistId, e) => {
    e.stopPropagation();
    try {
      let localId = track.id;

      if (track.source === 'global' || track.source === 'youtube') {
        const syncRes = await fetch('/api/tracks/sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || ''
          },
          body: JSON.stringify(track)
        });
        const syncData = await syncRes.json();
        localId = syncData.id;
      }

      // 2. Add the now-local track ID to the playlist
      await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: localId })
      });
      
      closeTrackMenu();
    } catch (err) {
      console.error("Sync/Playlist Error:", err);
    }
  };

  // Adjust position so menu doesn't go off-screen
  const menuWidth = 224; // w-56
  const menuHeight = 160; 
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  let finalX = x;
  let finalY = y;

  if (x + menuWidth > screenWidth) finalX = screenWidth - menuWidth - 16;
  if (y + menuHeight > screenHeight) finalY = screenHeight - menuHeight - 16;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100]" 
        onPointerDown={(e) => { e.stopPropagation(); closeTrackMenu(); }} 
        onContextMenu={(e) => { e.preventDefault(); closeTrackMenu(); }} 
      />
      <div 
        className="fixed z-[101] w-56 rounded-xl border border-white/[0.12] bg-ink-900 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ 
          left: Math.max(16, finalX), 
          top: Math.max(16, finalY),
          '--text-primary': '#ffffff',
          '--text-secondary': 'rgba(255, 255, 255, 0.6)'
        }}
      >
        <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-ink-500 line-clamp-1 border-b border-white/[0.05] mb-1">
          {track.title}
        </div>
        
        {!showPlaylists ? (
          <>
            <button onClick={handlePlayNext} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
              <PlayCircle className="h-4 w-4" /> Play Next
            </button>
            <button onClick={handleAddQueue} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
              <ListPlus className="h-4 w-4" /> Add to Queue
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowPlaylists(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]">
              <BookmarkPlus className="h-4 w-4" /> Add to Playlist
            </button>
          </>
        ) : (
          <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={(e) => { e.stopPropagation(); setShowPlaylists(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink-400 transition-colors hover:bg-white/[0.08]">
              ← Back
            </button>
            <div className="my-1 h-px w-full bg-white/[0.05]" />
            {playlists.map(p => (
              <button 
                key={p.id}
                onClick={(e) => handleAddPlaylist(p.id, e)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-100 transition-colors hover:bg-white/[0.08]"
              >
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {playlists.length === 0 && <div className="p-3 text-xs text-ink-500">No playlists found</div>}
          </div>
        )}
      </div>
    </>
  );
}
