import { Header } from '@/components/header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-public flex min-h-full flex-1 flex-col">
      <Header />
      <main className="bg-background [&>section:nth-child(odd)]:bg-background flex-1 pt-16 [&>section:nth-child(even)]:bg-white">
        {children}
      </main>
    </div>
  );
}
