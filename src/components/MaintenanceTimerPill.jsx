import React, { useState, useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { AlertTriangle, Clock, X, Info } from "lucide-react";

function RollingDigit({ value }) {
  const val = isNaN(parseInt(value, 10)) ? 0 : parseInt(value, 10);
  return (
    <span className="inline-block relative h-4 overflow-hidden w-[0.6em] font-mono leading-none">
      <span 
        className="absolute left-0 right-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ transform: `translateY(-${val * 10}%)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <span key={num} className="h-4 flex items-center justify-center text-[11px] sm:text-xs font-bold text-white/90">
            {num}
          </span>
        ))}
      </span>
    </span>
  );
}

export function MaintenanceTimerPill() {
  const { siteSettings, morphism } = usePlayer();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  const scheduledStart = siteSettings?.maintenance_scheduled_start;
  const scheduledEnd = siteSettings?.maintenance_scheduled_end;
  const description = siteSettings?.maintenance_description;

  useEffect(() => {
    if (!scheduledStart) {
      setTimeLeft(0);
      return;
    }

    const calculateTime = () => {
      const diff = new Date(scheduledStart).getTime() - Date.now();
      setTimeLeft(Math.max(0, diff));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [scheduledStart]);

  // Handle clicking outside to collapse
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isExpanded]);

  if (timeLeft <= 0) return null;

  // Format time remaining (HH:MM:SS)
  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hoursStr = String(hours).padStart(2, "0");
  const minutesStr = String(minutes).padStart(2, "0");
  const secondsStr = String(seconds).padStart(2, "0");

  const startFormatted = new Date(scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endFormatted = scheduledEnd 
    ? new Date(scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : null;

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center z-40"
    >
      {/* ── Compact Muted Pill ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-1.5 h-8 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] flex items-center gap-2 select-none cursor-pointer shadow-sm active:scale-[0.98] transition-all duration-300"
      >
        <div className="flex items-center gap-1.5 shrink-0 text-white/40">
          <Clock className="h-3.5 w-3.5 shrink-0 text-white/50" />
          <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Maint in</span>
        </div>
        
        <div className="flex items-center font-bold text-[11px] sm:text-xs text-white/90 gap-[1px]">
          {hours > 0 && (
            <>
              <RollingDigit value={hoursStr[0]} />
              <RollingDigit value={hoursStr[1]} />
              <span className="mx-[1px] font-bold text-white/40">:</span>
            </>
          )}
          <RollingDigit value={minutesStr[0]} />
          <RollingDigit value={minutesStr[1]} />
          <span className="mx-[1px] font-bold text-white/40">:</span>
          <RollingDigit value={secondsStr[0]} />
          <RollingDigit value={secondsStr[1]} />
        </div>
      </div>

      {/* ── Absolute Overlay Dropdown Card (World Cup score popover style) ── */}
      <div 
        className={`absolute top-10 left-1/2 -translate-x-1/2 w-80 p-4 z-50 transition-all duration-300 ease-out origin-top rounded-2xl bg-neutral-950/95 border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl ${
          isExpanded 
            ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' 
            : 'opacity-0 scale-95 pointer-events-none -translate-y-2'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.05]">
          <div className="flex items-center gap-2 text-white/80">
            <div className="h-7 w-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white/60" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/80">Scheduled Maintenance</h4>
              <p className="text-[8px] font-mono text-white/40 tracking-wider">SYSTEM WARNING</p>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="h-6 w-6 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition active:scale-90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Times */}
        <div className="space-y-2 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-[10px] text-white/80">
            <Clock className="h-3.5 w-3.5 text-white/40 shrink-0" />
            <span className="font-semibold text-white/40 uppercase text-[9px]">Starts:</span>
            <span className="font-bold text-white font-mono">{startFormatted}</span>
          </div>
          {endFormatted && (
            <div className="flex items-center gap-2 text-[10px] text-white/80">
              <Clock className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
              <span className="font-semibold text-white/40 uppercase text-[9px]">Ends:</span>
              <span className="font-bold text-white font-mono">{endFormatted}</span>
            </div>
          )}
        </div>

        {/* Details / Description */}
        {description ? (
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Description:</span>
            <p className="text-[10px] leading-relaxed text-white/70 font-medium bg-white/[0.01] border border-white/5 rounded-xl p-3">
              {description}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 p-3 text-[10px] text-white/60">
            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>The system will automatically enter maintenance mode once the timer ends.</span>
          </div>
        )}

        {/* Expanded Countdown Ticker at the bottom */}
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider text-neutral-400">Remaining:</span>
          <div className="flex items-center font-bold text-xs sm:text-sm text-white/90 gap-[1px]">
            {hours > 0 && (
              <>
                <RollingDigit value={hoursStr[0]} />
                <RollingDigit value={hoursStr[1]} />
                <span className="mx-[1px] font-bold text-white/40">:</span>
              </>
            )}
            <RollingDigit value={minutesStr[0]} />
            <RollingDigit value={minutesStr[1]} />
            <span className="mx-[1px] font-bold text-white/40">:</span>
            <RollingDigit value={secondsStr[0]} />
            <RollingDigit value={secondsStr[1]} />
          </div>
        </div>
      </div>
    </div>
  );
}
