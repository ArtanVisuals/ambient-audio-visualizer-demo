// AlbumArt — renders cover art as a background image.
// Removed the 3 decorative absolute divs that were added to every instance
// (they caused unnecessary paint work when 20-30 cards are on screen).
export function AlbumArt({ cover, className = "", children }) {
  const isGradient = !cover || cover.startsWith('linear-gradient');

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
        background: isGradient ? (cover || 'linear-gradient(135deg, #1a1c1b 0%, #111412 100%)') : 'transparent',
      }}
    >
      {!isGradient && (
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement.style.background = 'linear-gradient(135deg, #1a1c1b 0%, #111412 100%)';
          }}
        />
      )}
      {children}
    </div>
  );
}
