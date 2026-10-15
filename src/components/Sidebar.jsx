import { useState, useEffect } from "react";
import {
  Compass,
  Heart,
  Home,
  Library,
  ListMusic,
  Search,
  Settings,
  SlidersHorizontal,
  ChevronLeft,
  Tv,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

const primaryItems = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Search", icon: Search, path: "/search" },
  { label: "Library", icon: Library, path: "/library" },
];
const secondaryItems = [
  { label: "Liked Songs", icon: Heart, path: "/liked" },
  { label: "Playlists", icon: ListMusic, path: "/playlists" },
  { label: "Live TV", icon: Tv, path: "/tv" },
  { label: "Settings", icon: Settings, path: "/settings" },
];
function NavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-200 ${
          isActive
            ? "bg-white/[0.075] text-ink-100"
            : "text-ink-400 hover:bg-white/[0.045] hover:text-ink-100"
        }`
      }
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const { queue, currentTrackIndex, siteSettings } = usePlayer();
  const [collapsed, setCollapsed] = useState(false);

  // Safe calculation to prevent NaN or crashes if context is still initializing
  const idx = typeof currentTrackIndex === 'number' ? currentTrackIndex : 0;
  const upcomingCount = Math.max(0, (queue?.length || 0) - (idx + 1));

  // Update the CSS variables when collapsed state changes
  useEffect(() => {
    if (collapsed) {
      document.documentElement.style.setProperty('--sidebar-collapsed', '1');
    } else {
      document.documentElement.style.setProperty('--sidebar-collapsed', '0');
    }
  }, [collapsed]);

  return (
    <>
      <aside 
        className={`fixed left-0 top-0 z-40 hidden h-screen shrink-0 border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-3xl py-6 md:block ${
          collapsed ? 'px-3' : 'px-3 lg:px-5'
        }`}
        style={{ 
          width: 'var(--sidebar-effective-width)',
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex h-full flex-col lg:items-stretch">
          <nav className="space-y-1 w-full">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex w-full items-center ${
                      collapsed ? 'justify-center' : 'justify-center lg:justify-start'
                    } gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-200 ${
                      isActive
                        ? "bg-white/[0.075] text-ink-100"
                        : "text-ink-400 hover:bg-white/[0.045] hover:text-ink-100"
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                  <span className={`${collapsed ? 'hidden' : 'hidden lg:inline'}`}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="my-6 h-px w-full bg-white/[0.06]" />

          <nav className="space-y-1 w-full">
            {secondaryItems
              .filter((item) => !(item.path === "/tv" && siteSettings?.enable_live_tv === false))
              .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex w-full items-center ${
                      collapsed ? 'justify-center' : 'justify-center lg:justify-start'
                    } gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-200 ${
                      isActive
                        ? "bg-white/[0.075] text-ink-100"
                        : "text-ink-400 hover:bg-white/[0.045] hover:text-ink-100"
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                  <span className={`${collapsed ? 'hidden' : 'hidden lg:inline'}`}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className={`mt-auto ${collapsed ? 'hidden' : 'hidden lg:block'} rounded-xl border border-white/[0.06] bg-white/[0.035] p-4`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-500">Upcoming</p>
              <span className="flex h-5 items-center justify-center rounded-full bg-sage-400/10 px-2 text-[10px] font-bold text-sage-400">
                {upcomingCount}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-300">
              {upcomingCount === 0 
                ? "No tracks coming up next. Add some songs to the queue!" 
                : `${upcomingCount} track${upcomingCount === 1 ? '' : 's'} remaining in your session.`}
            </p>
          </div>
        </div>
      </aside>

      {/* Toggle Arrow Button — visible on md+ screens */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="sidebar-toggle-btn fixed z-50 hidden md:flex items-center justify-center"
        style={{
          top: '50%',
          left: 'var(--sidebar-effective-width)',
          transform: 'translateY(-50%)',
          transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, box-shadow 0.2s ease',
          width: '24px',
          height: '48px',
          borderRadius: '0 12px 12px 0',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: 'none',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          color: 'rgba(255, 255, 255, 0.4)',
        }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft
          className="h-4 w-4"
          strokeWidth={2}
          style={{
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>
    </>
  );
}
