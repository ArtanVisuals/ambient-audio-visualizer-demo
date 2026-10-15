import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause, UserPlus, UserCheck, Music, Users, Star, Disc, Shuffle, MoreHorizontal } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export function ArtistProfileModal() {
  const { 
    artistProfileOpen, 
    activeArtistName, 
    closeArtistProfile, 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    playContext, 
    openTrackMenu 
  } = usePlayer();

  const [artistTracks, setArtistTracks] = useState([]);
  const [artistBio, setArtistBio] = useState('');
  const [artistImage, setArtistImage] = useState('');
  const [monthlyListeners, setMonthlyListeners] = useState('0');
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Load following state and fetch artist details when activeArtistName changes
  useEffect(() => {
    if (!activeArtistName) return;

    // Load follow status from localStorage
    const following = localStorage.getItem(`aura_following_artist_${activeArtistName}`) === 'true';
    setIsFollowing(following);

    // Fetch artist details from backend
    setLoading(true);
    fetch(`/api/artist/details?name=${encodeURIComponent(activeArtistName)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch artist details');
        return res.json();
      })
      .then((data) => {
        setArtistBio(data.bio || '');
        setArtistImage(data.imageUrl || '');
        setMonthlyListeners(data.monthlyListeners || '0');
        
        // Dedup tracks by title to make list look neat
        const seen = new Set();
        const uniqueTracks = (data.topTracks || []).filter(track => {
          const key = track.title.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setArtistTracks(uniqueTracks);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load artist details:', err);
        setLoading(false);
      });
  }, [activeArtistName]);

  if (!artistProfileOpen || !activeArtistName) return null;

  const handleToggleFollow = () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    localStorage.setItem(`aura_following_artist_${activeArtistName}`, nextState ? 'true' : 'false');
  };

  // Play artist's songs
  const handlePlayArtist = () => {
    if (artistTracks.length > 0) {
      playContext(artistTracks, 0);
    }
  };

  const firstTrack = artistTracks[0];

  return createPortal(
    <div 
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 md:p-6 select-none animate-in fade-in duration-300"
      onClick={closeArtistProfile}
    >
        {/* Modal Container (Spotify Desktop Style) */}
        <div 
          className="relative w-full max-w-5xl h-full sm:h-[90vh] bg-ink-950 border border-white/10 rounded-none sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button 
            onClick={closeArtistProfile}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 text-white/70 hover:text-white transition-all active:scale-95"
            aria-label="Close Profile"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Main Content Split Area */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Column (Main Profile) */}
            <div className="flex-1 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              
              {/* Giant Tall Banner Header */}
              <div 
                className="relative h-[280px] sm:h-[340px] shrink-0 bg-no-repeat bg-cover bg-center flex flex-col justify-end p-6 sm:p-8"
                style={{
                  backgroundImage: artistImage 
                    ? `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(9, 10, 9, 0.95) 100%), url("${artistImage}")` 
                    : `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(9, 10, 9, 0.95) 100%), linear-gradient(135deg, #2e1065, #090a09)`
                }}
              >
                {/* Verified Tag */}
                <div className="flex items-center gap-1.5 text-white/90 text-xs font-bold drop-shadow-md">
                  <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-blue-500 text-white p-0.5 shadow-sm">
                    <Star className="h-3 w-3 fill-current" />
                  </span>
                  Verified Artist
                </div>

                {/* Artist Name */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight mt-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  {activeArtistName}
                </h1>

                {/* Monthly Listeners */}
                <p className="text-sm sm:text-base font-semibold text-white/70 mt-3 drop-shadow-md">
                  {monthlyListeners} monthly listeners
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-5 px-6 sm:px-8 py-5 shrink-0 bg-[#090a09]/40 border-b border-white/[0.04]">
                {/* Big Green Play Button */}
                {artistTracks.length > 0 && (
                  <button 
                    onClick={handlePlayArtist}
                    className="flex items-center justify-center h-12 w-12 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0"
                  >
                    <Play className="h-5.5 w-5.5 fill-current ml-0.5" />
                  </button>
                )}

                {/* Follow Button */}
                <button 
                  onClick={handleToggleFollow}
                  className={`px-5 py-2 rounded-full border text-xs font-extrabold uppercase tracking-widest transition-all active:scale-95 shrink-0 ${
                    isFollowing 
                      ? 'border-[#1db954] text-[#1db954] bg-[#1db954]/5' 
                      : 'border-white/30 text-white hover:border-white'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>

                {/* Shuffle / Options */}
                <button 
                  onClick={handlePlayArtist}
                  className="p-2 text-ink-400 hover:text-white transition-colors"
                  title="Shuffle Play"
                >
                  <Shuffle className="h-5 w-5" />
                </button>

                <button 
                  onClick={(e) => {
                    if (firstTrack) openTrackMenu(firstTrack, e.clientX, e.clientY);
                  }}
                  className="p-2 text-ink-400 hover:text-white transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              {/* Popular Song Section */}
              <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-b from-[#090a09]/20 to-transparent">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Popular</h2>

                {loading ? (
                  /* Loading Skeletons */
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-14 rounded-xl skeleton" />
                    ))}
                  </div>
                ) : artistTracks.length > 0 ? (
                  <div className="space-y-1">
                    {artistTracks.map((track, index) => {
                      const isCurrentPlaying = currentTrack?.id === track.id;
                      
                      return (
                        <div 
                          key={track.id}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openTrackMenu(track, e.clientX, e.clientY);
                          }}
                          className={`group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer select-none ${
                            isCurrentPlaying ? 'bg-white/[0.03]' : ''
                          }`}
                          onClick={() => {
                            if (isCurrentPlaying) {
                              togglePlay();
                            } else {
                              playContext(artistTracks, index);
                            }
                          }}
                        >
                          {/* Row Number / Play indicator */}
                          <div className="w-5 shrink-0 text-center text-sm font-semibold text-ink-500">
                            <span className="group-hover:hidden flex justify-center items-center">
                              {isCurrentPlaying && isPlaying ? (
                                <div className="flex items-end gap-0.5 h-3.5 w-3.5 justify-center mb-0.5">
                                  <div className="w-0.75 bg-[#1db954] rounded-full animate-[eqBar_0.8s_ease-in-out_infinite_alternate]" style={{ height: '30%' }} />
                                  <div className="w-0.75 bg-[#1db954] rounded-full animate-[eqBar_0.8s_ease-in-out_infinite_alternate]" style={{ height: '80%', animationDelay: '0.15s' }} />
                                  <div className="w-0.75 bg-[#1db954] rounded-full animate-[eqBar_0.8s_ease-in-out_infinite_alternate]" style={{ height: '50%', animationDelay: '0.3s' }} />
                                </div>
                              ) : (
                                index + 1
                              )}
                            </span>
                            <span className="hidden group-hover:flex justify-center items-center text-white">
                              {isCurrentPlaying && isPlaying ? (
                                <Pause className="h-4.5 w-4.5 fill-current" />
                              ) : (
                                <Play className="h-4.5 w-4.5 fill-current" />
                              )}
                            </span>
                          </div>

                          {/* Cover Image */}
                          <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-ink-900 shadow-md">
                            {track.cover ? (
                              <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5">
                                <Music className="h-4 w-4 text-ink-500" />
                              </div>
                            )}
                          </div>

                          {/* Track Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold truncate ${isCurrentPlaying ? 'text-[#1db954]' : 'text-white'}`}>
                              {track.title}
                            </h4>
                          </div>

                          {/* Plays Count */}
                          {track.listeners && (
                            <div className="text-xs font-semibold text-ink-400 shrink-0 min-w-[70px] text-right">
                              {track.listeners}
                            </div>
                          )}

                          {/* Duration */}
                          <div className="text-xs font-semibold text-ink-500 shrink-0 w-10 text-right">
                            {track.duration}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-white/10 text-center">
                    <Music className="h-8 w-8 text-ink-500 mb-2" />
                    <p className="text-sm font-semibold text-ink-400">No popular tracks found</p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column (Spotify Sidebar) */}
            <div className="w-full md:w-[320px] shrink-0 border-t md:border-t-0 md:border-l border-white/[0.08] bg-white/[0.01] flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              
              {/* Featured Release Card */}
              {firstTrack && (
                <div className="p-6 border-b border-white/[0.08] space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-ink-400">Featured Release</h3>
                  <div className="relative rounded-2xl overflow-hidden aspect-square border border-white/10 bg-ink-900 group shadow-lg">
                    {firstTrack.cover ? (
                      <img src={firstTrack.cover} alt={firstTrack.album} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <Music className="h-12 w-12 text-ink-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1db954] mb-1">Latest Release</p>
                      <h4 className="text-base font-bold text-white line-clamp-1">{firstTrack.title}</h4>
                      <p className="text-xs font-semibold text-ink-400 truncate mt-0.5 flex items-center gap-1.5">
                        <Disc className="h-3 w-3" />
                        {firstTrack.album || 'Single'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* About The Artist Card */}
              <div className="p-6 space-y-4 flex-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-ink-400">About the artist</h3>
                
                <div 
                  className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-ink-900 group shadow-lg border border-white/10 flex flex-col justify-end p-4 shrink-0"
                  style={{
                    backgroundImage: artistImage 
                      ? `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(9, 10, 9, 0.9) 100%), url("${artistImage}")` 
                      : `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(9, 10, 9, 0.9) 100%), linear-gradient(135deg, #1e1b4b, #090a09)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="z-10">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-sage-400 mb-1">Wikipedia Biography</p>
                    <div className="text-xs font-medium text-white/90 leading-relaxed max-h-24 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                      {artistBio || `Biography loading...`}
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-400">Genre</span>
                    <span className="font-bold text-white">{primaryGenre}</span>
                  </div>
                  {firstTrack?.releaseDate && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-400">First Active</span>
                      <span className="font-bold text-white">{new Date(firstTrack.releaseDate).getFullYear()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-400">Followers Status</span>
                    <span className={`font-bold ${isFollowing ? 'text-[#1db954]' : 'text-white'}`}>
                      {isFollowing ? 'Following' : 'Not Following'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
    </div>,
    document.body
  );
}
