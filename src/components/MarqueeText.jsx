import { useRef, useEffect, useState } from 'react';

/**
 * MarqueeText — shows text normally when it fits, and smoothly scrolls
 * (marquee-style) when it overflows the container.
 */
export function MarqueeText({ text = '', className = '', style = {}, speed = 40, pauseMs = 1500 }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const textSpan = inner.firstElementChild;
      if (!textSpan) return;
      const textWidth = textSpan.getBoundingClientRect().width - 64; // subtract the 4rem/64px padding-right
      const isOverflowing = textWidth > outer.clientWidth;

      if (isOverflowing) {
        setOverflow(true);
        // segment width including the gap
        const segmentWidth = textWidth + 64; 
        setDuration(segmentWidth / speed);
      } else {
        setOverflow(false);
      }
    };

    const timer = setTimeout(measure, 150);
    const ro = new ResizeObserver(measure);
    ro.observe(outer);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [text, speed]);

  const animStyle = overflow
    ? {
        animation: `marquee-scroll ${duration}s linear infinite`,
        animationDelay: `${pauseMs}ms`,
      }
    : {};

  const outerStyle = {
    ...style,
    whiteSpace: 'nowrap',
    ...(overflow && {
      maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
    })
  };

  return (
    <span
      ref={outerRef}
      className={`marquee-outer block overflow-hidden ${className}`}
      style={outerStyle}
      title={text}
    >
      <span
        ref={innerRef}
        className="marquee-inner inline-block"
        style={animStyle}
      >
        <span style={{ paddingRight: overflow ? '5rem' : '0', display: 'inline-block' }}>{text}</span>
        {overflow && (
          <span aria-hidden="true" style={{ paddingRight: '5rem', display: 'inline-block' }}>{text}</span>
        )}
      </span>
    </span>
  );
}
