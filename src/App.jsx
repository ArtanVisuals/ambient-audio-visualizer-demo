import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Player } from "./components/Player";
import { usePlayer } from "./context/PlayerContext";
import { WebGLAmbientBackground } from "./components/WebGLAmbientBackground";

function NowPlayingView() {
  const { isExpanded, setIsExpanded, currentTrack } = usePlayer();

  useEffect(() => {
    // Keep Sonora Full Player view active at all times
    if (!isExpanded) {
      setIsExpanded(true);
    }
  }, [isExpanded, setIsExpanded]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090a09]">
      {/* Background WebGL Ambiance system safeguard */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <WebGLAmbientBackground key={currentTrack?.id || 'demo-bg'} glow={1.4} boost={1.4} />
      </div>
      <div className="relative z-10 w-full h-full">
        <Player />
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Router>
      <NowPlayingView />
    </Router>
  );
}
