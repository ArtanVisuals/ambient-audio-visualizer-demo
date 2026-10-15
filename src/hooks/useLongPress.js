// A single reusable long-press handler factory for track context menus
export function useLongPress(onLongPress, delay = 500) {
  const timer = { current: null };

  const start = (e, track) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    timer.current = setTimeout(() => {
      onLongPress(track, clientX, clientY);
    }, delay);
  };

  const end = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return { start, end };
}
