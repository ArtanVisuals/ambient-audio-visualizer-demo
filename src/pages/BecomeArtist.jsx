import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Music, Shield, ArrowRight, ArrowLeft, Upload, FileText, CheckCircle2, User, Mail, Film, AlertCircle } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export function BecomeArtist() {
  const { user, morphism, showAlert } = usePlayer();
  const navigate = useNavigate();

  // Application checking
  const [appStatus, setAppStatus] = useState("loading"); // 'loading', 'none', 'pending', 'approved', 'rejected'
  const [existingApp, setExistingApp] = useState(null);

  // Step state
  const [step, setStep] = useState(1); // 1: Profile, 2: Music, 3: Terms

  // Form State
  const [artistName, setArtistName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pfpFile, setPfpFile] = useState(null);
  const [pfpPreview, setPfpPreview] = useState(null);

  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [songDuration, setSongDuration] = useState("3:30");

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setArtistName(user.name || "");
      setContactEmail(user.email || "");
      fetchApplicationStatus();
    }
  }, [user]);

  const fetchApplicationStatus = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`/api/users/become-artist/status/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setAppStatus(data.status || "none");
        setExistingApp(data);
      } else {
        setAppStatus("none");
      }
    } catch (err) {
      console.error(err);
      setAppStatus("none");
    }
  };

  const handlePfpChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPfpFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPfpPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audio.addEventListener("loadedmetadata", () => {
        const seconds = Math.floor(audio.duration);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
        setSongDuration(formatted);
        console.log("Extracted audio duration:", formatted);
      });
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!agreedToTerms) {
      showAlert("You must agree to the promotional terms to submit.");
      return;
    }
    if (!audioFile || !coverFile) {
      showAlert("Please upload both a cover image and audio track.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("userId", user.uid);
    formData.append("artistName", artistName);
    formData.append("email", contactEmail);
    formData.append("songTitle", songTitle);
    formData.append("songArtist", songArtist);
    formData.append("lyrics", lyrics);
    formData.append("duration", songDuration);

    if (pfpFile) formData.append("pfp", pfpFile);
    if (coverFile) formData.append("cover", coverFile);
    if (audioFile) formData.append("audio", audioFile);
    if (videoFile) formData.append("video", videoFile);

    try {
      const res = await fetch("/api/users/become-artist/apply", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchApplicationStatus();
      } else {
        const err = await res.json();
        showAlert(err.error || "Failed to submit artist application.");
      }
    } catch (err) {
      showAlert("Network error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormAndReapply = () => {
    setStep(1);
    setArtistName(user.name || "");
    setContactEmail(user.email || "");
    setPfpFile(null);
    setPfpPreview(null);
    setSongTitle("");
    setSongArtist("");
    setLyrics("");
    setCoverFile(null);
    setCoverPreview(null);
    setAudioFile(null);
    setVideoFile(null);
    setAgreedToTerms(false);
    setAppStatus("none");
  };

  // Neobrutalism vs Glassmorphism Cards
  const isBrutalist = morphism === "neobrutalism";
  const cardStyle = isBrutalist
    ? "border-2 border-black bg-white text-black shadow-[4px_4px_0px_#000] p-8 rounded-none"
    : "border border-white/10 bg-white/5 backdrop-blur-xl p-8 rounded-3xl text-white shadow-2xl";

  const buttonPrimary = isBrutalist
    ? "border-2 border-black bg-[#5cb2ff] text-black font-black uppercase tracking-wider px-6 py-3 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
    : "bg-emerald-500 hover:bg-emerald-600 text-ink-950 font-bold px-6 py-3 rounded-2xl shadow-lg transition active:scale-[0.98]";

  const buttonSecondary = isBrutalist
    ? "border-2 border-black bg-white text-black font-black uppercase tracking-wider px-6 py-3 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
    : "bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-2xl transition active:scale-[0.98]";

  const inputStyle = isBrutalist
    ? "border-2 border-black bg-white text-black px-4 py-3 outline-none focus:bg-amber-100 rounded-none w-full"
    : "border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-white outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all w-full";

  if (appStatus === "loading") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-xs text-ink-500 font-medium">Verifying artist application status...</p>
      </div>
    );
  }

  // Under review (pending) screen
  if (appStatus === "pending") {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-300">
        <div className={cardStyle}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto mb-6">
            <Shield className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Application Under Review</h2>
          <p className="text-sm text-center text-ink-400 max-w-md mx-auto mb-8">
            Your application is being processed by our administrative team. We will review your profile modifications and verify your uploaded track shortly.
          </p>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
              <span className="text-ink-500 font-semibold uppercase">Requested Name:</span>
              <span className="font-bold text-ink-200">{existingApp?.artist_name}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
              <span className="text-ink-500 font-semibold uppercase">Contact Email:</span>
              <span className="font-bold text-ink-200">{existingApp?.email}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-500 font-semibold uppercase">Pending Song:</span>
              <span className="font-bold text-ink-200">{existingApp?.song_title} by {existingApp?.song_artist}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 mb-8 text-left">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>
              Please verify updates via your contact email <strong>{existingApp?.email}</strong>. Once approved, your account will instantly receive the verified badge and release badge.
            </p>
          </div>

          <button onClick={() => navigate("/library")} className="w-full rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 py-3.5 text-xs font-bold uppercase tracking-wider text-ink-200 transition">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // Approved screen
  if (appStatus === "approved") {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-300">
        <div className={cardStyle}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Artist Profile Active!</h2>
          <p className="text-sm text-center text-ink-400 max-w-md mx-auto mb-8">
            Your verification has been confirmed! You now have a verified Artist badge and your music has been published to the main page library.
          </p>

          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate(`/user/${user?.uid}`)} className={buttonPrimary}>
              Go to Profile
            </button>
            <button onClick={() => navigate("/home")} className={buttonSecondary}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rejected screen
  if (appStatus === "rejected") {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-300">
        <div className={cardStyle}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mx-auto mb-6">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Application Unsuccessful</h2>
          <p className="text-sm text-center text-ink-400 max-w-md mx-auto mb-8">
            We were unable to approve your application at this time. Please ensure you are uploading high-quality original audio tracks and correct contact information.
          </p>

          <div className="flex gap-4 justify-center">
            <button onClick={resetFormAndReapply} className={buttonPrimary}>
              Reapply Now
            </button>
            <button onClick={() => navigate("/library")} className={buttonSecondary}>
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header and Step Indicators */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            Claim Artist Account
          </h1>
          <p className="text-xs text-ink-500 mt-1">Submit your original work to unlock artist verification badges.</p>
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
          Step {step} of 3
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-8">
        <div 
          className="bg-emerald-400 h-full transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className={cardStyle}>
        
        {/* STEP 1: PROFILE CREATION */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-400" />
                Configure Artist Profile
              </h2>
              <p className="text-xs text-ink-500 mt-1">Set the public name, email, and photo that visitors will see.</p>
            </div>

            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative">
                <img 
                  src={pfpPreview || user?.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                  alt="avatar preview" 
                  className="h-24 w-24 rounded-full border-2 border-emerald-500/40 object-cover"
                />
                <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-ink-950 shadow transition active:scale-[0.9]">
                  <Upload className="h-4 w-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePfpChange} 
                    className="hidden" 
                  />
                </label>
              </div>
              <span className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">Change profile picture (Optional)</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-300 block">Artist / Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. DJ Sonora"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-300 block">Contact Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. artist@sonora.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={inputStyle}
                />
                <span className="text-[10px] text-ink-600 block">We will use this address to contact you regarding review updates.</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button 
                onClick={() => {
                  if (!artistName.trim() || !contactEmail.trim()) {
                    showAlert("Please fill in your artist name and contact email.");
                    return;
                  }
                  setSongArtist(artistName); // Pre-fill song artist
                  setStep(2);
                }}
                className={`${buttonPrimary} flex items-center gap-1`}
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SONG UPLOAD */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Music className="h-5 w-5 text-emerald-400" />
                Upload Original Song
              </h2>
              <p className="text-xs text-ink-500 mt-1">To verify your status, upload one of your songs from your local storage.</p>
            </div>

            {/* Song cover image upload preview */}
            <div className="flex flex-col sm:flex-row gap-6 items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
              <div className="relative h-24 w-24 shrink-0 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden group">
                {coverPreview ? (
                  <img src={coverPreview} alt="cover preview" className="h-full w-full object-cover" />
                ) : (
                  <Music className="h-8 w-8 text-ink-500" />
                )}
                <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-[9px] font-bold text-white uppercase tracking-wider">
                  <Upload className="h-4 w-4 mb-1" />
                  Upload
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCoverChange} 
                    className="hidden" 
                  />
                </label>
              </div>
              <div className="flex-1 w-full text-center sm:text-left">
                <p className="text-sm font-semibold">Song Cover Art</p>
                <p className="text-xs text-ink-500 mt-1">Upload a high-quality square JPG/PNG cover file.</p>
                {!coverPreview && (
                  <span className="text-[10px] text-red-400 font-bold block mt-1">* Cover image required</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-300 block">Song Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Midnight Waves"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-300 block">Song Artist Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. DJ Sonora"
                    value={songArtist}
                    onChange={(e) => setSongArtist(e.target.value)}
                    className={inputStyle}
                  />
                </div>
              </div>

              {/* Lyrics input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-300 block">Lyrics (Optional)</label>
                <textarea 
                  placeholder="Enter song lyrics here..."
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows="4"
                  className={`${inputStyle} resize-none`}
                />
              </div>

              {/* Audio and Video File Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-300 block">Audio File (MP3/WAV)*</label>
                  <div className="relative border border-white/10 bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.08] transition">
                    <span className="text-xs text-ink-400 truncate max-w-[150px]">
                      {audioFile ? audioFile.name : "Select Audio File"}
                    </span>
                    <Upload className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                    <input 
                      type="file" 
                      required
                      accept="audio/*" 
                      onChange={handleAudioChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink-300 block">Video File (MP4/MKV - Optional)</label>
                  <div className="relative border border-white/10 bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.08] transition">
                    <span className="text-xs text-ink-400 truncate max-w-[150px]">
                      {videoFile ? videoFile.name : "Select Video File"}
                    </span>
                    <Film className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={handleVideoChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-white/5">
              <button 
                onClick={() => setStep(1)}
                className={`${buttonSecondary} flex items-center gap-1`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button 
                onClick={() => {
                  if (!songTitle.trim() || !songArtist.trim()) {
                    showAlert("Please provide a song title and artist name.");
                    return;
                  }
                  if (!coverFile) {
                    showAlert("Please select a cover art image file.");
                    return;
                  }
                  if (!audioFile) {
                    showAlert("Please select an audio file.");
                    return;
                  }
                  setStep(3);
                }}
                className={`${buttonPrimary} flex items-center gap-1`}
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TERMS & SUBMISSION */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                Artist Promotional Agreement
              </h2>
              <p className="text-xs text-ink-500 mt-1">Please review and agree to our hosting guidelines before submitting.</p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-xs leading-relaxed text-ink-400 space-y-4 max-h-[200px] overflow-y-auto font-medium">
              <p>
                <strong>1. No Royalty/Payout Liability:</strong> Sonora operates purely as a free-to-use promotional platform to help rising creators showcase their work. We do not offer financial compensation, streaming royalties, or subscription payouts of any kind.
              </p>
              <p>
                <strong>2. Zero Hosting Fees:</strong> Sonora will never demand subscription or distribution costs from you to list, stream, or share your musical assets.
              </p>
              <p>
                <strong>3. Licensing Rights:</strong> You confirm that you hold the necessary copy/intellectual rights to publish this music. Any uploaded files matching copyrighted catalog works are subject to immediate removal.
              </p>
              <p>
                <strong>4. Showcase Distribution:</strong> By uploading your work, you grant Sonora the license to stream this track on our local client nodes for presentation purposes.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-500 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-ink-300 leading-normal">
                I agree to the promotional terms and certify that the uploaded track is my own original work.
              </span>
            </label>

            <div className="flex justify-between pt-4 border-t border-white/5">
              <button 
                onClick={() => setStep(2)}
                className={`${buttonSecondary} flex items-center gap-1`}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className={`${buttonPrimary} flex items-center gap-1.5`}
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950 border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
