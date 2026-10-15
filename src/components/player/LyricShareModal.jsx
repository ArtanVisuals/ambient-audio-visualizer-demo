import { useState, useRef, useEffect } from "react";
import { X, Download, Share2, Sparkles } from "lucide-react";

export default function LyricShareModal({ isOpen, onClose, track, parsedLyrics }) {
  const [selectedLines, setSelectedLines] = useState([]);
  const canvasRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Reset selected lines when modal opens/closes or track changes
  useEffect(() => {
    setSelectedLines([]);
  }, [isOpen, track?.id]);

  if (!isOpen) return null;

  const toggleLine = (lineText) => {
    setSelectedLines((prev) => {
      if (prev.includes(lineText)) {
        return prev.filter((l) => l !== lineText);
      }
      if (prev.length >= 4) {
        alert("You can select up to 4 lines of lyrics!");
        return prev;
      }
      return [...prev, lineText];
    });
  };

  const handleDownload = () => {
    if (selectedLines.length === 0) {
      alert("Please select at least one lyric line to share!");
      return;
    }

    setExporting(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1080x1080 high-res card
    canvas.width = 1080;
    canvas.height = 1080;

    // Background Gradient (Cinematic Dark Glow)
    const grad = ctx.createRadialGradient(540, 540, 50, 540, 540, 700);
    grad.addColorStop(0, "#1c261c");
    grad.addColorStop(1, "#070a07");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Subtle Grid Overlay
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 1080; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1080);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1080, i);
      ctx.stroke();
    }

    // Blurred background circle for visual aesthetics
    ctx.fillStyle = "rgba(128, 175, 129, 0.04)";
    ctx.beginPath();
    ctx.arc(540, 540, 320, 0, Math.PI * 2);
    ctx.fill();

    // Draw Album Cover Placeholder or image (if loaded)
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Draw small blurred cover in center back or draw sharp small cover at bottom
      drawContent(ctx, img);
    };
    img.onerror = () => {
      drawContent(ctx, null);
    };
    
    // Trigger image loading
    if (track.cover && !track.cover.startsWith("linear")) {
      img.src = track.cover;
    } else {
      drawContent(ctx, null);
    }
  };

  const drawContent = (ctx, albumImg) => {
    // Draw Album Image
    if (albumImg) {
      ctx.save();
      // Rounded corners clipping for album image
      const size = 180;
      const x = 540 - size / 2;
      const y = 200;
      const radius = 24;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
      ctx.lineTo(x + radius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(albumImg, x, y, size, size);
      ctx.restore();
    }

    // Draw Title & Artist
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(track.title || "Unknown Title", 540, 440);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "500 24px sans-serif";
    ctx.fillText(track.artist || "Unknown Artist", 540, 485);

    // Dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(440, 530);
    ctx.lineTo(640, 530);
    ctx.stroke();

    // Draw Lyric Lines
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px sans-serif";
    let startY = 620;
    const lineHeight = 70;

    selectedLines.forEach((line) => {
      ctx.fillText(line, 540, startY);
      startY += lineHeight;
    });

    // Draw Branding Logo at bottom
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("SONORA", 540, 960);

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.font = "12px sans-serif";
    ctx.fillText("MADE FOR YOU", 540, 985);

    // Save and Trigger download
    try {
      const link = document.createElement("a");
      link.download = `${track.title.replace(/\s+/g, "_")}_lyrics.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Canvas export failed:", e);
      alert("Failed to export canvas image. Using local fallback.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f0d]/90 p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sage-400" />
            <h2 className="text-lg font-bold text-white">Create Lyric Card</h2>
          </div>
          <button 
            onClick={onClose} 
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ink-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content area split in two columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 pr-1 select-none">
          
          {/* Left Column: Line Picker */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">Select lines (max 4)</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2" style={{ scrollbarWidth: 'none' }}>
              {parsedLyrics.length > 0 ? (
                parsedLyrics.map((line, idx) => {
                  const isSelected = selectedLines.includes(line.text);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleLine(line.text)}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition duration-200 ${
                        isSelected
                          ? "border-sage-400/40 bg-sage-400/5 text-white font-bold"
                          : "border-white/[0.05] bg-white/[0.02] text-ink-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      {line.text}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-ink-500 py-8 text-center">No lyrics available to select.</p>
              )}
            </div>
          </div>

          {/* Right Column: Preview Card */}
          <div className="flex flex-col items-center justify-center bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06]">
            <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-4">Preview Card</h3>
            
            {/* Display Mock Preview Box */}
            <div className="relative aspect-square w-full max-w-[280px] rounded-2xl bg-gradient-to-br from-[#1c261c] to-[#070a07] p-5 shadow-lg border border-white/5 flex flex-col justify-center items-center text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(128,175,129,0.06)_0%,transparent_70%)]" />
              
              {/* Mini Art */}
              {track.cover && !track.cover.startsWith("linear") ? (
                <img src={track.cover} alt="" className="h-14 w-14 rounded-lg object-cover mb-3 border border-white/10" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-white/5 mb-3 border border-white/10 flex items-center justify-center"><Music className="h-6 w-6 text-white/30" /></div>
              )}
              
              <h4 className="text-sm font-bold text-white truncate max-w-full">{track.title}</h4>
              <p className="text-xs text-white/50 truncate max-w-full mt-0.5">{track.artist}</p>
              <div className="w-10 h-px bg-white/10 my-3" />
              
              <div className="space-y-1.5 flex-1 flex flex-col justify-center w-full">
                {selectedLines.length > 0 ? (
                  selectedLines.map((line, idx) => (
                    <p key={idx} className="text-[11px] font-bold text-white leading-relaxed line-clamp-1">{line}</p>
                  ))
                ) : (
                  <p className="text-xs text-white/20 italic">Select lyric lines to preview card</p>
                )}
              </div>

              <span className="text-[9px] font-bold text-white/20 tracking-wider mt-4">SONORA RADAR</span>
            </div>

            <button
              onClick={handleDownload}
              disabled={selectedLines.length === 0 || exporting}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-sage-400 text-ink-950 rounded-xl py-3 text-sm font-bold hover:bg-sage-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Generating..." : "Download Image"}
            </button>
          </div>

        </div>

        {/* Hidden Canvas used for high-res drawing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}
