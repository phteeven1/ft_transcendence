'use client';

import { useEffect, useRef } from 'react';

/**
 * Shows the browser's native "Leave site?" dialog when the user closes the tab,
 * reloads, or navigates away. Must stay synchronous — no async work here.
 *
 * Note: Browsers show their own generic text; custom messages are ignored in
 * Chrome, Firefox, and Safari.
 */
export function useBeforeUnloadWarning(enabled: boolean) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabledRef.current) return;

      event.preventDefault();
      // Empty string is enough for current Chrome / Firefox / Safari.
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
