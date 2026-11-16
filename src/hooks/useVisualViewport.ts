import { useEffect, useState } from 'react';

export interface VisualViewportState {
  viewportHeight: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
}

/**
 * Tracks window.visualViewport on iOS Safari / Android Chrome so fullscreen modals,
 * bottom sheets and the live chat composer stay precisely above the virtual keyboard.
 * Also publishes CSS custom properties `--vvh` and `--vv-top` on `<html>`.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => {
    if (typeof window === 'undefined') {
      return { viewportHeight: 800, offsetTop: 0, isKeyboardOpen: false };
    }
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    return {
      viewportHeight: Math.round(h),
      offsetTop: Math.round(top),
      isKeyboardOpen: window.innerHeight - h > 140
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    const update = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      const roundedH = Math.max(240, Math.round(h));
      const roundedTop = Math.max(0, Math.round(top));
      const activeTag = document.activeElement?.tagName;
      const isInputFocused =
        activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
      const keyboardOpen = window.innerHeight - h > 140 || (isInputFocused && window.innerHeight - h > 80);

      root.style.setProperty('--vvh', `${roundedH}px`);
      root.style.setProperty('--vv-top', `${roundedTop}px`);

      setState((prev) => {
        if (
          prev.viewportHeight === roundedH &&
          prev.offsetTop === roundedTop &&
          prev.isKeyboardOpen === keyboardOpen
        ) {
          return prev;
        }
        return {
          viewportHeight: roundedH,
          offsetTop: roundedTop,
          isKeyboardOpen: keyboardOpen
        };
      });
    };

    update();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  return state;
}
