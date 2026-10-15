import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, ArrowUp, Sparkles } from "lucide-react";
import { IconUser } from "@tabler/icons-react";
import { usePlayer } from "../../context/PlayerContext";

export function ListeningPartyModal({ isOpen, onClose }) {
  const [partyRoomInput, setPartyRoomInput] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [votes, setVotes] = useState({});

  const {
    partyRoomCode: contextPartyRoomCode,
    setPartyRoomCode: setContextPartyRoomCode,
    socketRef,
    user,
    showAlert
  } = usePlayer();

  // Fetch Recommended Tracks to show for voting when joining a room
  useEffect(() => {
    if (!isOpen || !contextPartyRoomCode) return;
    
    fetch('/api/recommendations/modules?hype=50&discovery=50', {
      headers: {
        'x-user-id': user?.uid || 'guest'
      }
    })
      .then(res => res.json())
      .then(data => {
        const tracks = data.recommended_for_you || data.trending_songs || [];
        setRecommendations(tracks.slice(0, 5));
      })
      .catch(err => console.error("Failed fetching party recommendations:", err));
  }, [isOpen, contextPartyRoomCode, user?.uid]);

  // Bind socket listeners for real-time room vote updates
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !contextPartyRoomCode) return;

    socket.on('update_votes', (updatedVotes) => {
      setVotes(updatedVotes || {});
    });

    return () => {
      socket.off('update_votes');
    };
  }, [contextPartyRoomCode, socketRef, isOpen]);

  const handleVote = (trackId) => {
    const socket = socketRef?.current;
    if (!socket || !contextPartyRoomCode) return;
    
    socket.emit('vote_track', { 
      roomCode: contextPartyRoomCode, 
      trackId, 
      voteChange: 1 
    });
  };

  const handleJoin = (e) => {
    e?.preventDefault();
    if (!partyRoomInput.trim()) return;
    const code = partyRoomInput.trim().toUpperCase();
    setContextPartyRoomCode(code);
    localStorage.setItem('aura_party_room_code', code);
    setPartyRoomInput("");
    showAlert(`Joined Listening Party Room: ${code}`);
    onClose();
  };

  const handleCreate = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setContextPartyRoomCode(randomCode);
    localStorage.setItem('aura_party_room_code', randomCode);
    showAlert(`Created Listening Party Room: ${randomCode}`);
    onClose();
  };

  const handleLeave = () => {
    setContextPartyRoomCode("");
    localStorage.removeItem('aura_party_room_code');
    showAlert(`Left Listening Party Room`);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contextPartyRoomCode);
    showAlert(`Copied Invite Code: ${contextPartyRoomCode}`);
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-sm rounded-3xl border border-white/[0.1] bg-ink-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-4 text-sage-400">
            <Users className="h-10 w-10 animate-pulse" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-white text-center mb-2">Listening Party Room</h3>
          
          {contextPartyRoomCode ? (
            <div>
              <p className="text-xs text-white/40 text-center mb-1">Active Room Code</p>
              <div className="flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3 px-4 mb-6">
                <span className="text-2xl font-extrabold text-sage-400 tracking-wider font-mono">
                  {contextPartyRoomCode}
                </span>
                <button 
                  onClick={handleCopy}
                  className="text-xs font-bold text-white/50 hover:text-white bg-white/10 px-3 py-1 rounded-lg transition"
                >
                  Copy
                </button>
              </div>

              <div className="mb-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-3 text-center text-xs text-white/50">
                <p className="font-semibold text-white/70 mb-2">Connected Members</p>
                <div className="flex flex-col gap-2 max-h-24 overflow-y-auto">
                  <div className="flex items-center justify-between text-white/90">
                    <span className="flex items-center gap-2">
                      <IconUser className="h-4 w-4 text-sage-400" strokeWidth={1.8} />
                      <span>{localStorage.getItem('aura_device_nickname') || 'You (Host)'}</span>
                    </span>
                    <span className="text-[10px] text-sage-400 font-bold uppercase tracking-wider">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-white/35">
                    <span className="flex items-center gap-2">
                      <IconUser className="h-4 w-4 text-white/35" strokeWidth={1.8} />
                      <span>Listening Peer 1</span>
                    </span>
                    <span className="text-[10px]">Synced</span>
                  </div>
                </div>
              </div>

              {/* Party DJ Voting Queue */}
              <div className="mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-3 text-xs text-white/50">
                <div className="flex items-center gap-1.5 font-semibold text-white/70 mb-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-sage-400" />
                  <span>Upvote Recommended Songs</span>
                </div>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                  {recommendations.length > 0 ? (
                    recommendations.map(track => {
                      const count = votes[track.id] || 0;
                      return (
                        <div key={track.id} className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] p-2 rounded-xl border border-white/[0.03] transition">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-white/90 font-medium truncate">{track.title}</span>
                            <span className="text-[10px] text-white/40 truncate">{track.artist}</span>
                          </div>
                          <button 
                            onClick={() => handleVote(track.id)}
                            className="flex items-center gap-1.5 bg-sage-400 text-ink-950 font-bold px-2.5 py-1 rounded-lg hover:bg-sage-500 transition active:scale-95 shrink-0"
                          >
                            <ArrowUp className="h-3 w-3" strokeWidth={3} />
                            <span>{count}</span>
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-white/20 py-2 italic">Loading recommendations...</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleLeave}
                  className="w-full rounded-2xl bg-red-500/20 text-red-400 py-3 text-sm font-bold hover:bg-red-500/35 transition active:scale-[0.98]"
                >
                  Leave Room
                </button>
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white/60 hover:text-white transition active:scale-[0.98]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div>
              <form onSubmit={handleJoin} className="mb-4">
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Join Room Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={partyRoomInput}
                    onChange={(e) => setPartyRoomInput(e.target.value)}
                    placeholder="e.g. PARTY-X82Y"
                    className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-sage-400 uppercase tracking-widest font-mono"
                  />
                  <button 
                    type="submit" 
                    className="bg-white text-black font-bold text-sm px-6 rounded-2xl hover:bg-white/90 active:scale-95 transition"
                  >
                    Join
                  </button>
                </div>
              </form>

              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-white/[0.08]" />
                <span className="flex-shrink mx-4 text-white/20 text-xs font-semibold uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-white/[0.08]" />
              </div>

              <button
                onClick={handleCreate}
                className="w-full rounded-2xl bg-sage-400 text-ink-950 py-3.5 text-sm font-bold hover:bg-sage-500 transition active:scale-[0.98] mb-2"
              >
                Create New Room
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white/60 hover:text-white transition active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
