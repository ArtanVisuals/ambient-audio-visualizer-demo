import React from "react";
import { createPortal } from "react-dom";

export function ServerUrlModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm rounded-3xl border border-white/[0.1] bg-ink-950 p-6 shadow-2xl text-left animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-2 text-center">Server Connection Setup</h3>
        <p className="text-xs text-ink-400 mb-6 text-center leading-relaxed">
          The app cannot reach the music server. Please check that your server PC is running and paste the new TryCloudflare/Ngrok tunnel URL below.
        </p>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const newUrl = fd.get('server_url');
          if (newUrl) {
            window.updateNativeServerUrl(newUrl);
          }
          onClose();
        }} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-1.5 font-sans">Server Connection URL</label>
            <input 
              name="server_url"
              type="text"
              required
              placeholder="e.g. https://*.trycloudflare.com"
              defaultValue={window.NATIVE_SERVER_URL || ""}
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-sage-400 font-mono"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button 
              type="button"
              onClick={() => {
                window.updateNativeServerUrl("");
                onClose();
              }}
              className="flex-1 rounded-2xl bg-white/5 py-3 text-xs font-bold text-ink-300 hover:bg-white/10 transition active:scale-[0.98]"
            >
              Reset Default
            </button>
            <button 
              type="submit"
              className="flex-1 rounded-2xl bg-sage-400 py-3 text-xs font-bold text-ink-950 hover:bg-sage-500 transition active:scale-[0.98]"
            >
              Save &amp; Connect
            </button>
          </div>
        </form>

        <button 
          onClick={onClose}
          className="mt-4 w-full rounded-2xl border border-white/5 py-2.5 text-xs font-bold text-ink-500 hover:text-ink-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}
