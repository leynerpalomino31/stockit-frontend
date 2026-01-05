// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import AppShell from '@/components/layout/app-shell';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'STOCKit',
  description: 'Gestión de inventarios de activos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>

        {/* Toaster visible en toda la app */}
        <Toaster position="top-right" richColors closeButton theme="system" expand />
      </body>
    </html>
  );
}
