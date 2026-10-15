import { useState, useEffect } from "react";
import { Compass, Music, RefreshCw, Flame, Sparkles, Heart, HelpCircle, History } from "lucide-react";
import { HorizontalCards } from "../components/MusicCards";
import { Section } from "../components/Section";
import { usePlayer } from "../context/PlayerContext";

function SkeletonGrid() {
  return (
    <div className="flex gap-4 overflow-x-hidden">
      {[0, 1, 2, 3, 4].map((item) => (
        <div className="w-[174px] shrink-0 p-2" key={item}>
          <div className="skeleton aspect-square rounded-xl" />
          <div className="mt-2 space-y-1.5">
            <div className="skeleton h-3 w-2/3 rounded-full" />
            <div className="skeleton h-2.5 w-4/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Recommendations() {
  const { user, morphism } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hype, setHype] = useState(50);
  const [discovery, setDiscovery] = useState(50);
  const [modules, setModules] = useState({
    continue_listening: [],
    recently_played: [],
    because_you_liked: null,
    similar_songs: [],
    similar_artists: [],
    trending_songs: [],
    new_releases: [],
    hidden_gems: [],
    recommended_for_you: []
  });

  const fetchRecommendations = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch(`/api/recommendations/modules?hype=${hype}&discovery=${discovery}`, {
        headers: {
          'x-user-id': user?.uid || 'guest'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user?.uid, hype, discovery]);

  const handleRefresh = () => {
    fetchRecommendations(true);
  };

  const cardRadius = morphism === 'neobrutalism' ? 'rounded-none' : 'rounded-2xl';

  return (
    <div className="min-h-screen px-4 pb-28 pt-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sage-400">
            <Compass className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.25em]">Made For You</span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold text-white tracking-tight">Your Music Radar</h1>
          <p className="mt-1 text-sm text-ink-400">Curated tracks and smart recommendations based on your unique listening taste.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Updating Radar...' : 'Refresh Radar'}
        </button>
      </header>

      {/* Vibe Tuner Control Panel */}
      <section className="mb-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 text-sage-400">
          <Sparkles className="h-4 w-4" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Vibe Tuner</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hype Slider */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink-300">Energy Level (Hype vs. Chill)</span>
              <span className="text-xs font-bold text-sage-400">{hype}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={hype} 
              onChange={(e) => setHype(parseInt(e.target.value))}
              className="w-full accent-sage-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-1 text-[10px] text-ink-500">
              <span>Deep Chill</span>
              <span>Maximum Hype</span>
            </div>
          </div>

          {/* Discovery Slider */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink-300">Discovery Mode (Mainstream vs. Niche)</span>
              <span className="text-xs font-bold text-sage-400">{discovery}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={discovery} 
              onChange={(e) => setDiscovery(parseInt(e.target.value))}
              className="w-full accent-sage-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-1 text-[10px] text-ink-500">
              <span>Mainstream Hits</span>
              <span>Obscure Niche Find</span>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="skeleton h-5 w-48 rounded-full" />
            <SkeletonGrid />
          </div>
          <div className="space-y-3">
            <div className="skeleton h-5 w-64 rounded-full" />
            <SkeletonGrid />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Recommended For You */}
          {modules.recommended_for_you && modules.recommended_for_you.length > 0 && (
            <Section title="Recommended For You" subtitle="curated based on your favorite artists, genres, and listens">
              <HorizontalCards items={modules.recommended_for_you} />
            </Section>
          )}

          {/* Because You Liked */}
          {modules.because_you_liked && modules.because_you_liked.tracks.length > 0 && (
            <Section 
              title={`Because you liked "${modules.because_you_liked.seed.title}"`} 
              subtitle={`Similar vibes to the hit track by ${modules.because_you_liked.seed.artist}`}
            >
              <HorizontalCards items={modules.because_you_liked.tracks} />
            </Section>
          )}

          {/* Continue Listening */}
          {modules.continue_listening && modules.continue_listening.length > 0 && (
            <Section title="Continue Listening" subtitle="pick up right where you left off">
              <HorizontalCards items={modules.continue_listening} />
            </Section>
          )}

          {/* Recently Played */}
          {modules.recently_played && modules.recently_played.length > 0 && (
            <Section title="Recently Played" subtitle="your latest soundtracks">
              <HorizontalCards items={modules.recently_played} />
            </Section>
          )}

          {/* Trending Songs */}
          {modules.trending_songs && modules.trending_songs.length > 0 && (
            <Section title="Trending Now" subtitle="what's hot in the community">
              <HorizontalCards items={modules.trending_songs} />
            </Section>
          )}

          {/* Hidden Gems */}
          {modules.hidden_gems && modules.hidden_gems.length > 0 && (
            <Section title="Hidden Gems" subtitle="lesser-known tracks you will love">
              <HorizontalCards items={modules.hidden_gems} />
            </Section>
          )}

          {/* New Releases */}
          {modules.new_releases && modules.new_releases.length > 0 && (
            <Section title="New Releases" subtitle="fresh tracks added to the catalog">
              <HorizontalCards items={modules.new_releases} />
            </Section>
          )}

          {/* Similar Songs */}
          {modules.similar_songs && modules.similar_songs.length > 0 && (
            <Section title="Vibe Matches" subtitle="songs that fit your overall genre preferences">
              <HorizontalCards items={modules.similar_songs} />
            </Section>
          )}

          {/* If everything is empty (Guest mode) */}
          {(!modules.recommended_for_you || modules.recommended_for_you.length === 0) && (
            <div className={`flex flex-col items-center justify-center text-center p-12 bg-white/[0.02] border border-white/[0.06] ${cardRadius}`}>
              <Sparkles className="h-10 w-10 text-sage-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Your Music Journey Starts Here</h3>
              <p className="mt-2 text-sm text-ink-400 max-w-sm">
                Start playing tracks, searching global catalogs, and liking songs. We will build your personal radar dynamically!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
