import { Header } from '@/components/header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-public flex min-h-full flex-1 flex-col">
      <Header />
      <main className="bg-background flex-1">{children}</main>
    </div>
  );
}
