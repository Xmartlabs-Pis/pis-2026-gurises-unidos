import { Header } from '@/components/header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-public bg-background flex min-h-full flex-1 flex-col">
      <Header />
      <main className="bg-background flex-1 pt-16">{children}</main>
    </div>
  );
}
