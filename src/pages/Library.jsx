import React, { useState } from "react";
import { Heart, ListMusic, UploadCloud, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UploadModal } from "../components/UploadModal";

export function Library() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const navigate = useNavigate();

  const handleUploadSuccess = (track) => {
    // If successfully uploaded, refresh or redirect to home to see the updated library
    setTimeout(() => {
      navigate("/home");
    }, 1000);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <h1 className="mb-8 text-4xl font-bold text-ink-100">Your Library</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/liked" className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
          <div className="brutalist-card-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-sage-400 text-ink-950 shadow-lg shadow-sage-400/20 group-hover:scale-105 transition-transform">
            <Heart className="h-6 w-6 fill-current" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-ink-100">Liked Songs</h3>
            <p className="mt-1 text-xs text-ink-500">Your favorite tracks</p>
          </div>
        </Link>
        
        <Link to="/playlists" className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
          <div className="brutalist-card-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-ink-500 group-hover:bg-white/[0.08] group-hover:text-ink-100 transition-colors group-hover:scale-105">
            <ListMusic className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-ink-100">Playlists</h3>
            <p className="mt-1 text-xs text-ink-500">Your custom mixes</p>
          </div>
        </Link>

        <div 
          onClick={() => setIsUploadOpen(true)}
          className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:bg-white/[0.04] select-none"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-all group-hover:scale-105 shadow-lg shadow-purple-500/10">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-ink-100">Upload Music</h3>
            <p className="mt-1 text-xs text-ink-500">Add local audio files directly</p>
          </div>
        </div>

        <Link to="/become-artist" className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-all group-hover:scale-105 shadow-lg shadow-emerald-500/10">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-ink-100">Become an Artist</h3>
            <p className="mt-1 text-xs text-ink-500">Release original tracks & verify profile</p>
          </div>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-20 text-center">
        <p className="text-lg font-medium text-ink-300">Looking for more?</p>
        <p className="mt-2 text-sm text-ink-500">Save albums and podcasts to build your collection.</p>
      </div>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
