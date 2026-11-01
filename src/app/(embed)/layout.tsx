import type { Metadata } from 'next';
import { EmbedHeightReporter } from '@/components/embed/embed-height-reporter';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="embed-root theme-public text-foreground flex min-h-full flex-1 flex-col">
      <main className="flex-1">
        <EmbedHeightReporter>{children}</EmbedHeightReporter>
      </main>
    </div>
  );
}
