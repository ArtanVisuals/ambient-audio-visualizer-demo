import { useState, useEffect, useRef } from "react";
import { Sparkles, Trophy, ChevronDown, Flame, Tv } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

const INITIAL_MATCHES = [
  {
    id: "mex-rsa",
    teamA: { name: "Mexico", code: "MEX", flagCode: "mx", color: "#12a55f", gradient: "linear-gradient(135deg, #12a55f 0%, #12a55f 35%, #ffffff 35%, #ffffff 65%, #ce1126 65%, #ce1126 100%)" },
    teamB: { name: "South Africa", code: "RSA", flagCode: "za", color: "#007a4d", gradient: "linear-gradient(135deg, #007a4d 0%, #ffb612 40%, #007a4d 60%, #ce1126 100%)" },
    scoreA: 1,
    scoreB: 0,
    minute: 34,
    goals: [
      { player: "H. Lozano", minute: 12, team: "A" }
    ],
    status: "LIVE"
  },
  {
    id: "kor-cze",
    teamA: { name: "South Korea", code: "KOR", flagCode: "kr", color: "#cd0e2e", gradient: "linear-gradient(135deg, #cd0e2e 0%, #0047a0 100%)" },
    teamB: { name: "Czech Republic", code: "CZE", flagCode: "cz", color: "#11457e", gradient: "linear-gradient(135deg, #11457e 0%, #ffffff 50%, #d7141a 100%)" },
    scoreA: 0,
    scoreB: 0,
    minute: 10,
    goals: [],
    status: "LIVE"
  },
  {
    id: "can-bih",
    teamA: { name: "Canada", code: "CAN", flagCode: "ca", color: "#ff0000", gradient: "linear-gradient(135deg, #ff0000 0%, #ffffff 50%, #ff0000 100%)" },
    teamB: { name: "Bosnia & Herzegovina", code: "BIH", flagCode: "ba", color: "#00205b", gradient: "linear-gradient(135deg, #00205b 0%, #ffc72c 100%)" },
    scoreA: 2,
    scoreB: 1,
    minute: 78,
    goals: [
      { player: "C. Larin", minute: 23, team: "A" },
      { player: "E. Dzeko", minute: 41, team: "B" },
      { player: "J. David", minute: 67, team: "A" }
    ],
    status: "LIVE"
  },
  {
    id: "usa-par",
    teamA: { name: "United States", code: "USA", flagCode: "us", color: "#0a2342", gradient: "linear-gradient(135deg, #0a2342 0%, #ffffff 50%, #cc333f 100%)" },
    teamB: { name: "Paraguay", code: "PAR", flagCode: "py", color: "#d51b29", gradient: "linear-gradient(135deg, #d51b29 0%, #ffffff 50%, #0038a8 100%)" },
    scoreA: 0,
    scoreB: 2,
    minute: 55,
    goals: [
      { player: "A. Sanabria", minute: 19, team: "B" },
      { player: "M. Almiron", minute: 48, team: "B" }
    ],
    status: "LIVE"
  }
];

const TEAM_PLAYERS = {
  MEX: ["H. Lozano", "S. Gimenez", "E. Alvarez", "L. Chavez", "U. Antuna"],
  RSA: ["P. Tau", "T. Zwane", "M. Mokoena", "L. Lepasa", "Z. Lepasa"],
  KOR: ["Son Heung-min", "Hwang Hee-chan", "Lee Kang-in", "Cho Gue-sung"],
  CZE: ["P. Schick", "T. Soucek", "V. Cerny", "A. Hlozek"],
  CAN: ["J. David", "C. Larin", "T. Buchanan", "A. Davies"],
  BIH: ["E. Dzeko", "M. Pjanic", "L. Gojak", "A. Rahmanovic"],
  USA: ["C. Pulisic", "T. Weah", "F. Balogun", "W. McKennie"],
  PAR: ["M. Almiron", "A. Sanabria", "J. Enciso", "R. Gomez"]
};

const CACHE_KEY = "sonora_tv_matches_v6"; // Flush cache to capture the updated state

export function WorldCupScoreIsland() {
  const { morphism, enableLiveMatchScoreAlert, liveMatchSport, tvStream } = usePlayer();

  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [goalAlert, setGoalAlert] = useState(null); // { team, player, minute }
  const [showAlertOverlay, setShowAlertOverlay] = useState(false);
  const [isSyncedWithStream, setIsSyncedWithStream] = useState(false);
  
  const dropdownRef = useRef(null);

  // Auto-detect and sync match with active TV stream URL
  useEffect(() => {
    if (tvStream?.url && matches.length > 0) {
      const urlLower = tvStream.url.toLowerCase();
      let bestMatch = null;
      let highestScore = 0;

      matches.forEach(m => {
        let score = 0;
        
        const getMatchTerms = (team) => {
          const terms = [team.code.toLowerCase(), team.name.toLowerCase()];
          terms.push(team.name.toLowerCase().replace(/&/g, "and"));
          const words = team.name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 2 && w !== "and" && w !== "the");
          return [...terms, ...words];
        };

        const termsA = getMatchTerms(m.teamA);
        const termsB = getMatchTerms(m.teamB);

        const matchesA = termsA.some(term => {
          const cleanTerm = term.replace(/\s+/g, "-");
          return urlLower.includes(term) || urlLower.includes(cleanTerm);
        });

        const matchesB = termsB.some(term => {
          const cleanTerm = term.replace(/\s+/g, "-");
          return urlLower.includes(term) || urlLower.includes(cleanTerm);
        });

        if (matchesA) score += 1;
        if (matchesB) score += 1;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = m;
        }
      });

      if (bestMatch && highestScore > 0) {
        setSelectedMatchId(bestMatch.id);
      }
    }
  }, [tvStream, matches]);

  // Determine if active match is synced with the current stream
  useEffect(() => {
    const currentActive = matches.find(m => m.id === selectedMatchId) || matches[0];
    if (tvStream?.url && currentActive) {
      const urlLower = tvStream.url.toLowerCase();
      const nameALower = currentActive.teamA.name.toLowerCase();
      const nameBLower = currentActive.teamB.name.toLowerCase();
      const codeALower = currentActive.teamA.code.toLowerCase();
      const codeBLower = currentActive.teamB.code.toLowerCase();

      const matchesA = urlLower.includes(codeALower) || urlLower.includes(nameALower.replace(/\s+/g, "-")) || urlLower.includes(nameALower.split(/\s+/)[0]);
      const matchesB = urlLower.includes(codeBLower) || urlLower.includes(nameBLower.replace(/\s+/g, "-")) || urlLower.includes(nameBLower.split(/\s+/)[0]);
      
      setIsSyncedWithStream(matchesA || matchesB);
    } else {
      setIsSyncedWithStream(false);
    }
  }, [tvStream, matches, selectedMatchId]);

  const shouldShowMatch = (match) => {
    if (!match) return false;
    if (match.status === "LIVE") return true;
    if (match.status === "FT") {
      if (match.endedAt) {
        const diffMs = Date.now() - new Date(match.endedAt).getTime();
        return diffMs >= 0 && diffMs < 10 * 60 * 1000; // 10 minutes
      }
      if (match.date) {
        const diffMs = Date.now() - new Date(match.date).getTime();
        // Assume match ended 105 mins after kickoff, so 10 mins grace period is 115 mins after kickoff
        return diffMs >= 0 && diffMs < 115 * 60 * 1000;
      }
      return false;
    }
    return false;
  };


  // Helper to get sport titles dynamically
  const getSportTitle = (sport) => {
    switch (sport) {
      case 'cricket': return 'INTERNATIONAL CRICKET';
      case 'basketball': return 'NBA BASKETBALL';
      case 'football': return 'NFL FOOTBALL';
      case 'soccer':
      default:
        return 'FIFA WORLD CUP 2026';
    }
  };

  // Helper to parse score strings to numbers for comparisons
  const parseScoreToNum = (scoreStr) => {
    if (typeof scoreStr === 'number') return scoreStr;
    if (!scoreStr) return 0;
    const runsStr = String(scoreStr).split('/')[0];
    const parsed = parseInt(runsStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to format clock/status display per sport
  const getClockDisplay = (match, isExpanded = false) => {
    if (!match) return "";
    if (match.status !== "LIVE") {
      const hasPenalties = match.shootoutScoreA !== null && match.shootoutScoreA !== undefined;
      if (match.status === "FT") {
        return hasPenalties 
          ? (isExpanded ? "FINAL (PEN)" : "FT-PEN") 
          : (isExpanded ? "FINAL" : "FT");
      }
      return match.status;
    }
    const time = match.displayTime || String(match.minute);
    if (liveMatchSport === 'soccer' && !time.includes(':') && !isNaN(time)) {
      return `${time}'`;
    }
    return time;
  };

  // Reset matches and selected match when changing sports
  useEffect(() => {
    setMatches([]);
    setSelectedMatchId("");
  }, [liveMatchSport]);

  // Sync selectedMatchId to the most relevant match (LIVE first, then recent FT, then fallback)
  useEffect(() => {
    if (matches.length > 0) {
      const showableMatches = matches.filter(shouldShowMatch);
      if (showableMatches.length > 0) {
        const liveMatch = showableMatches.find(m => m.status === "LIVE");
        if (liveMatch) {
          if (selectedMatchId !== liveMatch.id) {
            setSelectedMatchId(liveMatch.id);
          }
        } else {
          if (selectedMatchId !== showableMatches[0].id) {
            setSelectedMatchId(showableMatches[0].id);
          }
        }
      } else {
        const exists = matches.some(m => m.id === selectedMatchId);
        if (!exists) {
          setSelectedMatchId(matches[0].id);
        }
      }
    }
  }, [matches, selectedMatchId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch match scores from backend endpoint
  const fetchMatches = async (isInitial = false) => {
    try {
      const response = await fetch(`/api/worldcup-scores?sport=${liveMatchSport}`);
      if (!response.ok) throw new Error("Failed to fetch live scores");
      const data = await response.json();
      
      if (data && Array.isArray(data) && data.length > 0) {
        setMatches(prevMatches => {
          // Compare previous scores with new scores to trigger goal alerts dynamically
          if (!isInitial && prevMatches && prevMatches.length > 0) {
            const prevActive = prevMatches.find(m => m.id === selectedMatchId);
            const currentActive = data.find(m => m.id === selectedMatchId);

            if (prevActive && currentActive) {
              const scoreChangedA = parseScoreToNum(currentActive.scoreA) > parseScoreToNum(prevActive.scoreA);
              const scoreChangedB = parseScoreToNum(currentActive.scoreB) > parseScoreToNum(prevActive.scoreB);

              if (scoreChangedA || scoreChangedB) {
                // Goal scored! Retrieve the newest goal detail
                const newGoal = currentActive.goals && currentActive.goals[currentActive.goals.length - 1];
                const scoringTeam = scoreChangedA ? currentActive.teamA : currentActive.teamB;
                const scorerName = newGoal ? newGoal.player : "Goal!";
                const goalMinute = newGoal ? newGoal.minute : currentActive.minute;

                triggerGoalAlert(scoringTeam, scorerName, goalMinute);
              }
            }
          }
          return data;
        });
      }
    } catch (err) {
      console.error("Error polling World Cup scores:", err);
    }
  };

  // Initial load and poll every 12 seconds for real-time responsiveness
  useEffect(() => {
    fetchMatches(true);
    const interval = setInterval(() => {
      fetchMatches(false);
    }, 12000);
    return () => clearInterval(interval);
  }, [selectedMatchId, liveMatchSport]);

  const activeMatch = matches.find(m => m.id === selectedMatchId) || matches[0];

  // Determine if the scoreboard island should be shown based on settings and match rules
  const showIsland = !!(enableLiveMatchScoreAlert && activeMatch && shouldShowMatch(activeMatch));

  // Goal alert trigger
  const triggerGoalAlert = (scoringTeamInfo, player, minute) => {
    setGoalAlert({
      team: scoringTeamInfo,
      player,
      minute
    });
    setShowAlertOverlay(true);

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Dismiss goal alert overlay/glow after 9.5 seconds smoothly
    const fadeTimeout = setTimeout(() => {
      setShowAlertOverlay(false);
    }, 9500);

    // Completely reset goal alert state after 10 seconds
    const clearTimeout = setTimeout(() => {
      setGoalAlert(null);
    }, 10000);
  };

  const simulateGoal = (teamCode) => {
    setMatches(prevMatches => {
      return prevMatches.map(match => {
        if (match.id !== selectedMatchId) return match;

        const isA = teamCode === "A";
        const teamInfo = isA ? match.teamA : match.teamB;
        const playerPool = TEAM_PLAYERS[teamInfo.code] || ["Striker"];
        const randomPlayer = playerPool[Math.floor(Math.random() * playerPool.length)];

        const newGoal = {
          player: randomPlayer,
          minute: match.minute,
          team: isA ? "A" : "B"
        };

        const currentScoreA = parseScoreToNum(match.scoreA);
        const currentScoreB = parseScoreToNum(match.scoreB);

        const updated = {
          ...match,
          scoreA: isA ? (typeof match.scoreA === 'number' ? match.scoreA + 1 : `${currentScoreA + 1}`) : match.scoreA,
          scoreB: !isA ? (typeof match.scoreB === 'number' ? match.scoreB + 1 : `${currentScoreB + 1}`) : match.scoreB,
          goals: [...match.goals, newGoal]
        };

        triggerGoalAlert(teamInfo, randomPlayer, match.minute);

        return updated;
      });
    });
  };

  const handleResetMatches = () => {
    setMatches(INITIAL_MATCHES);
    setGoalAlert(null);
    setShowAlertOverlay(false);
  };

  // Get outer container morphism styling classes (matching Clock Capsule in TopBar.jsx)
  const getMorphismClasses = () => {
    switch (morphism) {
      case 'neobrutalism':
        return 'rounded-none border-2 border-white bg-black shadow-[3px_3px_0px_0px_#ffffff]';
      case 'claymorphism':
        return 'rounded-2xl border-none bg-white/[0.04] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.08),inset_-2px_-2px_4px_rgba(0,0,0,0.4)]';
      case 'skeuomorphism':
        return 'rounded-2xl border border-white/[0.08] border-t-white/[0.15] border-l-white/[0.15] bg-gradient-to-br from-white/[0.05] to-white/[0.01] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.04),2px_2px_5px_rgba(0,0,0,0.4)]';
      case 'minimalism':
        return 'rounded-full border border-white/[0.04] bg-white/[0.01]';
      case 'glassmorphism':
      default:
        return 'rounded-full border border-white/[0.06] bg-white/[0.02] shadow-sm backdrop-blur-md';
    }
  };

  const getMorphismBorderRadius = () => {
    switch (morphism) {
      case 'neobrutalism':
        return 'rounded-none';
      case 'claymorphism':
      case 'skeuomorphism':
        return 'rounded-2xl';
      case 'minimalism':
      case 'glassmorphism':
      default:
        return 'rounded-full';
    }
  };

  const getDropdownMorphismClasses = () => {
    switch (morphism) {
      case 'neobrutalism':
        return 'rounded-none border-2 border-white bg-black shadow-[6px_6px_0px_0px_#ffffff]';
      case 'claymorphism':
        return 'rounded-2xl border border-white/10 bg-black/95 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),0_24px_48px_rgba(0,0,0,0.8)]';
      case 'skeuomorphism':
        return 'rounded-2xl border border-white/[0.12] bg-black/95 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05),0_24px_48px_rgba(0,0,0,0.8)]';
      case 'minimalism':
      case 'glassmorphism':
      default:
        return 'rounded-2xl border border-white/10 bg-black/95 shadow-[0_24px_48px_rgba(0,0,0,0.8)] backdrop-blur-xl';
    }
  };

  const textStyleVars = {
    '--text-primary': '#ffffff',
    '--text-secondary': 'rgba(255, 255, 255, 0.8)',
    '--text-muted': 'rgba(255, 255, 255, 0.55)'
  };
  return (
    <div 
      ref={dropdownRef}
      className={`transition-all duration-700 ease-in-out relative flex items-center justify-center ${
        showIsland 
          ? 'max-w-[400px] opacity-100 scale-100' 
          : 'max-w-0 opacity-0 scale-75 pointer-events-none border-transparent shadow-none overflow-hidden'
      }`}
    >
      <style>{`
        @keyframes gradientSweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      
      {activeMatch && (
        <>
          {/* 1. The Dynamic Island Pill */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          ...textStyleVars,
          ...(showAlertOverlay && goalAlert ? { boxShadow: `0 0 24px 6px ${goalAlert.team.color}` } : {})
        }}
        className={`relative h-9 flex items-center justify-center gap-3 text-xs font-bold transition-all duration-500 overflow-hidden select-none cursor-pointer ${
          goalAlert 
            ? `px-6 text-white border border-white/20 ${getMorphismBorderRadius()}` 
            : `px-4 hover:bg-white/[0.04] active:scale-[0.98] ${getMorphismClasses()}`
        }`}
      >
        {/* Glow Alert Gradient Overlay */}
        {goalAlert && (
          <div 
            style={{
              backgroundImage: goalAlert.team.gradient,
              backgroundSize: "200% auto",
              animation: "gradientSweep 3s linear infinite",
              opacity: showAlertOverlay ? 1 : 0
            }}
            className="absolute inset-0 transition-opacity duration-500 ease-in-out pointer-events-none z-0"
          />
        )}

        {/* Content Container (to stay above overlay) */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          {goalAlert ? (
            /* Goal State Display */
            <div className="flex items-center gap-2 text-white animate-in slide-in-from-top-2 duration-300">
              <Flame className="h-3.5 w-3.5 text-amber-300 fill-current animate-bounce shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                GOAL!
              </span>
              <img 
                src={`https://flagcdn.com/w40/${goalAlert.team.flagCode}.png`} 
                className="h-3 w-4.5 object-cover rounded shadow shrink-0"
                alt=""
              />
              <span className="text-[10px] font-extrabold tracking-wide drop-shadow-md text-white">
                {goalAlert.player} ({goalAlert.minute}')
              </span>
            </div>
          ) : (
            /* Normal Live score Display */
            <div className="flex items-center gap-2 select-none">
              {/* Team A Flag & Code */}
              <img 
                src={activeMatch.teamA.logo || `https://flagcdn.com/w40/${activeMatch.teamA.flagCode}.png`} 
                className="h-4.5 w-4.5 object-contain rounded shadow-sm shrink-0"
                alt=""
              />
              <span className="text-[10px] font-bold tracking-wider text-white/80">{activeMatch.teamA.code}</span>
              
              {/* Score Center Ticker */}
              <span className="text-[11px] font-black tracking-wide text-white bg-white/10 px-1.5 py-0.5 rounded-md min-w-[3.5em] text-center whitespace-nowrap">
                {activeMatch.scoreA} - {activeMatch.scoreB}
                {(activeMatch.shootoutScoreA !== null && activeMatch.shootoutScoreA !== undefined) && ` (${activeMatch.shootoutScoreA}-${activeMatch.shootoutScoreB})`}
              </span>
              
              {/* Team B Code & Flag */}
              <span className="text-[10px] font-bold tracking-wider text-white/80">{activeMatch.teamB.code}</span>
              <img 
                src={activeMatch.teamB.logo || `https://flagcdn.com/w40/${activeMatch.teamB.flagCode}.png`} 
                className="h-4.5 w-4.5 object-contain rounded shadow-sm shrink-0"
                alt=""
              />
              
              <div className="h-3 w-[1px] bg-white/10 mx-0.5" />

              {/* Game timer indicator */}
              <span className="flex items-center gap-1 text-[9px] font-extrabold tracking-widest text-emerald-400 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {getClockDisplay(activeMatch)}
              </span>

              {isSyncedWithStream && (
                <Tv className="h-3.5 w-3.5 text-sage-400 animate-pulse shrink-0" title="Synced with active TV Stream" />
              )}

              <ChevronDown className="h-3 w-3 text-white/60 transition-transform duration-300" style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
            </div>
          )}
        </div>
      </div>

      {/* 2. Expanded Detail Dropdown Card */}
      <div 
        style={textStyleVars}
        className={`absolute top-11 left-1/2 -translate-x-1/2 w-80 p-4 z-50 transition-all duration-300 ease-out origin-top ${
          isOpen 
            ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' 
            : 'opacity-0 scale-95 pointer-events-none -translate-y-2'
        } ${getDropdownMorphismClasses()}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest">
            <Trophy className="h-3.5 w-3.5 animate-pulse" />
            <span>{getSportTitle(liveMatchSport)}</span>
          </div>
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            {isSyncedWithStream ? "LIVE STREAM SYNCED" : (activeMatch.status === "LIVE" ? "LIVE STREAM SYNC" : "FINISHED")}
          </span>
        </div>

        {/* Large Matchup detail */}
        <div className="flex items-center justify-between py-1 px-1">
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 text-center">
            <img 
              src={activeMatch.teamA.logo || `https://flagcdn.com/w80/${activeMatch.teamA.flagCode}.png`} 
              className="h-10 w-10 object-contain rounded-md shadow-md shrink-0" 
              alt=""
            />
            <span className="text-xs font-bold text-white tracking-wide truncate w-full">{activeMatch.teamA.name}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center px-3 py-1.5 mx-2 border border-white/5 bg-white/[0.01] rounded-lg shrink-0 min-w-[85px] text-center">
            <span className="text-sm font-black text-white whitespace-nowrap">
              {activeMatch.scoreA} - {activeMatch.scoreB}
            </span>
            {(activeMatch.shootoutScoreA !== null && activeMatch.shootoutScoreA !== undefined) && (
              <span className="text-[9px] font-bold text-amber-400 mt-0.5 whitespace-nowrap">
                ({activeMatch.shootoutScoreA} - {activeMatch.shootoutScoreB} pen)
              </span>
            )}
            <span className="text-[9px] text-white/60 font-mono tracking-wider mt-0.5 whitespace-nowrap">
              {getClockDisplay(activeMatch, true)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 text-center">
            <img 
              src={activeMatch.teamB.logo || `https://flagcdn.com/w80/${activeMatch.teamB.flagCode}.png`} 
              className="h-10 w-10 object-contain rounded-md shadow-md shrink-0" 
              alt=""
            />
            <span className="text-xs font-bold text-white tracking-wide truncate w-full">{activeMatch.teamB.name}</span>
          </div>
        </div>

        {/* Goal Scorers list */}
        {liveMatchSport === 'soccer' && (
          <div className="mt-4 bg-white/[0.02] border-[1px] border-white/5 rounded-xl p-3 space-y-2">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/50 block">
              Match Scorers
            </span>
            {activeMatch.goals.length === 0 ? (
              <span className="text-[11px] text-white/50 text-center italic py-1 block">No goals scored yet</span>
            ) : (
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 font-sans">
                {activeMatch.goals.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span>⚽</span>
                      <span className="font-semibold text-white">{g.player}</span>
                      <span className="text-white/50">({g.team === "A" ? activeMatch.teamA.code : activeMatch.teamB.code})</span>
                    </span>
                    <span className="font-mono text-white/50">{g.minute}'</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Booking Cards list */}
        {liveMatchSport === 'soccer' && (
          <div className="mt-3 bg-white/[0.02] border-[1px] border-white/5 rounded-xl p-3 space-y-2">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/50 block">
              Match Cards
            </span>
            {!activeMatch.cards || activeMatch.cards.length === 0 ? (
              <span className="text-[11px] text-white/50 text-center italic py-1 block">No cards issued yet</span>
            ) : (
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 font-sans">
                {activeMatch.cards.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-3.5 rounded-[2px] shrink-0 shadow-sm border border-black/10 ${
                        c.type === "red" ? "bg-red-500 animate-pulse" : "bg-yellow-400"
                      }`} />
                      <span className="font-semibold text-white">{c.player}</span>
                      <span className="text-white/50">({c.team === "A" ? activeMatch.teamA.code : activeMatch.teamB.code})</span>
                    </span>
                    <span className="font-mono text-white/50">{c.minute}'</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
        </>
      )}

    </div>
  );
}
