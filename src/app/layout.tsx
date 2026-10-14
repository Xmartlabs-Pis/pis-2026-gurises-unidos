import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import { Toaster } from '@/components/ui/toast';
import './globals.css';

const mulish = Mulish({
  variable: '--font-mulish',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Gurises Unidos — Alcance',
  description:
    'Alcance poblacional de los proyectos de Gurises Unidos: niñas, niños, adolescentes, familias e instituciones.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${mulish.variable} h-full antialiased`}>
      <body className="flex h-full flex-col font-sans">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
