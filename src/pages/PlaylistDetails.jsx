import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Play, ListMusic, MoreHorizontal, Trash2, Shuffle, Radio, PlayCircle, ListPlus, PlusSquare, Share2, Edit2, Star, MessageSquare, Heart, Bookmark } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { SonoraLoader } from "../components/SonoraLoader";
import { SonoraEmptyState } from "../components/SonoraEmptyState";

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

export function PlaylistDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playContext, shufflePlay, playNextMultiple, addMultipleToQueue, openTrackMenu, user, morphism, showAlert, showConfirm } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const pressTimer = useRef(null);

  // Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (playlist) {
      setEditName(playlist.name || "");
      setEditDescription(playlist.description || "");
      setEditCoverUrl(playlist.cover || "");
      setEditIsPublic(playlist.is_public === 1);
    }
  }, [playlist]);

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

  const handleRemoveTrack = (trackId, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    fetch(`/api/playlists/${id}/tracks/${trackId}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setTracks(prev => prev.filter(t => t.id !== trackId));
      }
    })
    .catch(console.error);
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('cover', file);
    
    fetch('/api/playlists/upload-cover', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.coverUrl) {
        setEditCoverUrl(data.coverUrl);
      } else {
        showAlert(data.error || 'Upload failed');
      }
    })
    .catch(err => {
      console.error(err);
      showAlert('Upload failed');
    })
    .finally(() => {
      setIsUploading(false);
    });
  };

  const handleSavePlaylist = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    
    fetch(`/api/playlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.trim(),
        cover: editCoverUrl.trim(),
        description: editDescription.trim(),
        is_public: editIsPublic ? 1 : 0
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setPlaylist(prev => ({
          ...prev,
          name: data.name,
          cover: data.cover,
          description: data.description,
          is_public: data.is_public
        }));
        setIsEditModalOpen(false);
      }
    })
    .catch(console.error);
  };

  const handleConfirmDeletePlaylist = () => {
    fetch(`/api/playlists/${id}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setIsDeleteModalOpen(false);
        navigate('/playlists');
      }
    })
    .catch(console.error);
  };

  const handleToggleSave = () => {
    if (!user) {
      showAlert("Please sign in first to save playlists!");
      return;
    }
    const action = playlist.isSaved ? 'unsave' : 'save';
    fetch(`/api/playlists/${id}/${action}`, {
      method: 'POST',
      headers: { 'x-user-id': user.uid }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setPlaylist(prev => ({
          ...prev,
          isSaved: data.saved ? 1 : 0,
          saveCount: data.saved ? prev.saveCount + 1 : Math.max(0, prev.saveCount - 1)
        }));
      }
    })
    .catch(console.error);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!user) {
      showAlert("Please sign in first to review playlists!");
      return;
    }
    if (!newComment.trim()) return;
    
    setSubmittingReview(true);
    fetch(`/api/playlists/${id}/reviews`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': user.uid
      },
      body: JSON.stringify({
        rating: newRating,
        comment: newComment.trim(),
        userName: user.displayName || user.email || 'Auralis Listener'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setNewComment("");
        // Reload reviews
        fetch(`/api/playlists/${id}/reviews`)
          .then(res => res.json())
          .then(data => {
            setReviews(data);
            if (data.length > 0) {
              const sum = data.reduce((acc, r) => acc + r.rating, 0);
              setPlaylist(prev => ({
                ...prev,
                averageRating: sum / data.length
              }));
            }
          });
      }
    })
    .catch(console.error)
    .finally(() => setSubmittingReview(false));
  };

  const handleDeleteReview = async (reviewId) => {
    if (!user) return;
    const confirmed = await showConfirm('Remove your review? This cannot be undone.');
    if (!confirmed) return;

    fetch(`/api/playlists/${id}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': user.uid }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const updated = reviews.filter(r => r.id !== reviewId);
        setReviews(updated);
        if (updated.length > 0) {
          const sum = updated.reduce((acc, r) => acc + r.rating, 0);
          setPlaylist(prev => ({ ...prev, averageRating: sum / updated.length }));
        } else {
          setPlaylist(prev => ({ ...prev, averageRating: 0 }));
        }
      } else {
        showAlert(data.error || 'Could not delete review.');
      }
    })
    .catch(console.error);
  };

  // Returns hours remaining in delete window (null if not owner or expired)
  const getDeleteWindowHours = (review) => {
    if (!user || review.user_id !== user.uid) return null;
    const created = new Date(review.createdAt).getTime();
    const hoursElapsed = (Date.now() - created) / (1000 * 60 * 60);
    if (hoursElapsed > 24) return null;
    return Math.max(0, (24 - hoursElapsed)).toFixed(1);
  };

  const handleAction = (action) => {
    setIsPlaylistMenuOpen(false);
    
    if (action === 'edit') {
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      setIsDeleteModalOpen(true);
    } else if (action === 'shuffle') {
      shufflePlay(tracks);
    } else if (action === 'mix') {
      playContext(tracks, 0);
    } else if (action === 'playNext') {
      playNextMultiple(tracks);
    } else if (action === 'queue') {
      addMultipleToQueue(tracks);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      fetch(`/api/playlists/${id}`, {
        headers: { 'x-user-id': user?.uid || '' }
      }).then(res => {
        if (!res.ok) throw new Error('Playlist not found');
        return res.json();
      }),
      fetch(`/api/playlists/${id}/tracks`, {
        headers: { 'x-user-id': user?.uid || '' }
      }).then(res => res.json()),
      fetch(`/api/playlists/${id}/reviews`).then(res => res.json()).catch(() => [])
    ])
    .then(([playlistData, tracksData, reviewsData]) => {
      setPlaylist(playlistData);
      setTracks(Array.isArray(tracksData) ? tracksData : []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setPlaylist(null);
      setLoading(false);
    });
  }, [id, user]);

  const renderStarRating = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= rating;
          return (
            <Star
              key={star}
              className={`h-4 w-4 ${
                interactive ? 'cursor-pointer transition-transform hover:scale-110' : ''
              } ${
                isFilled 
                  ? morphism === "neobrutalism"
                    ? 'fill-[#ffde4b] text-black stroke-[2px]'
                    : 'fill-sage-400 text-sage-400'
                  : morphism === "neobrutalism"
                    ? 'text-black stroke-[2px] opacity-35'
                    : 'text-ink-600'
              }`}
              onClick={() => interactive && onRatingChange && onRatingChange(star)}
            />
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-20"><SonoraLoader size="md" label="Loading playlist…" /></div>;

  if (!playlist) return <div className="py-20 text-center text-ink-500">Playlist not found</div>;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <Link to="/playlists" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-100">
        <ChevronLeft className="h-4 w-4" />
        Back to Playlists
      </Link>

      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-white/[0.05] pb-8 gap-6">
        <div className="flex items-end gap-6 min-w-0">
          {morphism === "neobrutalism" ? (
            <div className="brutalist-button button-1 fireant-playlist select-none shrink-0">
              {playlist.cover ? (
                <img src={playlist.cover} alt={playlist.name} className="openai-icon object-cover animate-in fade-in duration-300" />
              ) : (
                <div className="openai-logo">
                  <ListMusic className="openai-icon text-black" />
                </div>
              )}
              <div className="button-text text-black">
                <span>Custom</span>
                <span>Mix</span>
              </div>
            </div>
          ) : (
            playlist.cover ? (
              <img src={playlist.cover} alt={playlist.name} className="h-32 w-32 shrink-0 rounded-2xl object-cover shadow-2xl" />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] shadow-2xl">
                <ListMusic className="h-12 w-12 text-ink-500" />
              </div>
            )
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                playlist.is_public === 1 
                  ? "bg-[#ffde4b] text-black border border-black" 
                  : morphism === "neobrutalism" ? "bg-neutral-200 text-black border border-black" : "bg-white/[0.08] text-ink-400"
              }`}>
                {playlist.is_public === 1 ? 'Public Mix' : 'Private Mix'}
              </span>
              {playlist.averageRating > 0 && (
                <div className="flex items-center gap-1.5 ml-1">
                  {renderStarRating(Math.round(playlist.averageRating))}
                  <span className="text-xs opacity-60">({playlist.averageRating.toFixed(1)})</span>
                </div>
              )}
            </div>
            
            <h1 className={`mt-2 truncate text-4xl font-black md:text-5xl lg:text-6xl ${morphism === "neobrutalism" ? "text-black" : "text-ink-100"}`}>{playlist.name}</h1>
            {playlist.description && (
              <p className="mt-2 text-sm text-ink-400 font-medium italic break-words">{playlist.description}</p>
            )}
            <p className="mt-4 text-xs font-semibold opacity-60">
              Created by {playlist.user_id ? <Link to={`/user/${playlist.user_id}`} className="hover:underline text-sage-400 font-bold transition-all">{playlist.ownerName || 'Auralis Listener'}</Link> : (playlist.ownerName || 'Auralis Listener')} • {tracks.length} songs • Saved by {playlist.saveCount || 0} users
            </p>
            <p className="mt-1 text-[10px] opacity-45">Mix ID: {playlist.id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Follow/Save Toggle for guest users */}
          {playlist.isOwner === 0 && (
            <button
              onClick={handleToggleSave}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                morphism === "neobrutalism"
                  ? `border-2 border-black ${
                      playlist.isSaved 
                        ? "bg-[#4ade80] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                        : "bg-[#ffde4b] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                    }`
                  : `rounded-full border ${
                      playlist.isSaved 
                        ? "bg-white text-black border-white" 
                        : "bg-white/[0.04] text-white border-white/[0.1] hover:bg-white/[0.08]"
                    }`
              }`}
            >
              <Bookmark className="h-4 w-4" />
              {playlist.isSaved ? 'Saved to Library' : 'Save to Library'}
            </button>
          )}

          <div className="relative">
            <button 
              onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                morphism === "neobrutalism"
                  ? "border-2 border-black bg-white text-black hover:bg-neutral-100"
                  : "bg-white/[0.05] text-ink-500 hover:bg-white/[0.1] hover:text-ink-100"
              }`}
              title="More Options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            {isPlaylistMenuOpen && (
              <div className={`absolute right-0 top-12 z-50 w-64 rounded-xl border p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                morphism === "neobrutalism"
                  ? "border-2 border-black bg-white text-black"
                  : "border-white/[0.1] bg-ink-950 text-ink-100"
              }`}>
                <button onClick={() => handleAction('shuffle')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                  <Shuffle className="h-4 w-4" /> Shuffle Play
                </button>
                <button onClick={() => handleAction('mix')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                  <Radio className="h-4 w-4" /> Start Mix
                </button>
                <button onClick={() => handleAction('playNext')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                  <PlayCircle className="h-4 w-4" /> Play Next
                </button>
                <button onClick={() => handleAction('queue')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                  <ListPlus className="h-4 w-4" /> Add to Queue
                </button>
                
                {playlist.isOwner === 1 && (
                  <>
                    <div className="my-1.5 h-px w-full bg-black/10 dark:bg-white/[0.05]" />
                    <button onClick={() => handleAction('edit')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                      <Edit2 className="h-4 w-4" /> Edit Playlist
                    </button>
                    <button 
                      onClick={() => handleAction('delete')}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Playlist
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracks List */}
      {tracks.length > 0 ? (
        <div className="space-y-2 mb-12">
          {tracks.map((track, idx) => (
            <div 
              key={track.id} 
              onClick={() => {
                if (openMenuId) {
                  setOpenMenuId(null);
                } else {
                  playContext(tracks, idx);
                }
              }}
              onContextMenu={(e) => { e.preventDefault(); openTrackMenu(track, e.clientX, e.clientY); }}
              onMouseDown={(e) => handlePressStart(e, track)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={(e) => handlePressStart(e, track)}
              onTouchEnd={handlePressEnd}
              onTouchMove={handlePressEnd}
              className={`group relative flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200 ${
                morphism === "neobrutalism" ? "hover:bg-black/[0.05]" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <img src={track.cover} alt={track.title} className="absolute inset-0 h-full w-full rounded-md object-cover group-hover:opacity-30 transition-opacity" />
                <span className="relative z-10 text-xs font-bold text-white shadow-black drop-shadow-md group-hover:hidden">{idx + 1}</span>
                <Play className="relative z-10 hidden h-4 w-4 text-white group-hover:block drop-shadow-md" />
              </div>
               <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`truncate text-sm font-medium ${morphism === "neobrutalism" ? "text-black" : "text-ink-100"}`}>{track.title}</p>
                  {checkIsExplicit(track) && (
                    <span className="rounded bg-red-500/10 border border-red-500/20 px-1 py-0.2 text-[8px] font-black text-red-400 tracking-wide shrink-0">E</span>
                  )}
                </div>
                <p className={`truncate text-xs ${morphism === "neobrutalism" ? "text-neutral-600" : "text-ink-500"}`}>{track.artist}</p>
              </div>
              <span className={`text-sm ${morphism === "neobrutalism" ? "text-neutral-600" : "text-ink-500"}`}>{track.duration}</span>
              
              {playlist.isOwner === 1 && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setOpenMenuId(openMenuId === track.id ? null : track.id); 
                  }}
                  className="ml-2 flex items-center justify-center text-ink-500 transition-colors hover:text-ink-100"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              )}

              {openMenuId === track.id && (
                <div className={`absolute right-12 top-10 z-10 w-48 rounded-xl border p-1 shadow-2xl ${
                  morphism === "neobrutalism" ? "bg-white border-2 border-black text-black" : "bg-ink-950 border-white/[0.05] text-ink-100"
                }`}>
                  <button 
                    onClick={(e) => handleRemoveTrack(track.id, e)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-black/[0.05]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove from Playlist
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-12">
          <SonoraEmptyState 
            title="This playlist is empty." 
            description="Add some songs from the player menu!" 
            screenText="EMPTY"
          />
        </div>
      )}

      {/* Ratings & Comments Section (Visible only for public playlists) */}
      {playlist.is_public === 1 && (
        <div className="border-t border-white/[0.05] pt-10 mt-10">
          <h2 className={`text-2xl font-black uppercase tracking-wider mb-6 ${
            morphism === "neobrutalism" ? "text-black" : "text-ink-100"
          }`}>
            Ratings & Reviews
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Review form */}
            <div className={`p-6 rounded-2xl border ${
              morphism === "neobrutalism"
                ? "border-2 border-black bg-white text-black shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                : "border-white/[0.08] bg-white/[0.02] text-ink-100"
            }`}>
              <h3 className="font-bold text-base mb-4 uppercase tracking-wider">Leave a Review</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold opacity-60 mb-2">Rating</label>
                  <div className="flex items-center gap-2">
                    {renderStarRating(newRating, true, setNewRating)}
                    <span className="text-xs font-bold font-mono">({newRating}/5)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold opacity-60 mb-1">Comment</label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write your comment about this mix..."
                    className={`w-full text-sm p-3 rounded-xl outline-none transition-colors border ${
                      morphism === "neobrutalism"
                        ? "border-2 border-black bg-[#faf8f5] text-black focus:bg-white"
                        : "border-white/[0.08] bg-white/[0.04] text-white focus:border-sage-400"
                    } h-24 resize-none`}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`w-full py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-2 border-black ${
                    morphism === "neobrutalism"
                      ? "bg-[#ffde4b] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                      : "bg-sage-400 text-black border-sage-400 hover:bg-sage-300"
                  } disabled:opacity-50`}
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            </div>

            {/* Reviews list */}
            <div className="md:col-span-2 space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {reviews.length > 0 ? (
                reviews.map((review) => {
                  const hoursLeft = getDeleteWindowHours(review);
                  return (
                  <div 
                    key={review.id}
                    className={`p-4 rounded-xl border transition-all ${
                      morphism === "neobrutalism"
                        ? "border-2 border-black bg-white text-black"
                        : "border-white/[0.05] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {review.user_photo ? (
                          <img
                            src={review.user_photo}
                            alt={review.user_name}
                            className={`w-8 h-8 rounded-full object-cover shrink-0 ${
                              morphism === "neobrutalism" ? "border border-black" : ""
                            }`}
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            morphism === "neobrutalism" ? "bg-neutral-100 border border-black" : "bg-white/[0.05]"
                          }`}>
                            {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center">
                            <Link to={`/user/${review.user_id}`} className="text-sm font-bold hover:underline hover:text-sage-400 transition-colors">
                              {review.user_name || 'Auralis Listener'}
                            </Link>
                            {(() => {
                              const badgeType = review.verified_badge;
                              if (!badgeType) return null;
                              const label = badgeType === "owner" ? "owner" : badgeType === "admin" ? "admin" : badgeType === "artist" ? "artist" : "Artist ac";
                              if (morphism === "neobrutalism") {
                                const styles = 
                                  badgeType === "owner"
                                    ? "bg-[#ffde4b] text-black border border-black font-black"
                                    : badgeType === "admin"
                                    ? "bg-[#ff5c5c] text-black border border-black font-black"
                                    : badgeType === "artist"
                                    ? "bg-[#5cb2ff] text-black border border-black font-black"
                                    : "bg-white text-black border border-black font-medium";
                                return (
                                  <span className={`inline-flex items-center gap-0.5 px-1 py-[1px] text-[8px] uppercase tracking-wider rounded ${styles} ml-1.5 shrink-0 shadow-[1px_1px_0px_rgba(0,0,0,1)]`}>
                                    {label}
                                  </span>
                                );
                              } else {
                                const styles = 
                                  badgeType === "owner"
                                    ? "bg-amber-400/10 border border-amber-400/20 text-amber-400"
                                    : badgeType === "admin"
                                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                    : badgeType === "artist"
                                    ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                                    : "bg-white/5 border border-white/10 text-ink-300";
                                return (
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wider rounded-full border ${styles} ml-1.5 shrink-0`}>
                                    {label}
                                  </span>
                                );
                              }
                            })()}
                          </div>
                          <span className="text-[10px] opacity-40">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {renderStarRating(review.rating)}
                        {hoursLeft !== null && (
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            title={`Remove review (${hoursLeft}h left)`}
                            className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide transition-all px-2 py-1 ${
                              morphism === "neobrutalism"
                                ? "border border-black bg-red-100 text-red-700 hover:bg-red-200"
                                : "rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            }`}
                          >
                            <Trash2 className="h-3 w-3" />
                            {hoursLeft}h left
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80 break-words pl-10">{review.comment}</p>
                  </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-white/[0.1] rounded-2xl text-center p-6">
                  <MessageSquare className="h-8 w-8 text-ink-500 mb-2" />
                  <h4 className="text-sm font-bold">No reviews yet</h4>
                  <p className="text-xs text-ink-500 mt-1">Be the first to rate and comment on this public playlist!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Playlist Modal */}
      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => !isUploading && setIsEditModalOpen(false)} />
          {morphism === "neobrutalism" ? (
            <div className="ladybug-card relative w-full max-w-md my-auto animate-in zoom-in-95 duration-200">
              <div className="ladybug-head">
                <span>Edit Playlist</span>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-black cursor-pointer" onClick={() => setIsEditModalOpen(false)}></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-black"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-black"></span>
                </div>
              </div>
              <div className="ladybug-content">
                <form onSubmit={handleSavePlaylist} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-widest text-black/40 mb-1">Playlist Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs font-bold text-black border-3 border-black bg-[#faf8f5] p-2.5 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-widest text-black/40 mb-1">Description (Bio - Optional)</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add a bio for your custom mix..."
                      className="w-full text-xs font-medium text-black border-3 border-black bg-[#faf8f5] p-2.5 rounded-lg focus:outline-none h-16 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-widest text-black/40 mb-1">Cover Image (URL or Local File)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editCoverUrl}
                        onChange={(e) => setEditCoverUrl(e.target.value)}
                        placeholder="https://example.com/cover.jpg"
                        className="flex-1 text-xs font-bold text-black border-3 border-black bg-[#faf8f5] p-2.5 rounded-lg focus:outline-none"
                      />
                      <label className="ladybug-button !m-0 flex items-center justify-center text-center cursor-pointer select-none">
                        {isUploading ? "..." : "Upload"}
                        <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="editIsPublic"
                      checked={editIsPublic}
                      onChange={(e) => setEditIsPublic(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#ffde4b] border-2 border-black"
                    />
                    <label htmlFor="editIsPublic" className="text-xs font-black cursor-pointer select-none">
                      Make Playlist Public
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="ladybug-button !bg-[#ffbd2e]">
                      Cancel
                    </button>
                    <button type="submit" className="ladybug-button !bg-[#4ade80]">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="upload-modal-content relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-ink-950/95 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200 p-6 flex flex-col">
              <h2 className="text-xl font-bold text-white mb-4 text-left">Edit Playlist</h2>
              <form onSubmit={handleSavePlaylist} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Playlist Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-ink-500 outline-none focus:border-sage-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Description (Bio - Optional)</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add an optional bio for this playlist..."
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-ink-500 outline-none focus:border-sage-400 h-20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Cover Image (URL or Local File)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editCoverUrl}
                      onChange={(e) => setEditCoverUrl(e.target.value)}
                      placeholder="https://example.com/cover.jpg"
                      className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-ink-500 outline-none focus:border-sage-400"
                    />
                    <label className="flex h-[38px] cursor-pointer items-center justify-center rounded-xl bg-white/[0.08] px-4 text-xs font-bold text-white hover:bg-white/[0.12] transition-colors">
                      {isUploading ? "..." : "Upload File"}
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="editIsPublic"
                    checked={editIsPublic}
                    onChange={(e) => setEditIsPublic(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-sage-400"
                  />
                  <label htmlFor="editIsPublic" className="text-xs font-semibold text-white/70 cursor-pointer select-none">
                    Make Playlist Public
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-full bg-white/[0.06] px-5 py-2 text-xs font-bold text-white hover:bg-white/[0.1] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-full bg-sage-400 px-5 py-2 text-xs font-bold text-ink-950 hover:bg-sage-300 transition-colors">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsDeleteModalOpen(false)} />
          {morphism === "neobrutalism" ? (
            <div className="ladybug-card relative w-full max-w-sm my-auto animate-in zoom-in-95 duration-200">
              <div className="ladybug-head">
                <span>Confirm Action</span>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-black cursor-pointer" onClick={() => setIsDeleteModalOpen(false)}></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-black"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-black"></span>
                </div>
              </div>
              <div className="ladybug-content">
                <div className="font-extrabold uppercase tracking-widest text-[9px] text-black/40 mb-1">Delete Playlist</div>
                <div className="font-bold text-black text-[13px] leading-relaxed mb-4">
                  Are you sure you want to delete the playlist "{playlist.name}"? This action cannot be undone.
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="ladybug-button !bg-[#ffbd2e]">
                    Cancel
                  </button>
                  <button onClick={handleConfirmDeletePlaylist} className="ladybug-button !bg-[#ff5f56]">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="upload-modal-content relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-ink-950/95 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200 p-6 flex flex-col">
              <h2 className="text-xl font-bold text-white mb-2 text-left">Delete Playlist</h2>
              <p className="text-sm text-white/60 mb-6 text-left font-medium">
                Are you sure you want to delete the playlist "{playlist.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="rounded-full bg-white/[0.06] px-5 py-2 text-xs font-bold text-white hover:bg-white/[0.1] transition-colors">
                  Cancel
                </button>
                <button onClick={handleConfirmDeletePlaylist} className="rounded-full bg-red-500/80 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
