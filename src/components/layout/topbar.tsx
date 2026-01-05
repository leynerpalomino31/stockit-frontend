// src/components/layout/topbar.tsx
'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Moon, Sun, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import Logo from '../../../public/brand/logo'; // ← deja tu import como lo tienes

export default function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const router = useRouter();

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout'); // limpia cookies httpOnly en el backend
    } finally {
      router.replace('/login'); // lleva al login sí o sí
    }
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-slate-900/70 border-b">
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Marca */}
        <Logo height={10} showName />

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-brand text-blue text-sm font-medium
                       hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand/30"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>

          <button
            aria-label="Cambiar tema"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="h-9 w-9 grid place-content-center rounded-xl border border-slate-200 dark:border-slate-800
                       hover:bg-slate-100 dark:hover:bg-slate-800"
            title={isDark ? 'Tema claro' : 'Tema oscuro'}
          >
            {isDark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
        </div>
      </div>
    </header>
  );
}
