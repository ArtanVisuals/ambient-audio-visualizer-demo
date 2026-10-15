import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "../context/PlayerContext";
import { 
  Bell, Send, Mail, Phone, Video, HelpCircle, Sparkles, 
  Clock, Globe, ArrowLeft, Play, Pause, ChevronRight, MessageSquare, AlertCircle, Info, Trash2, X, Maximize2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SonoraEmptyState } from "../components/SonoraEmptyState";

export function Notifications() {
  const navigate = useNavigate();
  const {
    currentTrack,
    setIsExpanded,
    isPlaying,
    togglePlay,
    skipNext,
    skipPrev,
    playTrack,
    liveMatchSport,
    showAlert,
    user,
    setAmbientEffectsEnabled,
    setTheme,
    setParticlesMode,
    setCrossPlayEnabled,
    setCrossfadeDuration,
    setMorphism,
    setEnableDateTimeAlert,
    setEnableLiveMatchScoreAlert,
    setLiveMatchSport,
    siteSettings
  } = usePlayer();

  // Redirect to home if notifications are disabled globally
  useEffect(() => {
    if (siteSettings?.enable_admin_notification === false) {
      navigate("/home", { replace: true });
    }
  }, [siteSettings?.enable_admin_notification, navigate]);
  
  // Navigation view: 'dashboard' | 'recent' | 'support' | 'updates'
  const [view, setView] = useState('dashboard');
  
  // Selection states for detail views
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  
  // Interactive Chat State
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'support', text: 'Hi! Welcome to Sonora Premium Support. How can we help you today?', time: '10:30 AM' },
    { id: 2, sender: 'user', text: 'Hey, I had a question about the Listening Party rooms.', time: '10:32 AM' },
    { id: 3, sender: 'support', text: 'Sure! With Listening Parties, you can create a room, share the code with friends, and synchronize your playback in real-time. Just copy the code from your player options and send it over!', time: '10:33 AM' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping, view]);

  // Execute player actions returned by the AI
  const executeAIAction = async (action) => {
    if (!action || !action.type) return;

    try {
      switch (action.type) {
        case "TOGGLE_PLAY":
          togglePlay();
          break;
        case "NEXT_TRACK":
          skipNext();
          break;
        case "PREV_TRACK":
          skipPrev();
          break;
        case "PLAY_TRACK":
          if (action.value) {
            const songName = action.value;
            const res = await fetch(`/api/search?q=${encodeURIComponent(songName)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.songs && data.songs.length > 0) {
                playTrack(data.songs[0]);
                setChatMessages(prev => [
                  ...prev,
                  {
                    id: Date.now() + 5,
                    sender: 'support',
                    text: `⚡ **Sonora Playback**: Found and playing "${data.songs[0].title}" by ${data.songs[0].artist}.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }
            }
          }
          break;
        case "TOGGLE_SETTING":
          if (action.setting) {
            const val = action.value;
            let friendlyName = action.setting;
            switch (action.setting) {
              case "ambient_effects":
                setAmbientEffectsEnabled(val === true || val === 'true');
                friendlyName = "Ambient Visualizer";
                break;
              case "theme":
                setTheme(val);
                friendlyName = `Theme to ${val}`;
                break;
              case "particles_mode":
                setParticlesMode(val);
                friendlyName = `Particles Mode to ${val}`;
                break;
              case "crossplay":
                setCrossPlayEnabled(val === true || val === 'true');
                friendlyName = "Cross-Device Playback";
                break;
              case "crossfade":
                setCrossfadeDuration(Number(val));
                friendlyName = `Audio Crossfade to ${val}s`;
                break;
              case "morphism":
                setMorphism(val);
                friendlyName = `Morphism Mode to ${val}`;
                break;
              case "date_time_alert":
                setEnableDateTimeAlert(val === true || val === 'true');
                friendlyName = "Date & Time Header Alert";
                break;
              case "live_score_alert":
                setEnableLiveMatchScoreAlert(val === true || val === 'true');
                friendlyName = "Live Sports Header Alert";
                break;
              case "preferred_sport":
                setLiveMatchSport(val);
                friendlyName = `Preferred Sport Feed to ${val}`;
                break;
              default:
                break;
            }
            const updateMsg = `⚙️ **Settings Update**: Changed ${friendlyName} settings successfully.`;
            setChatMessages(prev => [
              ...prev,
              {
                id: Date.now() + 5,
                sender: 'support',
                text: updateMsg,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            showAlert(`Updated ${friendlyName}!`);
          }
          break;
        case "CREATE_PLAYLIST":
          if (action.name) {
            const pName = action.name;
            if (!user || user.isAnonymous) {
              showAlert("Please sign in first to create playlists!");
              break;
            }
            const res = await fetch('/api/playlists', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.uid || ''
              },
              body: JSON.stringify({ name: pName })
            });
            if (res.ok) {
              setChatMessages(prev => [
                ...prev,
                {
                  id: Date.now() + 5,
                  sender: 'support',
                  text: `⚡ **Sonora AI**: Successfully created playlist "${pName}"!`,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
              showAlert(`Created playlist "${pName}"!`);
            } else {
              const err = await res.json();
              showAlert(`Failed: ${err.error || 'Server error'}`);
            }
          }
          break;
        case "ADD_TO_PLAYLIST":
          if (action.songTitle && action.playlistName) {
            const sName = action.songTitle;
            const pName = action.playlistName;
            if (!user || user.isAnonymous) {
              showAlert("Please sign in first to add tracks to playlists!");
              break;
            }
            // 1. Search for track
            const sRes = await fetch(`/api/search?q=${encodeURIComponent(sName)}`);
            if (!sRes.ok) {
              showAlert(`Could not find song "${sName}"`);
              break;
            }
            const sData = await sRes.json();
            const song = sData.songs && sData.songs.find(s => s.title.toLowerCase().includes(sName.toLowerCase()) || sName.toLowerCase().includes(s.title.toLowerCase()));
            if (!song) {
              showAlert(`Could not find track matching "${sName}"`);
              break;
            }
            // 2. Find playlist
            const pRes = await fetch('/api/playlists', {
              headers: { 'x-user-id': user?.uid || '' }
            });
            if (!pRes.ok) {
              showAlert("Failed to retrieve playlists");
              break;
            }
            const playlists = await pRes.json();
            const playlist = playlists.find(p => p.name.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(p.name.toLowerCase()));
            if (!playlist) {
              showAlert(`Could not find playlist named "${pName}"`);
              break;
            }
            // 3. Add to playlist
            const addRes = await fetch(`/api/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.uid || ''
              },
              body: JSON.stringify({ trackId: song.id })
            });
            if (addRes.ok) {
              setChatMessages(prev => [
                ...prev,
                {
                  id: Date.now() + 5,
                  sender: 'support',
                  text: `⚡ **Sonora AI**: Added "${song.title}" to playlist "${playlist.name}"!`,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
              showAlert(`Added "${song.title}" to "${playlist.name}"!`);
            } else {
              const err = await addRes.json();
              showAlert(`Failed: ${err.error || 'Server error'}`);
            }
          }
          break;
        default:
          console.warn("Helpdesk AI Action unhandled:", action);
      }
    } catch (err) {
      console.error("Helpdesk AI action execution failed:", err);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Update notifications feed
    setNotificationsList(prev => [
      {
        id: Date.now(),
        title: "Dispatched Support Query",
        message: `Your support ticket: "${userMsg.text.substring(0, 40)}..." has been generated.`,
        time: "Just now",
        unread: false,
        type: "chat",
        desc: `You sent a support message regarding: "${userMsg.text}". A helpdesk representative will reply within a few minutes. Check back your support chat logs for responses.`
      },
      ...prev
    ]);

    const geminiKey = localStorage.getItem("aura_gemini_api_key") || "";
    const groqKey = localStorage.getItem("aura_groq_api_key") || "";

    // Live AI Agent mode - Try this first!
    try {
      const apiMessages = [
        ...chatMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: userMsg.text
        }
      ];

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiKey,
          "x-groq-key": groqKey
        },
        body: JSON.stringify({
          messages: apiMessages,
          currentTrack: currentTrack?.title ? currentTrack : null,
          playbackState: {
            isPlaying,
            progressFormatted: "N/A"
          },
          sport: liveMatchSport || "soccer"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact AI server");
      }

      const data = await response.json();
      setIsTyping(false);

      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'support',
        text: data.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      // Add notification for agent response
      setNotificationsList(prev => [
        {
          id: Date.now() + 1,
          title: "New Agent Message",
          message: data.content.substring(0, 50) + "...",
          time: "Just now",
          unread: true,
          type: "chat",
          desc: data.content
        },
        ...prev
      ]);

      if (data.action) {
        executeAIAction(data.action);
      }
    } catch (err) {
      console.warn("Live Helpdesk AI failed, falling back to simulated/mock responses:", err);
      setIsTyping(false);

      if (geminiKey || groqKey) {
        const errorText = `❌ **Sonora AI Support Agent**: ${err.message || "Failed to contact the AI model. Please verify your API Key in Settings."}`;
        setChatMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'support',
          text: errorText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        return;
      }

      // Simulate Agent response (Offline/Mock Mode)
      let replyText = "Thank you for contacting us. A customer support representative will review your message shortly. For immediate guides, please check the Video Tutorials on the right!";
      
      const query = userMsg.text.toLowerCase();
      if (query.includes('visualizer') || query.includes('particle') || query.includes('backdrop')) {
        replyText = "To customize the ambient visualizer and floating particles, navigate to Settings page. There you can adjust frequencies sensitivity or disable/enable particle backdrops anywhere!";
      } else if (query.includes('party') || query.includes('room') || query.includes('sync') || query.includes('share')) {
        replyText = "Listening Rooms let you share a session. Open the expanded player, tap the three dots (options), select 'Listening Party Room', copy the generated code, and share it with friends to play in sync!";
      } else if (query.includes('lyrics') || query.includes('karaoke') || query.includes('mic')) {
        replyText = "Synchronized Karaoke lyrics are toggled via the microphone icon inside the full-screen player playback controls. Tapping any line will instantly seek the track to that time!";
      } else if (query.includes('timer') || query.includes('sleep') || query.includes('fade')) {
        replyText = "Sleep Timer is accessible in the player's options menu (three dots). It counts down from your selected duration, slowly fades out the volume during the final 10 seconds, and pauses the player safely.";
      } else {
        replyText = "To enable the live **Sonora AI support agent** with full guide answers and internet search lookups, please paste your Groq API Key (Recommended for free Llama 3.3) in Settings!";
      }

      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'support',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      // Add notification for agent response
      setNotificationsList(prev => [
        {
          id: Date.now() + 1,
          title: "New Agent Message",
          message: replyText.substring(0, 50) + "...",
          time: "Just now",
          unread: true,
          type: "chat",
          desc: replyText
        },
        ...prev
      ]);
    }
  };

  // Video Tutorials State
  const tutorials = [
    {
      id: 'get-started',
      title: 'Introduction to Sonora Premium',
      duration: '1:45',
      desc: 'Learn about navigation, ambient backdrops, and player features.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-sound-wave-44199-large.mp4'
    },
    {
      id: 'listening-party',
      title: 'Setting up a Shared Listening Party',
      duration: '2:15',
      desc: 'Step-by-step guide to hosting a sync room with friends.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-particles-background-animation-43187-large.mp4'
    },
    {
      id: 'ambient-settings',
      title: 'Fine-tuning the Ambient Engine',
      duration: '1:30',
      desc: 'How to customize visualizer presets, woofers, and particle flows.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-glowing-lines-on-dark-space-background-42171-large.mp4'
    }
  ];

  const [activeVideo, setActiveVideo] = useState(tutorials[0]);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef(null);

  const handleVideoSelect = (video) => {
    setActiveVideo(video);
    setIsPlayingVideo(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (isPlayingVideo) {
      videoRef.current.pause();
      setIsPlayingVideo(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlayingVideo(true);
      }).catch(err => console.log("Video play interrupted", err));
    }
  };

  // Site Updates list
  const siteUpdates = [
    {
      id: 'update-1.4.0',
      version: 'v1.4.0',
      date: 'June 04, 2026',
      badge: 'Major Release',
      title: 'Backdrop Particle Control & Color Extraction Sync',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
      desc: 'Take full command of your ambient experience. We have added granular controls for the backdrop particles engine. You can now toggle particle animations for the dashboard screen, the full cinematic player, everywhere globally, or turn them off completely. We have also resolved the album-artwork theme extraction so that particle colors immediately sync with the active music track.',
      items: [
        'Added control panel to toggle dynamic particles (Everywhere, App Interface Only, Player Only, Off).',
        'Fixed backdrop particles color extraction to follow the album art theme in real-time.',
        'Enhanced visualizer frequency interpolation for smoother animations on desktop.'
      ],
      featureRedirect: {
        path: '/settings',
        label: 'See New Feature Settings'
      }
    },
    {
      id: 'update-1.3.0',
      version: 'v1.3.0',
      date: 'June 02, 2026',
      badge: 'Feature Update',
      title: 'Karaoke Synced Lyrics & Sleep Timer',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
      desc: 'Sing along to your favorite music with our fully synchronized karaoke lyrics interface, and rest easy using the new sleep timer. The lyrics panel highlights active words in real-time and allows timestamp seeking. The sleep timer gracefully fades volume out over 10 seconds to avoid abrupt silences.',
      items: [
        'Interactive synced lyrics module embedded directly inside the expanded player layout.',
        'Intelligent sleep timer utility with smooth volume fade-out filter during the final 10 seconds.',
        'Synchronized rooms (Listening Party) leveraging direct websocket namespace synchronization.'
      ],
      featureRedirect: {
        path: 'player',
        label: 'Open Player to View Lyrics'
      }
    }
  ];

  // Retrieve user from local storage
  const storedUser = localStorage.getItem("sonora_user");
  let currentUserObj = null;
  try {
    currentUserObj = storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    console.error("Error parsing stored user JSON:", e);
  }

  // Dynamic Recent Notifications List State
  const [notificationsList, setNotificationsList] = useState([
    {
      id: 101,
      title: "System Update: Version 1.4.0",
      message: "Backdrop particle controls and real-time color extraction are now live.",
      time: "10 mins ago",
      unread: true,
      type: "update",
      desc: "Version 1.4.0 has been deployed. This update adds options to customize backdrop particles (App Interface, Player screen, Everywhere, or completely Off) and ensures particles colors align with album cover art in real-time."
    },
    {
      id: 102,
      title: "Support Ticket Assigned",
      message: "Your query regarding Listening Party Rooms is assigned to agent Sonora Helper.",
      time: "1 hour ago",
      unread: false,
      type: "chat",
      desc: "Our premium service dispatch has assigned ticket #SN-7728 to agent Sonora Helper. You can query the helpdesk directly in the support chat column."
    },
    {
      id: 103,
      title: "Welcome to Premium Features",
      message: "Karaoke lyrics, shared listening rooms, sleep timer are fully unlocked.",
      time: "2 hours ago",
      unread: false,
      type: "tip",
      desc: "Welcome! As a premium user, you have complete access to the ambient audio suite, Sleep Timers, Shared Listening Parties, and real-time lyrics syncing."
    }
  ]);

  // Load custom messages from database
  useEffect(() => {
    if (!currentUserObj?.uid) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/users/${currentUserObj.uid}/messages`, {
          headers: {
            'x-user-id': currentUserObj.uid
          }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map(msg => ({
            id: msg.id,
            title: `Personal Message from ${msg.sender}`,
            message: msg.message,
            time: new Date(msg.createdAt).toLocaleDateString() + ' ' + new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: msg.is_read === 0,
            type: "tip",
            desc: msg.message,
            isDbMessage: true
          }));
          
          setNotificationsList(prev => {
            const nonDb = prev.filter(n => !n.isDbMessage);
            return [...mapped, ...nonDb];
          });
        }
      } catch (err) {
        console.error("Failed to fetch custom admin messages:", err);
      }
    };

    fetchMessages();
  }, [currentUserObj?.uid]);

  // Inject the global admin notification if enabled
  useEffect(() => {
    if (siteSettings?.admin_notification_message && siteSettings?.enable_admin_notification !== false) {
      setNotificationsList(prev => {
        const clean = prev.filter(n => n.id !== 1);
        return [
          {
            id: 1,
            title: siteSettings.admin_notification_title || "New Feature Available!",
            message: siteSettings.admin_notification_message,
            time: "Just now",
            unread: true,
            type: "update",
            desc: siteSettings.admin_notification_message
          },
          ...clean
        ];
      });
    } else {
      setNotificationsList(prev => prev.filter(n => n.id !== 1));
    }
  }, [siteSettings?.admin_notification_message, siteSettings?.enable_admin_notification, siteSettings?.admin_notification_title]);

  // Actions for Notifications list
  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    
    const notif = notificationsList.find(n => n.id === id);
    if (notif?.isDbMessage && currentUserObj?.uid) {
      try {
        await fetch(`/api/users/${currentUserObj.uid}/messages/${id}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': currentUserObj.uid
          }
        });
      } catch (err) {
        console.error("Failed to delete notification on server:", err);
      }
    }

    setNotificationsList(prev => prev.filter(n => n.id !== id));
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  };

  const markAllRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleNotificationSelect = (notif) => {
    setSelectedNotification(notif);
    // Mark as read
    setNotificationsList(prev => 
      prev.map(n => n.id === notif.id ? { ...n, unread: false } : n)
    );
  };

  const handleFeatureRedirect = (redirect) => {
    setSelectedUpdate(null);
    if (redirect.path === 'player') {
      setIsExpanded(true);
    } else {
      navigate(redirect.path);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Banner */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          {view === 'dashboard' ? (
            <button 
              onClick={() => navigate(-1)} 
              className="group mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500 hover:text-sage-400 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          ) : (
            <button 
              onClick={() => setView('dashboard')} 
              className="group mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sage-400 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Support Dashboard
            </button>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-sage-400 to-indigo-400 bg-clip-text text-transparent">
              {view === 'dashboard' && "Notifications & Support"}
              {view === 'recent' && "Recent Notifications Inbox"}
              {view === 'support' && "Premium Helpdesk & Live Chat"}
              {view === 'updates' && "Platform Updates & Guides"}
            </span>
            <span className="rounded-full bg-sage-400/10 px-2.5 py-0.5 text-xs font-semibold text-sage-400 border border-sage-400/20">
              {view === 'dashboard' ? "Portal" : view.toUpperCase()}
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink-500 font-medium">
            {view === 'dashboard' && "Select a section header to open the dedicated full-screen view."}
            {view === 'recent' && "Manage your inbox notifications. Tap any item to inspect detail logs or delete messages."}
            {view === 'support' && "Converse live with Sonora Support agents or review chat transcript logs."}
            {view === 'updates' && "Explore latest platform update release notes, view feature previews, and test new tools."}
          </p>
        </div>
      </div>

      {/* RENDER VIEW ROUTER */}
      
      {view === 'dashboard' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          
          {/* COLUMN 1: RECENT NOTIFICATIONS PREVIEW */}
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] backdrop-blur-xl p-6 shadow-dock flex flex-col h-[650px] group/col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-sage-400" />
                Recent Feed
              </h2>
              <button 
                onClick={() => setView('recent')}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sage-400 hover:text-white transition bg-sage-400/10 px-2.5 py-1.5 rounded-lg border border-sage-400/10 hover:border-sage-400/30"
              >
                Open Full Screen
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
              {notificationsList.slice(0, 4).map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => setView('recent')}
                  className="relative flex cursor-pointer gap-3.5 rounded-2xl p-4 border border-transparent bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/5 transition-all duration-300"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    notif.type === 'update' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    notif.type === 'chat' ? 'bg-sage-400/10 text-sage-400 border-sage-400/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {notif.type === 'update' && <Sparkles className="h-4 w-4" />}
                    {notif.type === 'chat' && <MessageSquare className="h-4 w-4" />}
                    {notif.type === 'tip' && <Info className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                    <p className="text-[11px] text-ink-500 leading-relaxed font-medium line-clamp-2 mt-0.5">{notif.message}</p>
                    <span className="text-[9px] font-mono text-ink-600 font-semibold uppercase tracking-wider block mt-1.5">{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/[0.06] bg-sage-400/[0.02] rounded-2xl p-4 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-sage-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-sage-400/80 leading-normal font-semibold">
                Tap 'Open Full Screen' above to access deep options, inspect long logs, or delete read entries.
              </p>
            </div>
          </div>

          {/* COLUMN 2: SUPPORT HELPDESK PREVIEW */}
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] backdrop-blur-xl p-6 shadow-dock flex flex-col h-[650px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-sage-400" />
                Support Chat
              </h2>
              {siteSettings?.enable_chat_support !== false && (
                <button 
                  onClick={() => setView('support')}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sage-400 hover:text-white transition bg-sage-400/10 px-2.5 py-1.5 rounded-lg border border-sage-400/10 hover:border-sage-400/30"
                >
                  Go to Chat Screen
                  <Maximize2 className="h-3 w-3" />
                </button>
              )}
            </div>

            {siteSettings?.enable_chat_support !== false ? (
              <>
                <div className="flex-1 flex flex-col bg-black/35 rounded-2xl border border-white/[0.05] overflow-hidden mb-4 p-4 justify-between">
                  <div className="space-y-3 overflow-y-auto max-h-[420px] scrollbar-hide">
                    {chatMessages.slice(-2).map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl p-3 ${msg.sender === 'user' ? 'bg-sage-400 text-ink-950 font-semibold text-[11px]' : 'bg-white/5 text-white text-[11px]'}`}>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center pt-2 text-[10px] text-ink-500 border-t border-white/5">
                    Active logs showing {chatMessages.length} Messages. Open full view to message.
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><Mail className="h-3.5 w-3.5" /></div>
                    <div className="min-w-0"><span className="text-[8px] text-ink-600 uppercase tracking-widest block font-bold">Email</span><span className="text-[11px] font-bold text-white">support@sonora.music</span></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4 animate-pulse">
                  <MessageSquare className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Support Chat Offline</h3>
                <p className="text-xs text-ink-500 leading-relaxed max-w-[200px]">
                  Direct chat with our agents is currently disabled by the system administrator.
                </p>
              </div>
            )}
          </div>

          {/* COLUMN 3: UPDATES & PREVIEWS PREVIEW */}
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] backdrop-blur-xl p-6 shadow-dock flex flex-col h-[650px] justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-sage-400" />
                Updates & Previews
              </h2>
              <button 
                onClick={() => setView('updates')}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sage-400 hover:text-white transition bg-sage-400/10 px-2.5 py-1.5 rounded-lg border border-sage-400/10 hover:border-sage-400/30"
              >
                Inspect Releases
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide">
              {siteUpdates.slice(0, 2).map(up => (
                <div key={up.version} className="relative pl-5 border-l border-white/5">
                  <span className="text-xs font-mono font-extrabold text-sage-400 block">{up.version} &mdash; {up.title}</span>
                  <p className="text-[10px] text-ink-500 mt-1 line-clamp-2">{up.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <div className="flex h-9 w-14 items-center justify-center rounded-lg bg-black/50 border border-white/5 text-sage-400"><Play className="h-3.5 w-3.5 fill-current" /></div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-bold text-white truncate">{activeVideo.title}</h4>
                <p className="text-[9px] text-ink-500">Video Tutorials available inside Releases Screen.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW: RECENT NOTIFICATIONS INBOX */}
      {view === 'recent' && (
        <div className="max-w-3xl mx-auto rounded-3xl border border-white/[0.08] bg-white/[0.015] backdrop-blur-xl p-6 md:p-8 shadow-dock animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between pb-5 border-b border-white/[0.06] mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-sage-400" />
              Notifications Feed ({notificationsList.length} Messages)
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={markAllRead}
                className="text-xs font-bold text-ink-500 hover:text-white transition"
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {notificationsList.length === 0 ? (
              <SonoraEmptyState 
                title="No notifications" 
                description="No recent notifications found. Your inbox is clean!" 
                screenText="CLEAN"
                defaultView={
                  <div className="text-center py-16 text-ink-500 text-sm animate-in fade-in duration-500">
                    No recent notifications found. Your inbox is clean!
                  </div>
                }
              />
            ) : (
              notificationsList.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationSelect(notif)}
                  className={`group relative flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4.5 border transition-all duration-300 ${
                    notif.unread 
                      ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.06]' 
                      : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      notif.unread ? 'bg-sage-400 text-ink-950 border-transparent animate-pulse' : 'bg-white/5 text-ink-400 border-white/5'
                    }`}>
                      <Bell className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white group-hover:text-sage-400 transition-colors truncate">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-ink-500 leading-normal line-clamp-1 mt-0.5">
                        {notif.message}
                      </p>
                      <span className="text-[9px] font-mono text-ink-600 font-semibold uppercase tracking-wider block mt-1">{notif.time}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => deleteNotification(notif.id, e)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: SUPPORT SCREEN */}
      {view === 'support' && (
        siteSettings?.enable_chat_support === false ? (
          <div className="max-w-md mx-auto p-8 rounded-3xl premium-glass border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.6)] text-center space-y-4 animate-in fade-in duration-300">
            <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400">
              <MessageSquare className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Support Chat Disabled</h2>
            <p className="text-sm text-ink-400 leading-relaxed">
              Support Chat has been temporarily disabled by the administrator. Please check back later or contact support via email.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Support Chat Box */}
          <div className="md:col-span-2 rounded-3xl border border-white/[0.08] bg-white/[0.015] p-6 shadow-dock flex flex-col h-[580px]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
              <span>Helpdesk Chat History</span>
              <span className="text-[10px] text-sage-400 font-semibold bg-sage-400/5 px-2 py-0.5 rounded border border-sage-400/15">Ticket Active</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-hide">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
                >
                  <div className={`max-w-[80%] rounded-xl p-3.5 ${
                    msg.sender === 'user' 
                      ? 'bg-sage-400 text-ink-950 font-semibold text-xs' 
                      : 'bg-white/5 border border-white/10 text-white text-xs leading-relaxed'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className={`block text-[8px] mt-1.5 text-right font-mono ${
                      msg.sender === 'user' ? 'text-ink-950/60' : 'text-ink-500'
                    }`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex gap-1 items-center">
                    <span className="h-1 w-1 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1 w-1 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1 w-1 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2.5 pt-3 border-t border-white/[0.06]">
              <input
                type="text"
                placeholder="Ask about Listening Rooms, Sleep Timer, Lyrics..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none focus:border-sage-400/50 transition-all placeholder-ink-600"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-400 text-ink-950 transition hover:bg-sage-300 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Hotline & Details Panel */}
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-6 shadow-dock flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Support Info</h3>
                <p className="text-[11px] text-ink-500">Contact the staff directly via primary support lines.</p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><Mail className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0"><span className="text-[8px] text-ink-600 uppercase tracking-widest block font-bold">Email Support</span><span className="text-xs font-semibold text-white">support@sonora.music</span></div>
                </div>

                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-400/10 text-sage-400 border border-sage-400/20"><Phone className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0"><span className="text-[8px] text-ink-600 uppercase tracking-widest block font-bold">Priority Hotline</span><span className="text-xs font-semibold text-white">+1 (800) 555-MUSE</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-6 shadow-dock flex flex-col gap-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Estimated Wait Times</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-ink-400"><span>Support Chat:</span><span className="text-emerald-400 font-semibold font-mono">&lt; 2 mins</span></div>
                <div className="flex justify-between items-center text-xs text-ink-400"><span>Email Response:</span><span className="text-indigo-400 font-semibold font-mono">&lt; 1 hour</span></div>
              </div>
            </div>
          </div>

        </div>
      ))}

      {/* VIEW: UPDATES & VIDEOS SCREEN */}
      {view === 'updates' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Updates List */}
          <div className="md:col-span-2 rounded-3xl border border-white/[0.08] bg-white/[0.015] p-6 shadow-dock space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-white/[0.06] mb-4">
              All Release Logs
            </h3>

            <div className="space-y-6">
              {siteUpdates.map((update) => (
                <div 
                  key={update.version} 
                  onClick={() => setSelectedUpdate(update)}
                  className="group relative pl-6 border-l border-white/[0.06] cursor-pointer hover:border-sage-400 transition-colors"
                >
                  <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full bg-sage-400/10 text-sage-400 border border-sage-400/25 flex items-center justify-center">
                    <Sparkles className="h-2 w-2" />
                  </span>

                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-extrabold text-sage-400">{update.version}</span>
                    <span className="text-[9px] text-ink-500 font-semibold">{update.date}</span>
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20">
                      {update.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-sage-400 transition-colors leading-snug">
                    {update.title}
                  </h3>
                  <p className="text-xs text-ink-500 mt-1 line-clamp-2">{update.desc}</p>
                  <span className="text-[10px] font-bold text-sage-400 hover:underline mt-2.5 block">Read update detail &rarr;</span>
                </div>
              ))}
            </div>
          </div>

          {/* Video Guides Panel */}
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-6 shadow-dock flex flex-col justify-between h-fit gap-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                <Video className="h-4 w-4 text-sage-400" />
                Video Guides
              </h3>
              <p className="text-[11px] text-ink-500">Learn how to make the most of your Sonora features.</p>
            </div>

            {/* Custom Video Player */}
            <div className="relative aspect-video w-full rounded-2xl border border-white/10 bg-black/60 overflow-hidden group shadow-inner">
              <video 
                ref={videoRef}
                className="w-full h-full object-cover"
                src={activeVideo.videoUrl}
                loop
                muted
                playsInline
              />
              
              <div 
                onClick={toggleVideoPlayback}
                className="absolute inset-0 flex flex-col justify-between p-3.5 bg-gradient-to-t from-black/80 via-black/20 to-black/40 opacity-100 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-sage-400 uppercase tracking-widest border border-white/5">
                    Tutorial
                  </span>
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-mono text-ink-400 border border-white/5">
                    {activeVideo.duration}
                  </span>
                </div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-sage-400 text-ink-950 shadow-xl group-hover:scale-110 transition-transform">
                  {isPlayingVideo ? <Pause className="h-4.5 w-4.5 fill-current" /> : <Play className="h-4.5 w-4.5 fill-current ml-0.5" />}
                </div>

                <div className="text-left mt-auto">
                  <h4 className="text-[11px] font-bold text-white truncate">{activeVideo.title}</h4>
                </div>
              </div>
            </div>

            {/* Guide List Buttons */}
            <div className="grid grid-cols-1 gap-2">
              {tutorials.map((video) => {
                const isActive = activeVideo.id === video.id;
                return (
                  <button
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    className={`flex items-center gap-2.5 rounded-xl p-2.5 text-left transition border ${
                      isActive 
                        ? 'bg-sage-400/10 border-sage-400/20 text-white' 
                        : 'border-transparent hover:bg-white/[0.03] text-ink-400 hover:text-white'
                    }`}
                  >
                    <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded-lg bg-black/50 border border-white/5 overflow-hidden text-sage-400">
                      <Play className="h-2.5 w-2.5 fill-current opacity-70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[10px] font-bold truncate leading-tight">{video.title}</h4>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* DETAIL MODAL: RECENT NOTIFICATION DETAILS */}
      {selectedNotification && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-ink-950/95 p-6 shadow-[0_24px_48px_rgba(0,0,0,0.8)] animate-in scale-in duration-300">
            <button 
              onClick={() => setSelectedNotification(null)}
              className="absolute top-4 right-4 text-ink-500 hover:text-white p-1 rounded-lg transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-400/10 text-sage-400 border border-sage-400/20">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">{selectedNotification.title}</h4>
                <span className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">{selectedNotification.time}</span>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4.5 mb-6">
              <p className="text-xs text-ink-300 leading-relaxed whitespace-pre-wrap">
                {selectedNotification.desc || selectedNotification.message}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { deleteNotification(selectedNotification.id, e); setSelectedNotification(null); }}
                className="flex-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold py-2.5 text-xs transition"
              >
                Delete Message
              </button>
              <button
                onClick={() => setSelectedNotification(null)}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold py-2.5 text-xs transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DETAIL MODAL: PLATFORM UPDATE DETAILS */}
      {selectedUpdate && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/[0.08] bg-ink-950/95 p-6 md:p-8 shadow-[0_24px_48px_rgba(0,0,0,0.8)] my-8 animate-in scale-in duration-300">
            <button 
              onClick={() => setSelectedUpdate(null)}
              className="absolute top-4 right-4 text-ink-500 hover:text-white p-1 rounded-lg transition z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono font-extrabold text-sage-400">{selectedUpdate.version}</span>
              <span className="text-[10px] text-ink-500 font-semibold">{selectedUpdate.date}</span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20">
                {selectedUpdate.badge}
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-white mb-4 leading-snug">
              {selectedUpdate.title}
            </h3>

            {/* Display update image if provided */}
            {selectedUpdate.image && (
              <div className="w-full aspect-video rounded-2xl border border-white/[0.08] overflow-hidden mb-5">
                <img 
                  src={selectedUpdate.image} 
                  alt={selectedUpdate.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-5 mb-6 space-y-4">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-500 block mb-1">Release Summary</span>
                <p className="text-xs text-ink-300 leading-relaxed">
                  {selectedUpdate.desc}
                </p>
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-500 block mb-2">Key Changelogs</span>
                <ul className="space-y-2">
                  {selectedUpdate.items.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-ink-400 leading-relaxed items-start">
                      <ChevronRight className="h-3.5 w-3.5 text-sage-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedUpdate.featureRedirect && (
                <button
                  onClick={() => handleFeatureRedirect(selectedUpdate.featureRedirect)}
                  className="flex-1 sm:flex-initial rounded-xl bg-sage-400 hover:bg-sage-300 text-ink-950 font-bold px-6 py-3 text-xs transition uppercase tracking-wider text-center"
                >
                  {selectedUpdate.featureRedirect.label}
                </button>
              )}
              <button
                onClick={() => setSelectedUpdate(null)}
                className="flex-1 sm:flex-initial rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold px-6 py-3 text-xs transition uppercase tracking-wider text-center"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
