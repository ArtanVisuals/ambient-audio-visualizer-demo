import { Home, Search, Library, Heart, Settings, Tv } from "lucide-react";
import { NavLink } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

const navItems = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Search", icon: Search, path: "/search" },
  { label: "Library", icon: Library, path: "/library" },
  { label: "Live TV", icon: Tv, path: "/tv" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function MobileNav() {
  const { isExpanded, morphism, siteSettings } = usePlayer();

  // Hide completely when the full-screen player is open on mobile
  if (isExpanded) return null;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-2 pb-4 pt-2 md:hidden premium-glass"
      data-morphism={morphism}
    >
      {navItems
        .filter((item) => !(item.path === "/tv" && siteSettings?.enable_live_tv === false))
        .map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] transition duration-200 ${
                isActive ? "text-ink-100" : "text-ink-500 hover:text-ink-300"
              }`
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
