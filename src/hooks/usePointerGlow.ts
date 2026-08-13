import { useEffect, useRef } from 'react';

/**
 * Tracks the pointer position over an element as two CSS custom
 * properties (`--glow-x`, `--glow-y`, in px relative to the element),
 * for a radial-gradient "glow follows the cursor" effect driven entirely
 * in CSS. Deliberately not React state and not GSAP: `pointermove` can
 * fire dozens of times a second, and routing that through a re-render
 * (or even a tween) would be wasted work for something that's purely
 * decorative. `element.style.setProperty` writes straight to the
 * element's own inline style, bypassing React's render cycle, and the
 * listener is on the element itself rather than `window`, so there's no
 * cost at all while the pointer is elsewhere on the page.
 */
export function usePointerGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
      element.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
    };

    element.addEventListener('pointermove', onPointerMove);
    return () => element.removeEventListener('pointermove', onPointerMove);
  }, []);

  return ref;
}
