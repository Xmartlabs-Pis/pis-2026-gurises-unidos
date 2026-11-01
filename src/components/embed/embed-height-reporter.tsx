'use client';

import { useEffect, useRef } from 'react';

const EMBED_HEIGHT_MESSAGE_TYPE = 'gurises-unidos:embed-height';

export function EmbedHeightReporter({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current!;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(content.getBoundingClientRect().height);
      window.parent.postMessage({ type: EMBED_HEIGHT_MESSAGE_TYPE, height }, '*');
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return <div ref={contentRef}>{children}</div>;
}
