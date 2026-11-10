'use client';

import { useEffect, useRef } from 'react';

const EMBED_HEIGHT_MESSAGE_TYPE = 'gurises-unidos:embed-height';

export function EmbedHeightReporter({
  origins,
  children,
}: {
  origins: string[];
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current!;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(content.getBoundingClientRect().height);
      for (const origin of origins) {
        window.parent.postMessage({ type: EMBED_HEIGHT_MESSAGE_TYPE, height }, origin);
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [origins]);

  return <div ref={contentRef}>{children}</div>;
}
