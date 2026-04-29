/*
  Mobile screen detection hook.

  This custom React hook checks whether the current browser width is below the app's mobile breakpoint.

  Provenance:
  - React (no date) ‘useState’ [online]. Available from:
    https://react.dev/reference/react/useState
    Used for storing whether the screen is currently mobile-sized.

  - React (no date) ‘useEffect’ [online]. Available from:
    https://react.dev/reference/react/useEffect
    Used for setting up and cleaning up the screen size listener.

  - MDN (no date) ‘Window: matchMedia() method’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
    Used for listening to changes in the browser viewport width.

  - MDN (no date) ‘Window: innerWidth property’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth
    Used for checking the current browser width.
*/

import * as React from "react";

// Sets the width where the app switches between mobile and desktop layout
const MOBILE_BREAKPOINT = 768;

// Returns true when the browser width is below the mobile breakpoint
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  // Watches the viewport width and updates the mobile state when it changes
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}