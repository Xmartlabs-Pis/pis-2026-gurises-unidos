import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

let mediaQuery: MediaQueryList | undefined;

function getMediaQuery() {
  mediaQuery ??= window.matchMedia(MOBILE_MEDIA_QUERY);
  return mediaQuery;
}

function subscribe(onChange: () => void) {
  const query = getMediaQuery();
  query.addEventListener('change', onChange);

  return () => query.removeEventListener('change', onChange);
}

function getSnapshot() {
  return getMediaQuery().matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
