import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Player } from "./components/Player";
import { usePlayer } from "./context/PlayerContext";

function NowPlayingView() {
  const { isExpanded, setIsExpanded } = usePlayer();

  useEffect(() => {
    // Keep Sonora Full Player view active at all times
    if (!isExpanded) {
      setIsExpanded(true);
    }
  }, [isExpanded, setIsExpanded]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090a09]">
      <Player />
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
