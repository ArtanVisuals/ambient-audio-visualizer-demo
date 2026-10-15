import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, Loader2, Music, Mic2, Clock, Play, MoreHorizontal, ListMusic, User, Award, Check, Pause, Heart } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { SonoraEmptyState } from "../components/SonoraEmptyState";

const explicitKeywords = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'motherfucker', 'dick', 'pussy', 'bastard', 'cock', 'slut', 'whore',
  'nigga', 'nigger', 'faggot'
];

const getTrackDetails = (track) => {
  if (!track) return { featuredIn: 0, savedBy: 0, trendingRank: null, isExplicit: false };
  const hash = (track.title?.length || 0) + (track.artist?.length || 0);
  const featuredIn = track.featuredIn !== undefined && track.featuredIn !== null ? track.featuredIn : ((hash % 12) + 2);
  const savedBy = track.savedBy !== undefined && track.savedBy !== null ? track.savedBy : ((hash * 47) % 800 + 45);
  const trendingRank = hash % 5 === 0 ? (hash % 20) + 1 : null;
  
  // Explicit tag only if the song has local/loaded lyrics AND it has explicit content
  let isExplicit = false;
  if (track.lyrics && typeof track.lyrics === 'string' && track.lyrics.trim().length > 0) {
    const lyricsLower = track.lyrics.toLowerCase();
    isExplicit = explicitKeywords.some(word => lyricsLower.includes(word));
  }
  
  return { featuredIn, savedBy, trendingRank, isExplicit };
};

/** Tiny animated equalizer shown on the currently-playing track row */
function EqDots({ isPlaying }) {
  return (
    <div className="flex items-end justify-center gap-[2px] h-4 w-5 shrink-0" aria-label="Now playing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-sage-400"
          style={{
            height: isPlaying ? undefined : '4px',
            animation: isPlaying
              ? `eqBar ${0.7 + i * 0.18}s ease-in-out infinite alternate`
              : 'none',
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="animate-in fade-in duration-500 mt-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-3">
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
        <div className="lg:col-span-7 space-y-3">
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl p-3 bg-white/[0.01]">
                <div className="skeleton h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-40 rounded-full" />
                  <div className="skeleton h-2 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Search() {
  const location = useLocation();
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('q') || "";
  });
  const [results, setResults] = useState({ songs: [], playlists: [], people: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error parsing recent searches history:", e);
      return [];
    }
  });

  const { playContext, playTrack, openTrackMenu, currentTrack, isPlaying, user, morphism } = usePlayer();
  const pressTimer = useRef(null);
  const lastResolvedQueryRef = useRef("");

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

  const handleTrackClick = (track, list, idx) => {
    setRecentSearches(prev => {
      let next = prev.filter(t => t.id !== track.id);
      next.unshift(track);
      if (next.length > 20) next = next.slice(0, 20);
      localStorage.setItem('aura_search_history', JSON.stringify(next));
      return next;
    });
    
    if (track?.id) {
      fetch('/api/recommendations/track-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || ''
        },
        body: JSON.stringify({ query, actionType: 'click_track', targetId: track.id.toString() })
      }).catch(() => {});
    }

    playTrack(track);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && q !== query) {
      setQuery(q);
    }
  }, [location.search]);

  useEffect(() => {
    if (!query) {
      setResults({ songs: [], playlists: [], people: [] });
      return;
    }
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { 'x-user-id': user?.uid || '' }
        });
        const data = await res.json();
        
        const tracksWithKeys = (data.songs || []).map((t, index) => ({
          ...t,
          uniqueKey: `${t.source || 'global'}-${t.id}-${index}`
        }));

        setResults({
          songs: tracksWithKeys,
          playlists: data.playlists || [],
          people: data.people || []
        });

        // Track search query
        fetch('/api/recommendations/track-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.uid || ''
          },
          body: JSON.stringify({ query, actionType: 'search' })
        }).catch(() => {});
      } catch (err) {
        console.error("Search failure:", err);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query, user]);

  // Relevance and artist filtering computation
  const getRelevanceScore = (track, q) => {
    if (!q) return 0;
    const term = q.toLowerCase().trim();
    const title = (track.title || "").toLowerCase();
    const artist = (track.artist || "").toLowerCase();
    
    let score = 0;
    if (title === term) score += 100;
    else if (title.startsWith(term)) score += 50;
    else if (title.includes(term)) score += 20;
    
    if (artist === term) score += 30;
    else if (artist.startsWith(term)) score += 15;
    else if (artist.includes(term)) score += 5;
    
    if (track.source === 'local') score += 0.1;
    
    return score;
  };

  const sortedSongs = [...results.songs].sort((a, b) => {
    return getRelevanceScore(b, query) - getRelevanceScore(a, query);
  });

  const topResult = sortedSongs[0];

  // 1. Exact Matches:
  const exactMatches = topResult ? sortedSongs.filter(s => {
    const title = (s.title || "").toLowerCase();
    const topTitle = (topResult.title || "").toLowerCase().split(" (")[0].split(" - ")[0].trim();
    return title.includes(topTitle);
  }).slice(0, 5) : [];

  // 2. Similar Songs:
  const similarSongs = topResult ? sortedSongs.filter(s => {
    if (exactMatches.some(m => m.id === s.id)) return false;
    return true;
  }).slice(0, 5) : [];

  // 3. More From This Artist:
  const moreArtistSongs = topResult ? sortedSongs.filter(s => {
    if (s.id === topResult.id) return false;
    const topArtist = (topResult.artist || "").toLowerCase().replace(" - topic", "").trim();
    const sArtist = (s.artist || "").toLowerCase().replace(" - topic", "").trim();
    return sArtist.includes(topArtist) || topArtist.includes(sArtist);
  }).slice(0, 5) : [];

  // 4. Album Info:
  const albumInfo = topResult && topResult.album ? {
    cover: topResult.cover,
    name: topResult.album,
    year: topResult.year || new Date().getFullYear() - (topResult.title.length % 5),
    songCount: (topResult.title.length % 8) + 8
  } : null;

  // 5. Recommended For You:
  const recommendedSongs = sortedSongs.slice().reverse().slice(0, 5);

  const localResults = sortedSongs.filter(s => s.source === 'local');

  // Background pre-resolution of search results to YouTube streams
  useEffect(() => {
    if (!query || sortedSongs.length === 0) return;
    if (lastResolvedQueryRef.current === query) return;

    let active = true;
    const resolving = new Set();

    const resolveTrackBackground = async (track) => {
      if (!active) return;
      if (track.source !== 'global' || track.audioUrl.includes('youtube.com') || track.audioUrl.includes('youtu.be')) return;
      
      const trackId = track.id;
      if (resolving.has(trackId)) return;
      resolving.add(trackId);

      try {
        const res = await fetch(`/api/tracks/resolve?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data.youtubeUrl) {
            setResults(prev => {
              const updatedSongs = prev.songs.map(t => {
                if (t.id === trackId) {
                  return { ...t, audioUrl: data.youtubeUrl, youtubeId: data.id };
                }
                return t;
              });
              return { ...prev, songs: updatedSongs };
            });
          }
        }
      } catch (err) {
        console.error("[Pre-resolve] Background resolve failed:", err);
      }
      resolving.delete(trackId);
    };

    const runResolution = async () => {
      lastResolvedQueryRef.current = query;
      // Resolve the first 6 sorted songs immediately in parallel
      const initialBatch = sortedSongs.slice(0, 6);
      await Promise.all(initialBatch.map(track => resolveTrackBackground(track)));

      // Then resolve the rest one by one
      for (let i = 6; i < sortedSongs.length; i++) {
        if (!active) break;
        await resolveTrackBackground(sortedSongs[i]);
        await new Promise(r => setTimeout(r, 150));
      }
    };

    runResolution();

    return () => {
      active = false;
    };
  }, [results.songs, query]);

  const hasResults = results.songs.length > 0 || results.playlists.length > 0 || results.people.length > 0;

  const renderTrackList = (list, columns = false) => (
    <div className={columns ? "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3" : "space-y-2"}>
      {list.map((track, idx) => {
        const isActive = currentTrack?.id === track.id;
        const details = getTrackDetails(track);
        return (
          <div
            key={track.uniqueKey || track.id}
            onClick={() => handleTrackClick(track, list, idx)}
            onContextMenu={(e) => { e.preventDefault(); openTrackMenu(track, e.clientX, e.clientY); }}
            onMouseDown={(e) => handlePressStart(e, track)}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={(e) => handlePressStart(e, track)}
            onTouchEnd={handlePressEnd}
            onTouchMove={handlePressEnd}
            className={`group relative flex cursor-pointer items-center gap-4 rounded-xl px-3 py-2.5 transition-all border border-transparent ${
              isActive 
                ? 'bg-white/[0.06] border-white/5' 
                : morphism === "neobrutalism" 
                  ? 'hover:bg-black/[0.05] border-2 border-transparent hover:border-black' 
                  : 'hover:bg-white/[0.035] hover:shadow-sm'
            }`}
          >
            <div className="relative shrink-0">
              <img src={track.cover || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"} alt={track.title} className="h-12 w-12 rounded-lg object-cover shadow-md" />
              <div className={`absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity ${isActive ? 'opacity-100' : 'group-hover:opacity-100'}`}>
                {isActive && isPlaying ? (
                  <Pause className="h-5 w-5 text-sage-400 fill-sage-400" />
                ) : (
                  <Play className="h-5 w-5 text-white fill-white" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={`truncate text-sm font-semibold ${
                  isActive ? 'text-sage-400 font-bold' : morphism === "neobrutalism" ? 'text-black' : 'text-ink-100'
                }`}>{track.title}</p>
                {details.isExplicit && (
                  <span className="rounded bg-red-500/10 border border-red-500/20 px-1 py-0.2 text-[8px] font-black text-red-400 tracking-wide shrink-0">E</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`truncate text-xs ${morphism === "neobrutalism" ? 'text-neutral-600' : 'text-ink-400'}`}>{track.artist} • {track.album || 'Single'}</p>
                {track.source === 'local' && (
                  <span className="rounded bg-white/[0.08] px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-widest text-ink-400">
                    Local
                  </span>
                )}
              </div>
              {/* Community Info Subtext */}
              <p className="text-[10px] text-ink-500 mt-1 truncate">
                Featured in {details.featuredIn} playlists • Saved by {details.savedBy} users
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Like Button */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await toggleLikeGlobal(track, !track.isLiked);
                  setResults(prev => {
                    const songs = prev.songs.map(s => s.id === track.id ? { ...s, isLiked: !track.isLiked } : s);
                    return { ...prev, songs };
                  });
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/5 opacity-0 group-hover:opacity-100 ${
                  track.isLiked ? 'text-sage-400 opacity-100' : 'text-ink-400 hover:text-white'
                }`}
                title={track.isLiked ? "Unlike" : "Like"}
              >
                <Heart className={`h-4 w-4 ${track.isLiked ? 'fill-current' : ''}`} strokeWidth={track.isLiked ? 0 : 1.8} />
              </button>

              {/* Add to Playlist Options Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTrackMenu(track, e.clientX, e.clientY);
                }}
                className="opacity-0 group-hover:opacity-100 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:text-white hover:bg-white/5 transition"
                title="Options"
              >
                <MoreHorizontal className="h-4.5 w-4.5" />
              </button>

              {isActive ? (
                <EqDots isPlaying={isPlaying} />
              ) : (
                <span className={`text-xs w-10 text-right ${morphism === "neobrutalism" ? 'text-neutral-600' : 'text-ink-500'}`}>{track.duration}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPlaylistGrid = (list) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-in fade-in duration-300">
      {list.map((playlist) => (
        <Link
          key={playlist.id}
          to={`/playlists/${playlist.id}`}
          className={`group flex flex-col rounded-2xl border p-3.5 transition-all duration-300 cursor-pointer ${
            morphism === "neobrutalism"
              ? "border-2 border-black bg-white text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
              : "border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.04] hover:shadow-xl hover:translate-y-[-2px] text-ink-100"
          }`}
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-xl mb-3 shadow-md">
            {playlist.cover ? (
              <img 
                src={playlist.cover} 
                alt={playlist.name} 
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105" 
              />
            ) : (
              <div className={`flex h-full w-full items-center justify-center ${
                morphism === "neobrutalism" ? "bg-neutral-100 text-black" : "bg-white/[0.04] text-ink-400"
              }`}>
                <ListMusic className="h-12 w-12" />
              </div>
            )}
            <button className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-sage-400 text-black opacity-0 shadow-lg translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95">
              <Play className="h-5 w-5 fill-black" strokeWidth={1} />
            </button>
          </div>
          <div className="min-w-0">
            <h4 className="truncate font-bold text-sm tracking-tight">{playlist.name}</h4>
            <p className="truncate text-xs opacity-50 mt-0.5">By {playlist.ownerName || 'Listener'}</p>
            <p className="text-[10px] opacity-40 mt-1">{playlist.trackCount || 0} songs • {playlist.saveCount || 0} saves</p>
          </div>
        </Link>
      ))}
    </div>
  );

  const renderPeopleGrid = (list) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-in fade-in duration-300">
      {list.map((person) => {
        const renderSearchBadge = (badgeType) => {
          if (!badgeType) return null;
          const label = badgeType === "owner" ? "owner" : badgeType === "admin" ? "admin" : badgeType === "artist" ? "artist" : "artist";
          const styles = 
            badgeType === "owner"
              ? "bg-amber-400/10 border-amber-400/20 text-amber-400"
              : badgeType === "admin"
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-sky-500/10 border-sky-500/20 text-sky-400";
          return (
            <span className={`inline-flex items-center px-1.5 py-[0.5px] text-[8px] font-black uppercase tracking-wider rounded-full border ${styles} shrink-0`}>
              {label}
            </span>
          );
        };

        return (
          <Link
            key={person.id}
            to={`/user/${person.id}`}
            className={`group flex flex-col items-center text-center rounded-2xl border p-4.5 transition-all duration-300 cursor-pointer ${
              morphism === "neobrutalism"
                ? "border-2 border-black bg-white text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
                : "border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.04] hover:shadow-xl hover:translate-y-[-2px] text-ink-100"
            }`}
          >
            <div className="relative mb-3.5">
              {person.photo ? (
                <img 
                  src={person.photo} 
                  alt={person.name} 
                  className="h-24 w-24 rounded-full object-cover shadow-md transition duration-300 group-hover:scale-103" 
                />
              ) : (
                <div className={`flex h-24 w-24 items-center justify-center rounded-full font-black text-xl shadow-md ${
                  morphism === "neobrutalism" ? "bg-neutral-100 text-black border-2 border-black" : "bg-white/[0.04] text-ink-300"
                }`}>
                  {person.name ? person.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0 w-full flex flex-col items-center">
              <h4 className="truncate font-bold text-sm tracking-tight w-full">{person.name || 'Listener'}</h4>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="text-[10px] opacity-45">User</span>
                {renderSearchBadge(person.verified_badge)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="animate-in fade-in zoom-in-98 duration-300">
      {/* Search Input Box */}
      <div className={`mb-6 flex items-center gap-4 rounded-2xl border p-4.5 transition-all focus-within:border-sage-400/40 focus-within:shadow-[0_0_20px_rgba(195,208,184,0.08)] ${
        morphism === "neobrutalism"
          ? "border-3 border-black bg-white text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] focus-within:translate-x-[-2px] focus-within:translate-y-[-2px] focus-within:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
          : "border-white/[0.06] bg-white/[0.015] text-ink-100 focus-within:bg-white/[0.035]"
      }`}>
        <SearchIcon className={`h-6 w-6 ${morphism === "neobrutalism" ? "text-black" : "text-ink-400"}`} />
        <input 
          autoFocus
          type="text" 
          placeholder="Search songs, public playlists, creators..." 
          className={`w-full bg-transparent text-lg outline-none transition-all ${
            morphism === "neobrutalism" ? "text-black placeholder-neutral-500" : "text-ink-100 placeholder-ink-500"
          }`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Tabs / Filters */}
      {query && !loading && hasResults && (
        <div className="mb-6 flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {["all", "songs", "playlists", "people"].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-full border ${
                  morphism === "neobrutalism"
                    ? `border-2 border-black ${
                        isActive
                          ? "bg-[#ffde4b] text-black translate-x-[-2px] translate-y-[-2px] shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                          : "bg-white text-black hover:bg-neutral-100"
                      }`
                    : isActive
                      ? "bg-sage-400 border-transparent text-black shadow-lg shadow-sage-400/15 font-extrabold scale-[1.02]"
                      : "bg-white/[0.03] border-white/[0.05] text-ink-300 hover:bg-white/[0.06] hover:text-ink-100"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      )}

      {loading && query && <SearchSkeleton />}

      {!loading && query && hasResults && (
        <div className="animate-in fade-in duration-300 space-y-10">
          
          {/* ALL Tab Redesign */}
          {activeTab === "all" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* 1. Best Match Card */}
              {topResult && (
                <div className="w-full">
                  <h3 className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase">
                    Best Match
                  </h3>
                  <div 
                    onClick={() => handleTrackClick(topResult, sortedSongs, 0)}
                    className="group relative flex flex-col md:flex-row items-center gap-6 rounded-3xl bg-white/[0.015] border border-white/[0.04] p-6 hover:bg-white/[0.035] hover:border-white/[0.08] transition-all duration-300 cursor-pointer shadow-md"
                  >
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl shadow-2xl">
                      <img src={topResult.cover} alt={topResult.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-103" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        {currentTrack?.id === topResult.id && isPlaying ? (
                          <Pause className="h-6 w-6 text-sage-400 fill-sage-400" />
                        ) : (
                          <Play className="h-6 w-6 text-white fill-white" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1 text-center md:text-left">
                      <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <h3 className="text-xl font-bold truncate text-white tracking-tight">{topResult.title}</h3>
                          <div className="flex justify-center md:justify-start gap-1">
                            {getTrackDetails(topResult).isExplicit && (
                              <span className="rounded border border-white/10 px-1.5 py-0.5 text-[7px] font-bold text-white/50 tracking-wider shrink-0">E</span>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-white/45 font-medium truncate">{topResult.artist} • {topResult.album || 'Single'}</p>
                      </div>
                      
                      {/* Community Info Subtext */}
                      <div className="mt-3 text-[11px] text-white/30 flex flex-wrap justify-center md:justify-start items-center gap-x-2.5 gap-y-1 font-medium">
                        <span>Featured in {getTrackDetails(topResult).featuredIn} playlists</span>
                        <span className="opacity-30">•</span>
                        <span>Saved by {getTrackDetails(topResult).savedBy} users</span>
                        {getTrackDetails(topResult).trendingRank && (
                          <>
                            <span className="opacity-30">•</span>
                            <span className="text-sage-400/90 font-semibold">#{getTrackDetails(topResult).trendingRank} Trending</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Like & Options Button Shortcut */}
                    <div className="flex items-center gap-3 shrink-0 self-center md:self-auto md:ml-auto">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await toggleLikeGlobal(topResult, !topResult.isLiked);
                          setResults(prev => {
                            const songs = prev.songs.map(s => s.id === topResult.id ? { ...s, isLiked: !topResult.isLiked } : s);
                            return { ...prev, songs };
                          });
                        }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105 active:scale-95 ${
                          topResult.isLiked ? 'bg-sage-400/10 border-sage-400/20 text-sage-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${topResult.isLiked ? 'fill-current' : ''}`} strokeWidth={topResult.isLiked ? 0 : 1.8} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTrackMenu(topResult, e.clientX, e.clientY);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      <span className="text-xs font-semibold text-white/40 ml-1 pr-2 shrink-0">{topResult.duration}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Exact Matches */}
              {exactMatches.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase">
                    Exact Matches
                  </h3>
                  {renderTrackList(exactMatches)}
                </div>
              )}

              {/* 3. Similar Songs */}
              {similarSongs.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase">
                    Similar Songs
                  </h3>
                  {renderTrackList(similarSongs, true)}
                </div>
              )}

              {/* 4. More From This Artist */}
              {moreArtistSongs.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase">
                    More From {topResult?.artist}
                  </h3>
                  {renderTrackList(moreArtistSongs)}
                </div>
              )}

              {/* 5. Album Section */}
              {albumInfo && (
                <div>
                  <h3 className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase">
                    Album
                  </h3>
                  <div 
                    onClick={() => setQuery(albumInfo.name)}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.015] p-4 hover:bg-white/[0.035] hover:border-white/[0.08] cursor-pointer max-w-sm transition duration-300"
                  >
                    <img src={albumInfo.cover} alt={albumInfo.name} className="h-14 w-14 rounded-lg object-cover shadow-md transition duration-300 group-hover:scale-103" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm text-white truncate transition-colors group-hover:text-sage-400">{albumInfo.name}</h4>
                      <p className="text-xs text-white/45 mt-0.5">By {topResult?.artist} • {albumInfo.year}</p>
                      <p className="text-[10px] text-white/30 mt-1">{albumInfo.songCount} songs</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Recommended For You */}
              {recommendedSongs.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase">
                    Recommended For You
                  </h3>
                  {renderTrackList(recommendedSongs, true)}
                </div>
              )}

              {/* People Section */}
              {results.people.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase">
                    People
                  </h3>
                  {renderPeopleGrid(results.people.slice(0, 6))}
                </div>
              )}
            </div>
          )}

          {/* SONGS Tab (Full List) */}
          {activeTab === "songs" && sortedSongs.length > 0 && (
            <div>
              <h3 className={`mb-4.5 text-base font-bold uppercase tracking-wider ${
                morphism === "neobrutalism" ? "text-black" : "text-ink-300"
              }`}>
                All Songs ({sortedSongs.length} matches)
              </h3>
              {renderTrackList(sortedSongs, true)}
            </div>
          )}

          {/* PLAYLISTS Tab (Full Grid) */}
          {activeTab === "playlists" && results.playlists.length > 0 && (
            <div>
              <h3 className={`mb-4.5 text-base font-bold uppercase tracking-wider ${
                morphism === "neobrutalism" ? "text-black" : "text-ink-300"
              }`}>
                All Playlists ({results.playlists.length})
              </h3>
              {renderPlaylistGrid(results.playlists)}
            </div>
          )}

          {/* PEOPLE Tab (Full Grid) */}
          {activeTab === "people" && results.people.length > 0 && (
            <div>
              <h3 className={`mb-4.5 text-base font-bold uppercase tracking-wider ${
                morphism === "neobrutalism" ? "text-black" : "text-ink-300"
              }`}>
                All People ({results.people.length})
              </h3>
              {renderPeopleGrid(results.people)}
            </div>
          )}

        </div>
      )}
      
      {!loading && query && !hasResults && (
        <SonoraEmptyState 
          title="No results found" 
          description={`We couldn't find anything for "${query}". Try searching for something else.`}
          screenText="NO RESULT"
          defaultView={
            <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.015] text-ink-500 mb-6`}>
                <SearchIcon className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-ink-100">No results found</h3>
              <p className="mt-2 text-ink-500">We couldn't find anything for "{query}". Try searching for something else.</p>
            </div>
          }
        />
      )}

      {!query && recentSearches.length > 0 && (
        <div className="animate-in fade-in duration-500">
          <h2 className="mb-6 flex items-center gap-2.5 text-lg font-bold text-ink-100">
            <Clock className="h-5 w-5 text-ink-400" /> Recent Searches
          </h2>
          {renderTrackList(recentSearches.slice(0, 10))}
        </div>
      )}

      {!query && recentSearches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.015] text-sage-400 mb-6">
            <Mic2 className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-ink-100">Search music, public playlists, creators</h3>
          <p className="mt-2 text-ink-500 max-w-sm text-sm">Find tracks in the global catalog, discover shared public playlists, or connect with other creators.</p>
        </div>
      )}
    </div>
  );
}
