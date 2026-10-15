import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { SmallCards, TrendingCards } from "../components/MusicCards";
import { HeroRecommendation } from "../components/HeroRecommendation";
import { Section } from "../components/Section";
import { usePlayer } from "../context/PlayerContext";
import { useNavigate } from "react-router-dom";
import { Play, Shuffle, X, Clock, ChevronRight, ListPlus } from "lucide-react";

function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-x-hidden">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div className="w-[140px] shrink-0 p-2" key={item}>
          <div className="skeleton aspect-square rounded-lg" />
          <div className="mt-2 space-y-1.5">
            <div className="skeleton h-2.5 w-2/3 rounded-full" />
            <div className="skeleton h-2.5 w-4/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 2×2 collage from first 4 cover images */
function CollageCover({ covers }) {
  const slots = [covers[0], covers[1], covers[2], covers[3]];
  if (covers.length === 1 || !covers[1]) {
    return (
      <img
        src={covers[0]}
        alt=""
        className="h-full w-full object-cover"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2">
      {slots.map((src, i) =>
        src && !src.startsWith('linear') ? (
          <img key={i} src={src} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.background = '#1a1a2e'; }} />
        ) : (
          <div key={i} className="h-full w-full" style={{ background: src || 'linear-gradient(135deg,#1a1a2e,#16213e)' }} />
        )
      )}
    </div>
  );
}

/** Big clickable "Recently Played" box */
function RecentlyPlayedBox({ tracks, onClick }) {
  const { morphism } = usePlayer();
  if (!tracks || tracks.length === 0) return null;
  const covers = tracks.slice(0, 4).map(t => t.cover).filter(Boolean);

  const collageRadius = morphism === 'neobrutalism' ? 'rounded-md' : 'rounded-xl';

  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition duration-300 hover:border-white/[0.12] hover:bg-white/[0.06] sm:gap-5 sm:p-5 tactile-btn"
    >
      {/* Collage */}
      <div className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden ${collageRadius} sm:h-20 sm:w-20`}>
        <CollageCover covers={covers} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-sage-400 shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sage-400/80">Recently Played</p>
        </div>
        <p className="mt-1 text-base font-semibold text-ink-100 truncate">{tracks[0]?.title}</p>
        <p className="mt-0.5 text-sm text-ink-400 truncate">{tracks.length} tracks · Last: {tracks[0]?.artist}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-ink-500 transition group-hover:text-ink-300 shrink-0" />
    </button>
  );
}

/** Full recently played modal/overlay */
function RecentlyPlayedModal({ tracks, onClose }) {
  const { playContext } = usePlayer();
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl rounded-t-2xl sm:rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sage-400" />
            <h2 className="text-base font-bold text-white">Recently Played</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ink-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto scrollbar-hide">
          {tracks.map((track, i) => (
            <button
              key={track.id || i}
              onClick={() => { playContext(tracks, i); onClose(); }}
              className="group flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-white/[0.04]"
            >
              <span className="w-5 text-center text-xs text-ink-500">{i + 1}</span>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                {track.cover && !track.cover.startsWith('linear') ? (
                  <img src={track.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full rounded-lg" style={{ background: track.cover || 'linear-gradient(135deg,#1a1a2e,#16213e)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-100 group-hover:text-white">{track.title}</p>
                <p className="truncate text-xs text-ink-500">{track.artist}</p>
              </div>
              <Play className="h-3.5 w-3.5 text-ink-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function Home() {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [allTracks, setAllTracks] = useState([]);
  const [featuredSongs, setFeaturedSongs] = useState([]);
  const [newlyAdded, setNewlyAdded] = useState([]);
  const [globalHits, setGlobalHits] = useState([]);
  const [trendingNow, setTrendingNow] = useState([]);
  const [loading, setLoading] = useState(true);

  const { playContext, shufflePlay, addMultipleToQueue, user } = usePlayer();
  const navigate = useNavigate();
  const [showLegalPopup, setShowLegalPopup] = useState(false);

  useEffect(() => {
    if (user && !localStorage.getItem('sonora_legal_accepted')) {
      setShowLegalPopup(true);
    }
  }, [user]);

  const handleCloseLegal = () => {
    localStorage.setItem('sonora_legal_accepted', 'true');
    setShowLegalPopup(false);
  };

  useEffect(() => {
    const userId = user?.uid || '';
    Promise.all([
      fetch('/api/tracks', { headers: { 'x-user-id': userId } }).then(res => res.json()),
      fetch('/api/tracks/featured', { headers: { 'x-user-id': userId } }).then(res => res.json()),
      fetch('/api/home').then(res => res.json())
    ])
    .then(([tracksData, featuredData, homeData]) => {
      const historyJson = localStorage.getItem('aura_history');
      let realHistory = [];
      try {
        realHistory = historyJson ? JSON.parse(historyJson) : [];
      } catch (e) {
        console.error("Error parsing history JSON:", e);
      }

      if (Array.isArray(tracksData)) {
        setAllTracks(tracksData);
        setRecentlyPlayed(realHistory.length > 0 ? realHistory.slice(0, 30) : tracksData.slice(0, 30));

        // Newly Added: tracks with createdAt within last 7 days, sorted newest first
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weeklyNew = [...tracksData]
          .filter(t => {
            if (!t.createdAt) return false;
            const ts = new Date(t.createdAt).getTime();
            return ts >= oneWeekAgo;
          })
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 20);
        setNewlyAdded(weeklyNew);
      }

      if (Array.isArray(featuredData)) {
        setFeaturedSongs(featuredData);
      }

      if (homeData) {
        if (Array.isArray(homeData.featured)) {
          const uniqueCovers = new Set();
          const filteredGlobal = homeData.featured.filter(t => {
            if (uniqueCovers.has(t.cover)) return false;
            uniqueCovers.add(t.cover);
            return true;
          });
          setGlobalHits(filteredGlobal.slice(0, 10));
        }

        if (Array.isArray(homeData.trending)) {
          const uniqueCovers = new Set();
          const filteredTrending = homeData.trending.filter(t => {
            if (uniqueCovers.has(t.cover)) return false;
            uniqueCovers.add(t.cover);
            return true;
          });
          setTrendingNow(filteredTrending.slice(0, 10));
        }
      }

      setLoading(false);
    })
    .catch(err => {
      console.error("Failed to fetch home data:", err);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="animate-in fade-in duration-500 slide-in-from-bottom-2">
      <HeroRecommendation globalHits={globalHits} />

      {/* Recently Played — collage box */}
      {recentlyPlayed.length > 0 && (
        <div className="mt-8 [--delay:90ms]">
          <RecentlyPlayedBox tracks={recentlyPlayed} onClick={() => setShowRecentModal(true)} />
        </div>
      )}

      {/* Newly Added — only show if songs were added this week */}
      {newlyAdded.length > 0 && (
        <Section
          title="Newly Added"
          eyebrow="Added this week"
          action={
            <div className="flex gap-2">
              <button onClick={() => playContext(newlyAdded, 0)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <Play className="h-3 w-3" /> Play All
              </button>
              <button onClick={() => shufflePlay(newlyAdded)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <Shuffle className="h-3 w-3" /> Shuffle
              </button>
              <button onClick={() => addMultipleToQueue(newlyAdded)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <ListPlus className="h-3 w-3" /> Add to Queue
              </button>
            </div>
          }
          className="mt-10 [--delay:100ms]"
        >
          <SmallCards items={newlyAdded} />
        </Section>
      )}

      {/* Featured Section */}
      {featuredSongs.length > 0 && (
        <Section
          title="Featured"
          eyebrow="Curated hits just for you"
          action={
            <div className="flex gap-2">
              <button onClick={() => playContext(featuredSongs, 0)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <Play className="h-3 w-3" /> Play All
              </button>
              <button onClick={() => shufflePlay(featuredSongs)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <Shuffle className="h-3 w-3" /> Shuffle
              </button>
              <button onClick={() => addMultipleToQueue(featuredSongs)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <ListPlus className="h-3 w-3" /> Add to Queue
              </button>
            </div>
          }
          className="mt-10 [--delay:105ms]"
        >
          <SmallCards items={featuredSongs} />
        </Section>
      )}

      {/* Your Library */}
      {allTracks.length > 0 && (
        <Section
          title="Your Library"
          eyebrow={`Collection of ${allTracks.length} songs`}
          action={
            <div className="flex gap-2">
              <button onClick={() => playContext(allTracks, 0)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <Play className="h-3 w-3" /> Play All
              </button>
              <button onClick={() => shufflePlay(allTracks)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <Shuffle className="h-3 w-3" /> Shuffle
              </button>
              <button onClick={() => addMultipleToQueue(allTracks)} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:bg-white/[0.1]">
                <ListPlus className="h-3 w-3" /> Add to Queue
              </button>
            </div>
          }
          className="mt-10 [--delay:115ms]"
        >
          <SmallCards items={allTracks} />
        </Section>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2 [--delay:140ms]">
        <Section
          title="Global Hits"
          eyebrow="Top songs worldwide"
          action="Browse"
          onAction={() => navigate('/search?q=Global%20Top%20Hits')}
          className="mt-0"
        >
          {loading ? <SkeletonRow /> : <TrendingCards items={globalHits} title="Global Hits" subtitle="Top songs worldwide" />}
        </Section>

        <Section
          title="Trending Now"
          eyebrow="What everyone is listening to"
          action="Browse"
          onAction={() => navigate('/search?q=Trending%20Pop')}
          className="mt-0 lg:mt-0"
        >
          {loading ? <SkeletonRow /> : <TrendingCards items={trendingNow} title="Trending Now" subtitle="Top charts globally" />}
        </Section>
      </div>

      {/* Recently Played Full Modal */}
      {showRecentModal && (
        <RecentlyPlayedModal tracks={recentlyPlayed} onClose={() => setShowRecentModal(false)} />
      )}

      {showLegalPopup && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseLegal} />
          <div className="relative w-full max-w-2xl max-h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.05] p-5 sm:p-6 bg-white/[0.02] shrink-0">
              <h2 className="text-lg font-bold text-white">Legal &amp; Copyright Notice</h2>
              <button
                onClick={handleCloseLegal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ink-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-8 text-sm text-ink-300 leading-relaxed scrollbar-hide">
              <p className="font-bold text-white mb-6">© 2026 Sonora. All Rights Reserved.</p>

              <h5 className="font-bold text-white mb-2">Intellectual Property</h5>
              <p className="mb-6">The Sonora platform—including its custom interface systems, ambient audio-reactive visualizer engine, synchronization architecture, playback systems, interaction design, and original frontend implementation—is the intellectual property of Sonora and its developers.</p>
              <p className="mb-6">Unauthorized reproduction, redistribution, reverse-engineering, or commercial reuse of Sonora's original platform systems, UI structures, animations, branding elements, and proprietary interaction mechanics without permission is prohibited.</p>

              <h5 className="font-bold text-white mb-2">Third-Party Media &amp; Streaming Rights</h5>
              <p className="mb-6">Sonora operates as an independent immersive music interface and playback environment. All music metadata, artist content, album artwork, streaming media, and third-party assets remain the property of their respective owners, labels, platforms, and licensors, including:</p>
              <ul className="list-disc pl-5 mb-6 space-y-1">
                <li><strong>Spotify AB</strong></li>
                <li><strong>Apple Inc.</strong></li>
                <li><strong>Google LLC</strong></li>
                <li><strong>Associated Content Providers</strong></li>
              </ul>
              <p>Sonora does not claim ownership over externally sourced media or third-party services used for integration, inspiration, metadata delivery, or streaming functionality.</p>
            </div>

            <div className="border-t border-white/[0.05] p-5 bg-black/20 flex justify-end shrink-0">
              <button
                onClick={handleCloseLegal}
                className="rounded-lg bg-sage-400 px-6 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-sage-500 hover:scale-105"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
