import React from "react";
import { createPortal } from "react-dom";
import { Timer } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";

export function SleepTimerModal({ isOpen, onClose, audioRef, volume }) {
  const {
    sleepTimerSecondsLeft,
    sleepTimerActive,
    initialSleepDuration,
    setSleepTimerActive,
    setSleepTimerSecondsLeft,
    setInitialSleepDuration
  } = usePlayer();

  if (!isOpen) return null;

  const formatSeconds = (total) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-sm rounded-3xl border border-white/[0.1] bg-ink-950 p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-4 text-sage-400">
            <Timer className="h-10 w-10 animate-pulse" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sleep Timer</h3>
          
          {sleepTimerActive && sleepTimerSecondsLeft !== null ? (
            <div className="mb-6">
              <p className="text-sm text-white/50 mb-1">Time Remaining</p>
              <p className="text-4xl font-extrabold text-sage-400 font-mono tracking-wider">
                {formatSeconds(sleepTimerSecondsLeft)}
              </p>
              <div className="mt-4 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-sage-400 h-full transition-all duration-1000"
                  style={{ width: `${(sleepTimerSecondsLeft / (initialSleepDuration || 1)) * 100}%` }}
                />
              </div>
              <button
                onClick={() => {
                  setSleepTimerActive(false);
                  setSleepTimerSecondsLeft(null);
                  if (audioRef?.current) {
                    audioRef.current.volume = volume;
                  }
                }}
                className="mt-6 w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/15 transition active:scale-[0.98]"
              >
                Cancel Timer
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setInitialSleepDuration(mins * 60);
                    setSleepTimerSecondsLeft(mins * 60);
                    setSleepTimerActive(true);
                    onClose();
                  }}
                  className="w-full rounded-2xl bg-white/[0.04] py-3.5 text-sm font-semibold text-white/90 hover:bg-white/[0.08] hover:text-white transition active:scale-[0.98]"
                >
                  {mins} minutes
                </button>
              ))}
              <button
                onClick={onClose}
                className="mt-2 w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white/60 hover:text-white transition active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
