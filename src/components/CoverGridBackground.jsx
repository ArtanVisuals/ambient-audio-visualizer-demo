import React, { useEffect, useRef, useState } from 'react';

export function CoverGridBackground({ active = true }) {
  const [covers, setCovers] = useState([]);
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const rectRef = useRef(null); // Cache bounding rect

  const scrollXRef = useRef(0);
  const scrollYRef = useRef(0);
  const speedRef = useRef(1); // 1 = full speed, 0 = stopped
  const isHoveredRef = useRef(false);
  const mousePosRef = useRef({ x: -1000, y: -1000 });
  const lastLeaveTimeRef = useRef(0);
  const wasHoveredRef = useRef(false);
  const stepXRef = useRef(0);
  const stepYRef = useRef(0);
  const animationFrameIdRef = useRef(null);

  // Layout metrics caching to avoid layout thrashing
  const containerW = useRef(0);
  const containerH = useRef(0);
  const gridW = useRef(0);
  const gridH = useRef(0);
  const tileW = useRef(0);
  const tileH = useRef(0);
  const gridPaddingX = useRef(16);
  const gridPaddingY = useRef(16);
  const gapValue = useRef(12);
  const magnifiedIndices = useRef([]);
  const frameCount = useRef(0);
  const hasMeasured = useRef(false);

  // Fetch local covers
  useEffect(() => {
    fetch('/api/local-covers')
      .then(res => res.json())
      .then(data => {
        let uniqueCovers = data || [];
        
        // Fallback array if no covers exist
        if (uniqueCovers.length === 0) {
           uniqueCovers = [
             "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
             "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f9af?w=300",
             "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300"
           ];
        }

        const patternSize = 4;
        const cols = 24;
        const rows = 20;
        
        // Generate a 4x4 pattern of randomized covers
        const patternBlock = [];
        for (let i = 0; i < patternSize * patternSize; i++) {
          patternBlock.push(uniqueCovers[Math.floor(Math.random() * uniqueCovers.length)]);
        }

        // Fill the 24x20 grid repeating the 4x4 pattern
        const grid = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const patternRow = r % patternSize;
            const patternCol = c % patternSize;
            grid.push(patternBlock[patternRow * patternSize + patternCol]);
          }
        }
        setCovers(grid);
      })
      .catch(err => {
        console.error("Failed to load local covers, using unsplash fallback:", err);
        const fallbackCovers = [
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
          "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f9af?w=300",
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300"
        ];
        const patternSize = 4;
        const cols = 24;
        const rows = 20;
        const patternBlock = [];
        for (let i = 0; i < patternSize * patternSize; i++) {
          patternBlock.push(fallbackCovers[Math.floor(Math.random() * fallbackCovers.length)]);
        }
        const grid = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const patternRow = r % patternSize;
            const patternCol = c % patternSize;
            grid.push(patternBlock[patternRow * patternSize + patternCol]);
          }
        }
        setCovers(grid);
      });
  }, []);

  // Continuous animation loop (conditional based on active prop)
  useEffect(() => {
    if (!active) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    const updateLayoutMetrics = () => {
      const container = containerRef.current;
      const grid = gridRef.current;
      if (!container || !grid) return;

      const tiles = grid.getElementsByClassName('cover-tile');
      if (tiles.length > 1) {
        const firstTileRect = tiles[0].getBoundingClientRect();
        const secondTileRect = tiles[1].getBoundingClientRect();
        
        const w = firstTileRect.width;
        const h = firstTileRect.height;
        
        if (w > 0 && h > 0) {
          const containerRect = container.getBoundingClientRect();
          containerW.current = containerRect.width;
          containerH.current = containerRect.height;

          const gridRect = grid.getBoundingClientRect();
          gridW.current = gridRect.width;
          gridH.current = gridRect.height;

          tileW.current = w;
          tileH.current = h;
          gapValue.current = (secondTileRect.left - firstTileRect.left) - w;

          gridPaddingX.current = firstTileRect.left - gridRect.left;
          gridPaddingY.current = firstTileRect.top - gridRect.top;

          stepXRef.current = w + gapValue.current;
          stepYRef.current = h + gapValue.current;
          
          hasMeasured.current = true;
        }
      }
    };

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      hasMeasured.current = false;
      rectRef.current = null;
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const tick = () => {
      if (!containerRef.current || !gridRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      let targetSpeed = 1;
      frameCount.current++;
      
      if (isHoveredRef.current) {
        targetSpeed = 0;
      } else if (now - lastLeaveTimeRef.current < 3000) {
        targetSpeed = 0;
      }

      // Smooth deceleration and acceleration
      const lerpFactor = targetSpeed === 0 ? 0.04 : 0.02;
      speedRef.current += (targetSpeed - speedRef.current) * lerpFactor;

      // Update offsets
      const baseSpeedX = 0.25;
      const baseSpeedY = 0.15;
      scrollXRef.current += baseSpeedX * speedRef.current;
      scrollYRef.current += baseSpeedY * speedRef.current;

      const grid = gridRef.current;
      const tiles = grid.getElementsByClassName('cover-tile');

      // Make sure layout metrics are populated
      if (tiles.length > 0 && !hasMeasured.current) {
        updateLayoutMetrics();
      }

      // Seamless scrolling wrapping based on 4x4 period
      if (stepXRef.current > 0 && stepYRef.current > 0) {
        const wrapWidth = stepXRef.current * 4;
        const wrapHeight = stepYRef.current * 4;
        scrollXRef.current = scrollXRef.current % wrapWidth;
        scrollYRef.current = scrollYRef.current % wrapHeight;
      }

      // Translate the grid container with a -40% baseline offset
      const baselineX = 0.40 * gridW.current;
      const baselineY = 0.40 * gridH.current;
      const gridX = -baselineX + scrollXRef.current;
      const gridY = -baselineY + scrollYRef.current;
      grid.style.transform = `translate(${gridX}px, ${gridY}px)`;

      // Apply magnification logic (throttled to every 2nd frame, and optimized to nearby tiles)
      if (tiles.length > 0) {
        if (isHoveredRef.current) {
          if (frameCount.current % 2 === 0) {
            const maxDist = 280; // Interaction radius
            const cursorGridX = mousePosRef.current.x - gridX - gridPaddingX.current;
            const cursorGridY = mousePosRef.current.y - gridY - gridPaddingY.current;

            const centerCol = Math.floor(cursorGridX / (tileW.current + gapValue.current));
            const centerRow = Math.floor(cursorGridY / (tileH.current + gapValue.current));

            const colRadius = Math.ceil(maxDist / (tileW.current + gapValue.current));
            const rowRadius = Math.ceil(maxDist / (tileH.current + gapValue.current));

            const startRow = Math.max(0, centerRow - rowRadius);
            const endRow = Math.min(19, centerRow + rowRadius); // gridRows = 20
            const startCol = Math.max(0, centerCol - colRadius);
            const endCol = Math.min(23, centerCol + colRadius); // gridCols = 24

            const nextMagnifiedIndices = [];

            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                const idx = r * 24 + c;
                const tile = tiles[idx];
                if (!tile) continue;

                // Center of this tile relative to the container
                const tileLeft = gridX + gridPaddingX.current + c * (tileW.current + gapValue.current);
                const tileTop = gridY + gridPaddingY.current + r * (tileH.current + gapValue.current);
                const tileCenterX = tileLeft + tileW.current / 2;
                const tileCenterY = tileTop + tileH.current / 2;

                const distX = tileCenterX - mousePosRef.current.x;
                const distY = tileCenterY - mousePosRef.current.y;
                const dist = Math.sqrt(distX * distX + distY * distY);

                if (dist < maxDist) {
                  const intensity = 1 - Math.pow(dist / maxDist, 1.2);
                  const scale = 1 + (intensity * 0.6);
                  const zIndex = Math.round(intensity * 10);
                  const opacity = 0.15 + (intensity * 0.85);

                  tile.style.transition = 'none';
                  tile.style.transform = `scale(${scale})`;
                  tile.style.zIndex = zIndex;
                  tile.style.opacity = opacity;

                  nextMagnifiedIndices.push(idx);
                }
              }
            }

            // Reset tiles that are no longer magnified
            for (let k = 0; k < magnifiedIndices.current.length; k++) {
              const idx = magnifiedIndices.current[k];
              if (!nextMagnifiedIndices.includes(idx)) {
                const tile = tiles[idx];
                if (tile) {
                  tile.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out, z-index 0.3s ease-out';
                  tile.style.transform = 'scale(1)';
                  tile.style.zIndex = 0;
                  tile.style.opacity = 0.15;
                }
              }
            }

            magnifiedIndices.current = nextMagnifiedIndices;
          }
          wasHoveredRef.current = true;
        } else if (wasHoveredRef.current) {
          // Reset all currently magnified tiles
          for (let k = 0; k < magnifiedIndices.current.length; k++) {
            const idx = magnifiedIndices.current[k];
            const tile = tiles[idx];
            if (tile) {
              tile.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out, z-index 0.3s ease-out';
              tile.style.transform = 'scale(1)';
              tile.style.zIndex = 0;
              tile.style.opacity = 0.15;
            }
          }
          magnifiedIndices.current = [];
          wasHoveredRef.current = false;
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [active]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    if (!rectRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect();
    }
    const rect = rectRef.current;
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    isHoveredRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    mousePosRef.current = { x: -1000, y: -1000 };
    lastLeaveTimeRef.current = Date.now();
    rectRef.current = null;
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0 z-0 overflow-hidden bg-[#05050a]"
    >
       <div 
         ref={gridRef}
         className="grid gap-3 p-4 w-[180%] h-[180%] will-change-transform"
         style={{
           transform: 'translate(-40%, -40%)',
           gridTemplateColumns: 'repeat(24, 1fr)',
           gridTemplateRows: 'repeat(20, 1fr)'
         }}
       >
          {covers.map((src, i) => (
             <div 
                key={i} 
                className="cover-tile relative aspect-square rounded-xl bg-ink-800 shadow-md transition-none"
                style={{
                  backgroundImage: `url('${src}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.15,
                  transformOrigin: 'center center'
                }}
             />
          ))}
       </div>
       {/* Vignette overlay to darken the edges and the center slightly so the login card stands out */}
       <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#05050a_85%)]" />
       {/* Purple ambient glow behind the login card */}
       <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.15)_0%,_transparent_50%)]" />
    </div>
  );
}
