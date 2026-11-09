import { Header } from '@/components/header';
import { PublicGeographyProvider } from '@/components/public-geography';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-public bg-background flex min-h-full flex-1 flex-col">
      <PublicGeographyProvider>
        <Header />
        <main className="bg-background flex-1">{children}</main>
      </PublicGeographyProvider>
    </div>
  );
}
