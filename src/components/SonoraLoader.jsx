/**
 * SonoraLoader — Custom loading element inspired by UIverse (aryamitra06/silent-lion-21).
 * Three animated bars with a smooth RGB color-cycling effect.
 *
 * Usage:
 *   <SonoraLoader />                   — default size
 *   <SonoraLoader size="lg" />          — larger variant (full-page loaders)
 *   <SonoraLoader size="sm" />          — compact variant (inline loaders)
 *   <SonoraLoader label="Loading..." /> — optional text below the bars
 *   <SonoraLoader fullScreen />         — centered full-screen overlay
 */
export function SonoraLoader({ size = 'md', label, fullScreen = false, className = '' }) {
  const sizeMap = {
    sm: { barW: 3, barH: 16, tallH: 28, gap: 4, fontSize: '0.65rem' },
    md: { barW: 4, barH: 22, tallH: 38, gap: 5, fontSize: '0.75rem' },
    lg: { barW: 5, barH: 28, tallH: 48, gap: 6, fontSize: '0.8rem' },
  };

  const s = sizeMap[size] || sizeMap.md;

  const bars = (
    <div className={`sonora-loader ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: `${s.gap}px` }}>
        <span
          className="sonora-loader-bar"
          style={{ width: `${s.barW}px`, height: `${s.barH}px`, borderRadius: '10px', animationDelay: '0s' }}
        />
        <span
          className="sonora-loader-bar"
          style={{ width: `${s.barW}px`, height: `${s.tallH}px`, borderRadius: '10px', animationDelay: '0.25s' }}
        />
        <span
          className="sonora-loader-bar"
          style={{ width: `${s.barW}px`, height: `${s.barH}px`, borderRadius: '10px', animationDelay: '0.5s' }}
        />
      </div>
      {label && (
        <span style={{ fontSize: s.fontSize, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
          {label}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#05050a',
        }}
      >
        {bars}
      </div>
    );
  }

  return bars;
}
