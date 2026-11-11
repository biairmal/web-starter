"use client";

import { useEffect } from "react";

/**
 * Asks before leaving a form with unsaved changes (APP_FLOW 5.13): the
 * browser's own prompt on reload or close, and a confirmation on a click on
 * any same-origin link, which the Next.js router would otherwise follow.
 */
export function useUnsavedGuard(dirty: boolean, message: string): void {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") {
        return;
      }
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [dirty, message]);
}
