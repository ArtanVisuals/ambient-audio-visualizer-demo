import { useState, useEffect } from "react";
import { Plus, ListMusic, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { SonoraEmptyState } from "../components/SonoraEmptyState";

export function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [shouldFetchLyrics, setShouldFetchLyrics] = useState(true);
  
  // Tracks selected for lyrics checklist (local to checklist UI)
  const [selectedLyricsTracks, setSelectedLyricsTracks] = useState({});

  const { 
    user, 
    showAlert,
    importStatus,
    startYoutubeImport,
    executeLyricsFetch,
    skipLyricsImport,
    cancelImport
  } = usePlayer();

  const {
    active: importActive,
    step: importStep,
    totalTracks,
    currentTrackIndex,
    playlistName,
    progress,
    estimatedSeconds,
    importedTracks,
    playlistId
  } = importStatus;

  const fetchPlaylists = () => {
    fetch('/api/playlists', {
      headers: { 'x-user-id': user?.uid || '' }
    })
      .then(res => res.json())
      .then(data => setPlaylists(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchPlaylists();
  }, [user, importStep]);

  useEffect(() => {
    if (importStep === "lyrics_checklist" && importedTracks.length > 0 && Object.keys(selectedLyricsTracks).length === 0) {
      const initialSelected = {};
      importedTracks.forEach(t => {
        initialSelected[t.dbTrackId] = true;
      });
      setSelectedLyricsTracks(initialSelected);
    }
  }, [importStep, importedTracks]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    if (!user || user.isAnonymous) {
      showAlert("Please sign in to create playlists!");
      return;
    }

    fetch('/api/playlists', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': user?.uid || ''
      },
      body: JSON.stringify({ name: newPlaylistName })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      return data;
    })
    .then(() => {
      setNewPlaylistName("");
      setIsCreating(false);
      fetchPlaylists();
    })
    .catch(err => {
      console.error(err);
    });
  };

  const handleImport = (e) => {
    e.preventDefault();
    const url = importUrl.trim();
    if (!url) return;

    const isYoutube = url.includes("list=");
    const isSpotify = url.includes("open.spotify.com/playlist/") || url.includes("spotify:playlist:");

    if (!isYoutube && !isSpotify) {
      showAlert("Invalid URL! Please enter a valid public YouTube or Spotify playlist link.");
      return;
    }

    if (!user || user.isAnonymous) {
      showAlert("Please sign in first to import playlists!");
      return;
    }

    startYoutubeImport(url, shouldFetchLyrics);
  };

  const handleFetchLyrics = () => {
    executeLyricsFetch(selectedLyricsTracks);
  };

  const handleSkipLyrics = () => {
    skipLyricsImport();
  };

  const allLyricsChecked = importedTracks.length > 0 && 
                           importedTracks.every(t => selectedLyricsTracks[t.dbTrackId]);

  const handleToggleAllLyrics = () => {
    const nextState = !allLyricsChecked;
    const updated = {};
    importedTracks.forEach(t => {
      updated[t.dbTrackId] = nextState;
    });
    setSelectedLyricsTracks(updated);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-ink-100">Playlists</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              if (!user || user.isAnonymous) {
                showAlert("Please sign in first to import playlists!");
                return;
              }
              setIsImporting(true);
              setIsCreating(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-medium text-ink-100 transition hover:bg-white/[0.12]"
          >
            <ListMusic className="h-4 w-4 text-sage-400" />
            Import Playlist
          </button>
          <button 
            onClick={() => {
              if (!user || user.isAnonymous) {
                showAlert("Please sign in first to create playlists!");
                return;
              }
              setIsCreating(true);
              setIsImporting(false);
            }}
            className="flex items-center gap-2 rounded-full bg-sage-400 px-4 py-2 text-sm font-bold text-ink-950 transition hover:bg-sage-300"
          >
            <Plus className="h-4 w-4" />
            Create New
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <h3 className="mb-4 text-sm font-medium text-ink-300">Create a New Playlist</h3>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Playlist Name" 
              autoFocus
              className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-ink-100 placeholder-ink-500 outline-none focus:border-sage-400"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
            />
            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-ink-500 hover:text-ink-300">Cancel</button>
            <button type="submit" className="rounded-lg bg-sage-400 px-5 py-2 text-sm font-bold text-ink-950 transition hover:bg-sage-300">Create</button>
          </div>
        </form>
      )}

      {(isImporting || importActive) && (
        <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 animate-in fade-in duration-300">
          {importStep === "idle" && (
            <form onSubmit={handleImport}>
              <h3 className="mb-2 text-sm font-medium text-ink-300 font-bold flex items-center gap-2">
                <ListMusic className="h-5 w-5 text-sage-400" />
                Import Playlist from YouTube or Spotify
              </h3>
              <p className="mb-4 text-xs text-ink-500">Paste a public YouTube/YouTube Music playlist link, or a public Spotify playlist link <span className="text-sage-400">(Spotify limited to first 100 songs)</span>.</p>
              <div className="flex gap-4 mb-4">
                <input 
                  type="text" 
                  placeholder="https://music.youtube.com/playlist?list=... or https://open.spotify.com/playlist/..." 
                  autoFocus
                  className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-ink-100 placeholder-ink-500 outline-none focus:border-sage-400"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
                <button type="button" onClick={() => { setIsImporting(false); setImportUrl(""); cancelImport(); }} className="px-4 py-2 text-sm font-medium text-ink-500 hover:text-ink-300">Cancel</button>
                <button type="submit" className="rounded-lg bg-sage-400 px-5 py-2 text-sm font-bold text-ink-950 transition hover:bg-sage-300 flex items-center gap-2">
                  Import
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-400 hover:text-ink-300 select-none">
                <input 
                  type="checkbox" 
                  checked={shouldFetchLyrics} 
                  onChange={(e) => setShouldFetchLyrics(e.target.checked)}
                  className="rounded border-white/[0.2] bg-white/[0.05] text-sage-400 focus:ring-sage-400"
                />
                Add lyrics if possible with the songs
              </label>
            </form>
          )}

          {importStep === "fetching_metadata" && (
            <div className="py-5 text-center flex flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-400 border-t-transparent mb-4" />
              <h4 className="text-sm font-bold text-ink-200">Fetching Playlist Metadata</h4>
              <p className="mt-1 text-xs text-ink-500">Contacting streaming provider to fetch track listings...</p>
            </div>
          )}

          {importStep === "importing_tracks" && (
            <div className="py-4">
              <div className="flex justify-between items-center text-xs text-ink-300 font-bold mb-2">
                <span className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-sage-400 border-t-transparent" />
                  Importing tracks to library...
                </span>
                <span>{currentTrackIndex} / {totalTracks} ({progress}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full bg-sage-400 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {importStep === "lyrics_checklist" && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-ink-300">Fetched Lyrics Options</h3>
              <p className="mb-4 text-xs text-ink-500">Select the tracks you would like to fetch synced/plain lyrics for from the database:</p>
              
              <div className="mb-4 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={handleToggleAllLyrics}
                  className="text-xs font-bold text-sage-400 hover:text-sage-300 flex items-center gap-2"
                >
                  <input 
                    type="checkbox" 
                    checked={allLyricsChecked} 
                    onChange={handleToggleAllLyrics}
                    className="rounded border-white/[0.2] bg-white/[0.05] text-sage-400 focus:ring-sage-400 pointer-events-none"
                  />
                  {allLyricsChecked ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs text-ink-500">
                  {Object.keys(selectedLyricsTracks).filter(id => selectedLyricsTracks[id]).length} of {importedTracks.length} selected
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 mb-6 space-y-2">
                {importedTracks.map(t => (
                  <label key={t.dbTrackId} className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-white/[0.05] transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!selectedLyricsTracks[t.dbTrackId]} 
                      onChange={(e) => {
                        setSelectedLyricsTracks(prev => ({
                          ...prev,
                          [t.dbTrackId]: e.target.checked
                        }));
                      }}
                      className="rounded border-white/[0.2] bg-white/[0.05] text-sage-400 focus:ring-sage-400"
                    />
                    <img src={t.cover || "/covers/default.png"} className="h-10 w-10 rounded object-cover bg-white/[0.05]" alt="" />
                    <div className="text-left">
                      <p className="font-medium text-xs text-ink-100 line-clamp-1">{t.title}</p>
                      <p className="text-ink-500 text-[11px] line-clamp-1">{t.artist}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={handleSkipLyrics} 
                  className="rounded-lg border border-white/[0.1] px-5 py-2 text-xs font-bold text-ink-300 transition hover:bg-white/[0.05]"
                >
                  Skip & Finish
                </button>
                <button 
                  onClick={handleFetchLyrics} 
                  className="rounded-lg bg-sage-400 px-5 py-2 text-xs font-bold text-ink-950 transition hover:bg-sage-300"
                >
                  Fetch Lyrics for Selected
                </button>
              </div>
            </div>
          )}

          {importStep === "fetching_lyrics" && (
            <div className="py-4">
              <div className="flex justify-between items-center text-xs text-ink-300 font-bold mb-2">
                <span className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-sage-400 border-t-transparent" />
                  Fetching lyrics...
                </span>
                <span>{currentTrackIndex} / {totalTracks} ({progress}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden mb-2">
                <div className="h-full bg-sage-400 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-ink-500">
                <span>Contacting databases (Musixmatch/LrcLib)...</span>
                <span className="font-mono">Estimated time remaining: ~{estimatedSeconds}s</span>
              </div>
            </div>
          )}

          {importStep === "completed" && (
            <div className="py-5 text-center flex flex-col items-center justify-center">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-sage-400/20 text-sage-400 mb-4 animate-bounce">
                ✓
              </div>
              <h4 className="text-sm font-bold text-ink-200">Import Complete</h4>
              <p className="mt-1 text-xs text-ink-500">All songs and selected lyrics have been successfully added.</p>
            </div>
          )}
        </div>
      )}

      {playlists.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <Link to={`/playlists/${p.id}`} key={p.id} className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
              <div className="brutalist-card-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-ink-500 group-hover:bg-sage-400/20 group-hover:text-sage-400 transition-colors overflow-hidden">
                {p.cover ? (
                  <img src={p.cover} alt={p.name} className="h-full w-full object-cover rounded-lg animate-in fade-in duration-350" />
                ) : (
                  <ListMusic className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-ink-100">{p.name}</h3>
                <p className="mt-1 text-xs text-ink-500">{p.trackCount} track{p.trackCount !== 1 ? 's' : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <SonoraEmptyState 
          title="No custom playlists yet" 
          description="Create your first playlist to start organizing your music." 
          screenText="NO PLAYLIST"
          defaultView={
            <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-20 text-center animate-in fade-in duration-500">
              <p className="text-lg font-medium text-ink-300">No custom playlists yet</p>
              <p className="mt-2 text-sm text-ink-500">Create your first playlist to start organizing your music.</p>
            </div>
          }
        />
      )}
    </div>
  );
}
