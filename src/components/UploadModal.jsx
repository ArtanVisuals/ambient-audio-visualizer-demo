import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { UploadCloud, Music, Sparkles, X, Image, FileAudio, Check, AlertCircle, RefreshCw, Youtube } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

/**
 * Helper to extract embedded cover art (ID3v2 APIC frame) in pure JS on client side
 */
function extractEmbeddedCover(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const buffer = e.target.result;
        const view = new DataView(buffer);
        
        // Check for 'ID3' header
        if (buffer.byteLength < 10 || 
            view.getUint8(0) !== 0x49 || 
            view.getUint8(1) !== 0x44 || 
            view.getUint8(2) !== 0x33) {
          resolve(null);
          return;
        }
        
        // Get tag size
        const tagSize = ((view.getUint8(6) & 0x7f) << 21) |
                        ((view.getUint8(7) & 0x7f) << 14) |
                        ((view.getUint8(8) & 0x7f) << 7) |
                        (view.getUint8(9) & 0x7f);
        
        let offset = 10;
        const limit = Math.min(tagSize + 10, buffer.byteLength);
        
        while (offset < limit - 10) {
          // Read frame ID
          const frameIdBytes = [
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
          ];
          const frameId = String.fromCharCode(...frameIdBytes);
          
          // Read frame size
          const frameSize = (view.getUint8(offset + 4) << 24) |
                            (view.getUint8(offset + 5) << 16) |
                            (view.getUint8(offset + 6) << 8) |
                            view.getUint8(offset + 7);
                            
          if (frameSize <= 0 || offset + 10 + frameSize > limit) {
            break;
          }
          
          if (frameId === 'APIC') {
            const dataOffset = offset + 10;
            const encoding = view.getUint8(dataOffset);
            
            // Find MIME type
            let mimeTypeOffset = dataOffset + 1;
            let mimeType = '';
            while (mimeTypeOffset < dataOffset + frameSize) {
              const charCode = view.getUint8(mimeTypeOffset);
              if (charCode === 0) break;
              mimeType += String.fromCharCode(charCode);
              mimeTypeOffset++;
            }
            
            // Find Description
            let descOffset = mimeTypeOffset + 2; // skip pictureType (1 byte)
            const isUnicode = encoding === 1 || encoding === 2;
            while (descOffset < dataOffset + frameSize) {
              const charCode = view.getUint8(descOffset);
              if (isUnicode) {
                const nextCode = view.getUint8(descOffset + 1);
                if (charCode === 0 && nextCode === 0) {
                  descOffset += 2;
                  break;
                }
                descOffset += 2;
              } else {
                if (charCode === 0) {
                  descOffset++;
                  break;
                }
                descOffset++;
              }
            }
            
            const pictureDataOffset = descOffset;
            const pictureDataSize = (dataOffset + frameSize) - pictureDataOffset;
            
            if (pictureDataSize > 0) {
              const pictureBuffer = buffer.slice(pictureDataOffset, pictureDataOffset + pictureDataSize);
              const blob = new Blob([pictureBuffer], { type: mimeType || 'image/jpeg' });
              resolve(URL.createObjectURL(blob));
              return;
            }
          }
          
          offset += 10 + frameSize;
        }
        resolve(null);
      } catch (err) {
        console.error("Error parsing ID3 APIC frame:", err);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, Math.min(file.size, 5 * 1024 * 1024)));
  });
}

export function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { user } = usePlayer();

  const [step, setStep] = useState(0);
  const [uploadType, setUploadType] = useState("local");
  const [audioFile, setAudioFile] = useState(null);
  const [customCover, setCustomCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [duration, setDuration] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingYt, setIsFetchingYt] = useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadedTrack, setUploadedTrack] = useState(null);

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processAudioFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processAudioFile(files[0]);
    }
  };

  const processAudioFile = async (file) => {
    if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3") && !file.name.endsWith(".m4a") && !file.name.endsWith(".wav")) {
      setError("Please select a valid audio file (.mp3, .m4a, or .wav).");
      return;
    }
    setError("");
    setAudioFile(file);
    
    // Auto-fill title from filename
    const ext = file.name.substring(file.name.lastIndexOf("."));
    const base = file.name.replace(ext, "");
    // Try split by ' - ' to guess artist & title
    const parts = base.split(" - ");
    if (parts.length > 1) {
      setArtist(parts[0].trim());
      setTitle(parts.slice(1).join(" - ").trim());
    } else {
      setTitle(base.trim());
      setArtist("");
    }
    setAlbum("");

    // Attempt client-side cover extraction for live preview
    try {
      const extractedUrl = await extractEmbeddedCover(file);
      if (extractedUrl) {
        setCoverPreview(extractedUrl);
      } else {
        setCoverPreview(null);
      }
    } catch (e) {
      console.log("Failed to extract embedded cover preview", e);
      setCoverPreview(null);
    }

    setStep(2);
  };

  const handleCoverSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file for the cover.");
        return;
      }
      setCustomCover(file);
      const reader = new FileReader();
      reader.onload = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFetchYoutubeInfo = async () => {
    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube URL first.");
      return;
    }
    if (!youtubeUrl.includes("youtube.com") && !youtubeUrl.includes("youtu.be")) {
      setError("YouTube details can only be fetched for YouTube URLs.");
      return;
    }

    setIsFetchingYt(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/yt/info?url=${encodeURIComponent(youtubeUrl)}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch details");
      }
      const ytData = await res.json();

      setTitle(ytData.title || "");
      setArtist(ytData.artist || "");
      setAlbum(ytData.album || "YouTube");
      setDuration(ytData.duration || "0:00");
      setCoverPreview(ytData.cover || "/covers/default.png");
    } catch (err) {
      setError(err.message || "Failed to fetch YouTube details.");
    } finally {
      setIsFetchingYt(false);
    }
  };

  const handleFetchAutoLyrics = async () => {
    if (!title.trim()) {
      setError("Please enter a song title first.");
      return;
    }
    setIsFetchingLyrics(true);
    setError("");
    try {
      const mmKey = localStorage.getItem("aura_musixmatch_api_key") || "";
      const res = await fetch(`/api/admin/tracks/fetch-lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist || "")}`, {
        headers: {
          "x-musixmatch-key": mmKey
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lyrics not found");
      }
      const lrcData = await res.json();
      setLyrics(lrcData.lyrics);
    } catch (err) {
      setError(err.message || "Failed to fetch lyrics automatically.");
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) return;

    setIsSubmitting(true);
    setError("");
    setProgress(15);

    const formData = new FormData();
    formData.append("audio", audioFile);
    if (customCover) {
      formData.append("cover", customCover);
    }
    formData.append("title", title.trim());
    formData.append("artist", artist.trim());
    formData.append("album", album.trim());

    // Simulated progress to look smooth and premium
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const res = await fetch("/api/tracks/upload", {
        method: "POST",
        headers: {
          'x-user-id': user?.uid || ''
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload track");
      }

      setUploadedTrack(data);
      setStep(3); // Success step!
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsSubmitting(true);
    setError("");
    setProgress(30);

    try {
      const res = await fetch("/api/tracks/add-youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || ""
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          album: album.trim(),
          duration: duration.trim(),
          cover: coverPreview || "/covers/default.png",
          audioUrl: youtubeUrl.trim(),
          lyrics: lyrics.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save YouTube track");
      }

      setProgress(100);
      setUploadedTrack(data);
      setStep(3); // Success step!
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      setError(err.message || "An error occurred during saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setUploadType("local");
    setAudioFile(null);
    setCustomCover(null);
    setCoverPreview(null);
    setTitle("");
    setArtist("");
    setAlbum("");
    setDuration("");
    setLyrics("");
    setYoutubeUrl("");
    setError("");
    setProgress(0);
    setUploadedTrack(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Background close click */}
      <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

      <div className="upload-modal-content relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/10 bg-ink-950/90 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90dvh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              {step === 4 ? "Import YouTube Stream" : "Add Track to Library"}
            </h2>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ink-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 scrollbar-hide shrink-0 flex-1">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {/* Option 1: Local File */}
              <button
                onClick={() => {
                  setUploadType("local");
                  setStep(1);
                }}
                className="group flex flex-col items-center justify-center p-6 rounded-[2rem] border border-white/10 bg-white/[0.01] hover:border-purple-500/40 hover:bg-purple-500/[0.02] active:scale-[0.98] transition-all duration-300 text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-all duration-300">
                  <Music className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">Upload Local File</h3>
                <p className="mt-1 text-[11px] text-white/40 leading-snug">
                  Upload MP3, WAV, or M4A audio files directly from your device.
                </p>
              </button>

              {/* Option 2: YouTube URL */}
              <button
                onClick={() => {
                  setUploadType("youtube");
                  setStep(4);
                }}
                className="group flex flex-col items-center justify-center p-6 rounded-[2rem] border border-white/10 bg-white/[0.01] hover:border-purple-500/40 hover:bg-purple-500/[0.02] active:scale-[0.98] transition-all duration-300 text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-all duration-300">
                  <Youtube className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">Import from YouTube</h3>
                <p className="mt-1 text-[11px] text-white/40 leading-snug">
                  Import song details, cover art, and stream directly using a YouTube link.
                </p>
              </button>
            </div>
          )}

          {step === 1 && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-white/10 bg-white/[0.01] px-6 py-16 text-center cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/[0.01] transition-all duration-300"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="audio/*,.mp3,.m4a,.wav"
                className="hidden"
              />
              
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-300">
                <UploadCloud className="h-10 w-10 animate-bounce" strokeWidth={1.5} />
              </div>

              <h3 className="text-base font-bold text-white tracking-wide">Drag & Drop your audio file here</h3>
              <p className="mt-2 text-xs text-white/50">Supports MP3, M4A, WAV up to 30MB</p>
              
              <button
                type="button"
                className="mt-6 rounded-full bg-white/5 px-6 py-2.5 text-xs font-semibold text-white border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                Browse Files
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Audio File Banner */}
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                  <FileAudio className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Selected File</p>
                  <p className="text-sm font-medium text-white truncate">{audioFile?.name}</p>
                </div>
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors px-2"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Cover Art and Text Inputs Grid */}
              <div className="flex flex-col sm:flex-row gap-6">
                
                {/* Custom Cover Picker */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-white/90 self-start sm:self-center">Cover Art <span className="text-white/40 font-normal">(optional)</span></span>
                  <div
                    onClick={() => !isSubmitting && coverInputRef.current?.click()}
                    className="relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition group"
                  >
                    <input
                      type="file"
                      ref={coverInputRef}
                      onChange={handleCoverSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center p-2 flex flex-col items-center justify-center text-white/40 group-hover:text-white/60 transition-colors">
                        <Image className="h-7 w-7 mb-1" strokeWidth={1.5} />
                        <span className="text-[10px] font-medium leading-tight">Override Cover</span>
                      </div>
                    )}
                    
                    {coverPreview && !isSubmitting && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white transition-opacity">
                        Change Image
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 text-center leading-snug max-w-[8rem]">
                    Embedded artwork from your file is used automatically
                  </p>
                </div>

                {/* Form fields */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/90">Track Title *</label>
                    <input
                      type="text"
                      required
                      disabled={isSubmitting}
                      placeholder="e.g. Moonlight Sonata"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/90">Artist Name</label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. Beethoven"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/90">Album Title</label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. Classical Masterpieces"
                      value={album}
                      onChange={(e) => setAlbum(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

              </div>

              {/* Upload Progress */}
              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-white/60">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin text-purple-400" />
                      Parsing metadata & uploading track...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-full border border-white/10 bg-transparent py-3 text-xs font-bold text-white transition hover:bg-white/5 active:scale-[0.98] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(157,78,221,0.3)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                >
                  Upload & Publish
                </button>
              </div>

            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              {/* YouTube URL input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/90">YouTube Link *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={isSubmitting || isFetchingYt}
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleFetchYoutubeInfo}
                    disabled={isSubmitting || isFetchingYt}
                    className="rounded-xl bg-purple-500 text-ink-950 font-bold px-4 py-2.5 text-xs hover:bg-purple-600 transition-all active:scale-[0.98] disabled:opacity-40 shrink-0 flex items-center justify-center gap-1"
                  >
                    {isFetchingYt && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Fetch Details
                  </button>
                </div>
              </div>

              {/* Details grid */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Cover Art Preview */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-white/90 self-start sm:self-center">Cover Art</span>
                  <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center p-2 text-white/30">
                        <Image className="h-6 w-6 mx-auto mb-1" strokeWidth={1.5} />
                        <span className="text-[9px]">No Cover</span>
                      </div>
                    )}
                  </div>
                  {/* Option to enter custom cover URL */}
                  <input
                    type="text"
                    placeholder="Cover URL"
                    value={coverPreview || ""}
                    onChange={(e) => setCoverPreview(e.target.value)}
                    className="w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Meta Form */}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Track Title *</label>
                      <input
                        type="text"
                        required
                        disabled={isSubmitting}
                        placeholder="Song Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Artist Name *</label>
                      <input
                        type="text"
                        required
                        disabled={isSubmitting}
                        placeholder="Artist"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Album Title</label>
                      <input
                        type="text"
                        disabled={isSubmitting}
                        placeholder="Album"
                        value={album}
                        onChange={(e) => setAlbum(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Duration *</label>
                      <input
                        type="text"
                        required
                        disabled={isSubmitting}
                        placeholder="e.g. 3:45"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lyrics area */}
              <div className="flex flex-col gap-1 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/70">Synced Lyrics (Optional)</label>
                  <button
                    type="button"
                    disabled={isSubmitting || isFetchingLyrics}
                    onClick={handleFetchAutoLyrics}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline transition duration-150 flex items-center gap-1"
                  >
                    {isFetchingLyrics && <RefreshCw className="h-3 w-3 animate-spin" />}
                    <span>{isFetchingLyrics ? "Fetching..." : "Fetch Auto-Lyrics"}</span>
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    disabled={isSubmitting || isFetchingLyrics}
                    placeholder="[00:00.00] Lyrics text..."
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors font-mono leading-relaxed resize-y disabled:opacity-50 pr-12"
                  />
                  {isFetchingLyrics && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-purple-300 backdrop-blur-sm animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Fetching...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-white/60">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin text-purple-400" />
                      Saving to your library...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-full border border-white/10 bg-transparent py-3 text-xs font-bold text-white transition hover:bg-white/5 active:scale-[0.98] disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(157,78,221,0.3)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                >
                  Import & Save
                </button>
              </div>
            </form>
          )}

          {step === 3 && uploadedTrack && (
            <div className="flex flex-col items-center py-6 text-center animate-in zoom-in-95 duration-300">
              
              {/* Animated Success Checkmark */}
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.15)] scale-100 animate-pulse">
                <Check className="h-10 w-10" strokeWidth={2.5} />
              </div>

              <h3 className="text-xl font-bold text-white tracking-wide">Upload Successful!</h3>
              <p className="mt-2 text-xs text-white/50 max-w-sm leading-relaxed">
                Your local track <span className="font-semibold text-purple-400">"{uploadedTrack.title}"</span> has been saved successfully and added to your Library.
              </p>

              {/* Compact Track Card Display */}
              <div className="mt-6 flex items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-4 w-full max-w-sm text-left">
                {uploadedTrack.cover.startsWith("linear") ? (
                  <div 
                    className="h-16 w-16 shrink-0 rounded-2xl shadow-lg border border-white/5" 
                    style={{ background: uploadedTrack.cover }}
                  />
                ) : (
                  <img src={uploadedTrack.cover} alt="Cover" className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-lg border border-white/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{uploadedTrack.title}</p>
                  <p className="text-xs text-white/50 truncate mt-0.5">{uploadedTrack.artist || "Unknown Artist"}</p>
                  <p className="text-[10px] text-white/35 mt-1.5 uppercase font-bold tracking-wider">{uploadedTrack.album || "Unknown Album"}</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="mt-8 w-full max-w-sm rounded-full bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] py-3 text-xs font-bold text-white shadow-[0_0_15px_rgba(157,78,221,0.2)] transition hover:brightness-110 active:scale-[0.98]"
              >
                Close & Go to Library
              </button>

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}
