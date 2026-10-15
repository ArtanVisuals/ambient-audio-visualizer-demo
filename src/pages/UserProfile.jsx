import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ListMusic, User, Check, Edit2, Play, MoreHorizontal, ShieldAlert, Award, Radio, Trash2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { SonoraEmptyState } from "../components/SonoraEmptyState";

export function UserProfile() {
  const { id } = useParams();
  const { user: currentUser, morphism, playContext, openTrackMenu, currentTrack, isPlaying, showAlert, showConfirm, syncDeviceSession } = usePlayer();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bio Editing State
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Admin Badge Management State
  const [selectedBadge, setSelectedBadge] = useState("");
  const [updatingBadge, setUpdatingBadge] = useState(false);

  // Current viewer's role
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${id}/profile`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "User not found" : "Failed to load user profile");
      }
      const data = await res.json();
      setProfile(data);
      setBioInput(data.user?.bio || "");
      setSelectedBadge(data.user?.verified_badge || "");
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserRole = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.uid}/profile`);
      if (res.ok) {
        const data = await res.json();
        setCurrentUserRole(data.user?.verified_badge || null);
      }
    } catch (err) {
      console.error("Error fetching current user role:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  useEffect(() => {
    fetchCurrentUserRole();
  }, [currentUser]);

  const handleSaveBio = async () => {
    if (!currentUser) return;
    setSavingBio(true);
    try {
      const res = await fetch(`/api/users/${id}/bio`, {
        method: "PUT",
        headers: {
          "x-user-id": currentUser.uid,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: bioInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({
          ...prev,
          user: { ...prev.user, bio: data.bio },
        }));
        setIsEditingBio(false);
      } else {
        const err = await res.json();
        showAlert(err.error || "Failed to save bio.");
      }
    } catch (err) {
      showAlert("Network error. Failed to save bio.");
    } finally {
      setSavingBio(false);
    }
  };

  const handleUpdateBadge = async (badgeValue) => {
    if (!currentUser) return;
    setUpdatingBadge(true);
    try {
      const res = await fetch(`/api/users/${id}/badge`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.uid,
        },
        body: JSON.stringify({ badge: badgeValue || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({
          ...prev,
          user: { ...prev.user, verified_badge: data.badge },
        }));
        setSelectedBadge(data.badge || "");
        showAlert(`Successfully updated verification badge.`);
      } else {
        const err = await res.json();
        showAlert(err.error || "Failed to update badge.");
      }
    } catch (err) {
      showAlert("Network error. Failed to update badge.");
    } finally {
      setUpdatingBadge(false);
    }
  };

  const handleDeleteArtistProfile = () => {
    showConfirm(
      "Delete Artist Profile",
      "Are you sure you want to delete your artist profile? This will remove your artist badge, permanently delete all your uploaded songs from the library, and reset your custom name/avatar details.",
      async () => {
        try {
          const res = await fetch(`/api/users/${user.id}/artist-profile`, {
            method: "DELETE",
            headers: {
              "x-user-id": currentUser.uid,
            }
          });
          if (res.ok) {
            showAlert("Artist profile deleted successfully.");
            if (syncDeviceSession) {
              await syncDeviceSession();
            }
            fetchProfile();
          } else {
            const err = await res.json();
            showAlert(err.error || "Failed to delete artist profile.");
          }
        } catch (err) {
          showAlert("Network error. Failed to delete artist profile.");
        }
      }
    );
  };

  const handleDeleteTrack = (trackId, trackTitle) => {
    showConfirm(
      "Delete Released Song",
      `Are you sure you want to permanently delete "${trackTitle}" from the library?`,
      async () => {
        try {
          const res = await fetch(`/api/tracks/${trackId}`, {
            method: "DELETE",
            headers: {
              "x-user-id": currentUser.uid,
            }
          });
          if (res.ok) {
            showAlert(`Successfully deleted "${trackTitle}".`);
            fetchProfile();
          } else {
            const err = await res.json();
            showAlert(err.error || "Failed to delete track.");
          }
        } catch (err) {
          showAlert("Network error. Failed to delete track.");
        }
      }
    );
  };

  const handleTrackClick = (track, list, idx) => {
    const listWithKeys = list.map((t, index) => ({
      ...t,
      uniqueKey: `user-profile-release-${t.id}-${index}`,
    }));
    playContext(listWithKeys, idx);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-sage-400 border-white/10" />
        <p className="mt-4 text-sm text-ink-500">Retrieving profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <SonoraEmptyState
        title="Profile unavailable"
        description={error}
        screenText="ERROR"
        defaultView={
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-ink-100">Profile unavailable</h3>
            <p className="mt-2 text-ink-500">{error}</p>
            <Link to="/home" className="mt-6 rounded-full bg-white/5 border border-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-white/10 transition">
              Go Home
            </Link>
          </div>
        }
      />
    );
  }

  const { user, playlists, releasedTracks } = profile;
  const isOwnProfile = currentUser && currentUser.uid === user.id;
  const isAdminOrOwner = currentUserRole === "owner" || currentUserRole === "admin";

  // Calculate total plays/views of released tracks
  const totalViews = releasedTracks.reduce((acc, t) => acc + (t.views || 0), 0);

  // Badge Styling mapping
  const renderBadge = (badgeType) => {
    if (!badgeType) return null;
    
    const label = badgeType === "owner" ? "owner" : badgeType === "admin" ? "admin" : badgeType === "artist" ? "artist" : "Artist ac";
    const isUnverifiedArtist = badgeType === "artist_unverified";
    
    if (morphism === "neobrutalism") {
      const styles = 
        badgeType === "owner"
          ? "bg-[#ffde4b] text-black border-2 border-black font-black"
          : badgeType === "admin"
          ? "bg-[#ff5c5c] text-black border-2 border-black font-black"
          : badgeType === "artist"
          ? "bg-[#5cb2ff] text-black border-2 border-black font-black"
          : "bg-white text-black border-2 border-black font-medium";
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded ${styles} ml-2 shrink-0 shadow-[1px_1px_0px_rgba(0,0,0,1)]`}>
          {!isUnverifiedArtist && <Check className="h-3 w-3 stroke-[3]" />}
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
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${styles} ml-2 shrink-0`}>
          {!isUnverifiedArtist && <Award className="h-3 w-3" />}
          {label}
        </span>
      );
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8 pb-12">
      {/* Profile Header Block */}
      <div className={`relative overflow-hidden rounded-3xl border p-6 md:p-8 ${
        morphism === "neobrutalism"
          ? "border-3 border-black bg-white text-black shadow-[6px_6px_0px_rgba(0,0,0,1)]"
          : "border-white/[0.08] bg-white/[0.02] backdrop-blur-xl text-ink-100"
      }`}>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
          {/* Avatar container */}
          {user.photo ? (
            <img
              src={user.photo}
              alt={user.name}
              className={`h-24 w-24 md:h-32 md:w-32 rounded-full object-cover shrink-0 ${
                morphism === "neobrutalism" ? "border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]" : "border-2 border-white/10"
              }`}
            />
          ) : (
            <div className={`flex h-24 w-24 md:h-32 md:w-32 items-center justify-center rounded-full font-black text-4xl shrink-0 ${
              morphism === "neobrutalism" ? "bg-neutral-100 text-black border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]" : "bg-white/[0.05] text-ink-300 border border-white/10"
            }`}>
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}

          {/* User Details */}
          <div className="flex-1 text-center md:text-left min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight truncate max-w-full">
                {user.name || "Auralis Listener"}
              </h1>
              {renderBadge(user.verified_badge)}
            </div>

            <p className={`text-xs font-mono font-medium ${morphism === "neobrutalism" ? "text-neutral-700" : "text-ink-500"}`}>
              User ID: {user.custom_id || user.id}
            </p>

            {/* Bio section */}
            <div className="pt-2">
              {isEditingBio ? (
                <div className="max-w-xl space-y-3">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Tell the world about yourself..."
                    maxLength={300}
                    rows={3}
                    className={`w-full text-sm rounded-xl p-3 outline-none transition-all ${
                      morphism === "neobrutalism"
                        ? "border-2 border-black bg-white text-black"
                        : "border-white/10 bg-white/[0.04] text-ink-100 focus:border-sage-400"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${
                        morphism === "neobrutalism"
                          ? "border-2 border-black bg-[#ffde4b] text-black hover:bg-[#ebd045] shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                          : "bg-sage-400 text-ink-950 hover:bg-sage-300"
                      }`}
                    >
                      {savingBio ? "Saving..." : "Save Bio"}
                    </button>
                    <button
                      onClick={() => {
                        setBioInput(user.bio || "");
                        setIsEditingBio(false);
                      }}
                      className="px-4 py-1.5 text-xs font-medium opacity-60 hover:opacity-100 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group relative max-w-xl inline-block">
                  {user.bio ? (
                    <p className={`text-sm leading-relaxed ${morphism === "neobrutalism" ? "text-neutral-800" : "text-ink-400"}`}>
                      {user.bio}
                    </p>
                  ) : (
                    isOwnProfile && (
                      <p className="text-sm italic opacity-40">Add a bio to tell others about yourself...</p>
                    )
                  )}

                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className={`inline-flex items-center gap-1.5 mt-2 text-xs font-semibold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${
                        morphism === "neobrutalism" ? "text-neutral-900 hover:underline" : "text-sage-400 hover:text-sage-300"
                      }`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      {user.bio ? "Edit Bio" : "Add Bio"}
                    </button>
                  )}
                </div>
              )}
            </div>
            {isOwnProfile && (user.verified_badge === "artist" || user.verified_badge === "artist_unverified") && (
              <div className="pt-4">
                <button
                  onClick={handleDeleteArtistProfile}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition duration-200 ${
                    morphism === "neobrutalism"
                      ? "border-2 border-black bg-[#ff5c5c] text-black hover:bg-[#e04f4f] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] cursor-pointer"
                      : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition cursor-pointer"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Artist Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Admin Badge Assignment Control (Only shown to owners/admins viewing someone else's profile) */}
        {isAdminOrOwner && !isOwnProfile && (
          <div className={`mt-6 border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 ${
            morphism === "neobrutalism" ? "border-black" : "border-white/[0.08]"
          }`}>
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
              <div className="text-left">
                <h4 className="text-xs font-black uppercase tracking-wider">Verification Controls</h4>
                <p className="text-[10px] opacity-60">As an administrator, you can toggle badges for this user.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={selectedBadge}
                onChange={(e) => handleUpdateBadge(e.target.value)}
                disabled={updatingBadge}
                className={`text-xs rounded-xl px-3 py-2 outline-none w-full md:w-44 ${
                  morphism === "neobrutalism"
                    ? "border-2 border-black bg-white text-black font-bold"
                    : "border-white/10 bg-white/[0.04] text-ink-100 focus:border-sage-400"
                }`}
              >
                <option value="">No Badge</option>
                <option value="artist">Verified Artist (Blue)</option>
                <option value="admin">Administrator (Red)</option>
                <option value="owner">System Owner (Gold)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Released Tracks Showcase */}
      {releasedTracks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold uppercase tracking-wider flex items-center gap-2.5 ${
              morphism === "neobrutalism" ? "text-black" : "text-ink-100"
            }`}>
              <Radio className="h-5 w-5 opacity-70" />
              Releases
            </h2>
            <span className="text-xs opacity-60 font-semibold">{releasedTracks.length} song{releasedTracks.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-2">
            {releasedTracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => handleTrackClick(track, releasedTracks, idx)}
                  onContextMenu={(e) => { e.preventDefault(); openTrackMenu(track, e.clientX, e.clientY); }}
                  className={`group relative flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
                    isActive 
                      ? 'bg-white/[0.05]' 
                      : morphism === "neobrutalism" 
                        ? 'hover:bg-black/[0.05] border border-black/5' 
                        : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={track.cover} alt={track.title} className="h-12 w-12 rounded-lg object-cover" />
                    {!isActive && (
                      <Play className="absolute inset-0 m-auto hidden h-5 w-5 text-white group-hover:block drop-shadow-lg" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${
                      isActive ? 'text-sage-400' : morphism === "neobrutalism" ? 'text-black' : 'text-ink-100'
                    }`}>{track.title}</p>
                    <p className={`truncate text-xs ${morphism === "neobrutalism" ? 'text-neutral-600' : 'text-ink-500'}`}>{track.artist}</p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-[10px] block font-bold uppercase tracking-wider opacity-40`}>Plays</span>
                      <span className={`text-xs font-mono font-bold ${morphism === "neobrutalism" ? "text-black" : "text-ink-200"}`}>
                        {(track.views || 0).toLocaleString()}
                      </span>
                    </div>
                    
                    <span className={`text-xs ${morphism === "neobrutalism" ? 'text-neutral-600' : 'text-ink-500'}`}>{track.duration}</span>
                  </div>

                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openTrackMenu(track, e.clientX, e.clientY);
                    }}
                    className="ml-2 flex items-center justify-center text-ink-500 transition-colors hover:text-ink-100"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>

                  {isOwnProfile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrack(track.id, track.title);
                      }}
                      className={`ml-2 flex items-center justify-center p-1.5 rounded-lg transition ${
                        morphism === "neobrutalism"
                          ? "border border-black bg-red-100 hover:bg-red-200 text-red-600 shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none cursor-pointer"
                          : "text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 cursor-pointer"
                      }`}
                      title="Delete Track"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Public Playlists Grid */}
      <div className="space-y-4">
        <h2 className={`text-xl font-bold uppercase tracking-wider flex items-center gap-2.5 ${
          morphism === "neobrutalism" ? "text-black" : "text-ink-100"
        }`}>
          <ListMusic className="h-5 w-5 opacity-70" />
          Public Mixes
        </h2>

        {playlists.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <Link
                key={playlist.id}
                to={`/playlists/${playlist.id}`}
                className={`group flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 ${
                  morphism === "neobrutalism"
                    ? "border-2 border-black bg-white text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
                    : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] text-ink-100"
                }`}
              >
                {playlist.cover ? (
                  <img
                    src={playlist.cover}
                    alt={playlist.name}
                    className={`h-16 w-16 shrink-0 rounded-lg object-cover ${
                      morphism === "neobrutalism" ? "border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]" : ""
                    }`}
                  />
                ) : (
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg ${
                    morphism === "neobrutalism" ? "bg-neutral-100 text-black border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]" : "bg-white/[0.05] text-ink-300"
                  }`}>
                    <ListMusic className="h-8 w-8" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-bold text-sm">{playlist.name}</h4>
                  <p className="mt-1 text-[10px] opacity-80">{playlist.trackCount || 0} songs • {playlist.saveCount || 0} saves</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <SonoraEmptyState
            title="No public mixes yet"
            description="Mixes will appear here once they are created and set to public."
            screenText="NO MIXES"
            defaultView={
              <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-20 text-center animate-in fade-in duration-500">
                <p className="text-lg font-medium text-ink-300">No public mixes yet</p>
                <p className="mt-2 text-sm text-ink-500">Mixes will appear here once they are created and set to public.</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
