// src/components/layout/app-shell.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const ALL_LINKS = [
  { href: '/assets',   label: 'Inventario',           key: 'assets' },
  { href: '/entregas', label: 'Entregas y Recogidas', key: 'handover' },
  { href: '/routes',   label: 'Rutas',                key: 'routes' },
  { href: '/people',   label: 'Población',            key: 'people' },
  { href: '/reportes', label: 'Reportes',             key: 'reports' },
  { href: '/settings', label: 'Configuraciones',      key: 'settings' },
];

type User = {
  id: string | number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  documentId?: string | null;
};

function initialsFrom(name?: string | null, email?: string | null) {
  const base = (name && name.trim()) || (email && email.trim()) || '';
  if (!base) return 'U';
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

// 🔹 Links visibles según el rol
function getNavLinksForRole(role?: string | null) {
  const r = (role || '').toUpperCase();

  // CONDUCTOR → solo Rutas
  if (r === 'CONDUCTOR') {
    return ALL_LINKS.filter((l) => l.href === '/routes');
  }

  // INVENTARIO → Inventario, Rutas, Entregas, Población, Reportes
  if (r === 'INVENTARIO') {
    return ALL_LINKS.filter((l) =>
      ['/assets', '/routes', '/entregas', '/people', '/reportes'].includes(l.href),
    );
  }

  // ADMINISTRATIVO → solo Inventario (si quieres darle más, amplías aquí)
  if (r === 'ADMINISTRATIVO') {
    return ALL_LINKS.filter((l) => l.href === '/assets');
  }

  // Otros roles: todo
  return ALL_LINKS;
}

export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const isLogin = pathname === '/login';

  useEffect(() => {
    // En /login no protegemos nada
    if (isLogin) {
      setLoadingUser(false);
      return;
    }

    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchMe = async () => {
      try {
        const res = await api.get('/api/auth/me');
        const me = res.data as User;

        setUser(me);

        // Persistimos el rol para otros componentes (p. ej. auth-guard)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_role', (me.role || '').toUpperCase());
        }

        // 🔹 Validar si la ruta actual está permitida para este rol
        const allowedLinks = getNavLinksForRole(me.role);
        const allowedPaths = allowedLinks.map((l) => l.href);

        if (allowedPaths.length > 0) {
          const isAllowed = allowedPaths.some(
            (base) =>
              pathname === base || pathname.startsWith(base + '/'),
          );

          if (!isAllowed) {
            // Redirige a la primera ruta permitida para ese rol
            router.replace(allowedLinks[0].href);
            return;
          }
        }
      } catch (err) {
        // Token inválido/expirado → limpiar y mandar a login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_role');
        }
        router.replace('/login');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchMe();
  }, [isLogin, router, pathname]);

  // Links de navegación filtrados por rol
  const navLinks = useMemo(
    () => getNavLinksForRole(user?.role),
    [user?.role],
  );

  const onLogout = async () => {
    try {
      setLoggingOut(true);
      try {
        await api.post('/api/auth/logout');
      } catch {
        // si falla, igual limpiamos
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
      }
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  // En /login no mostramos el shell
  if (isLogin) {
    return <>{children}</>;
  }

  if (loadingUser) {
    return (
      <div className="min-h-dvh grid place-items-center bg-slate-50 text-slate-600 text-sm">
        Cargando sesión…
      </div>
    );
  }

  const displayName =
    user?.name?.trim() || user?.email || 'Usuario administrativo';
  const displayRole = user?.role || 'Administrativo';
  const initials = initialsFrom(user?.name, user?.email);

  // Home según el primer link permitido
  const homeHref = navLinks[0]?.href || '/assets';

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80">
        <div className="mx-auto max-w-6xl px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Brand */}
            <Link href={homeHref} className="flex items-center gap-3">
              <Image
                src="/brand/Recurso_2isotipo_color.svg"
                alt="STOCKit"
                width={36}
                height={36}
                className="ring-slate-200 object-contain bg-white dark:hidden"
                priority
              />
              <Image
                src="/brand/Recurso_2isotipo_blanco.svg"
                alt="STOCKit"
                width={36}
                height={36}
                className="hidden ring-1 ring-slate-700 object-contain dark:inline-block dark:bg-slate-900"
                priority
              />
              <div className="font-semibold tracking-tight">Activos Fijos</div>
            </Link>

            {/* Usuario + Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-emerald-600 text-white grid place-items-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="leading-tight text-right">
                  <div
                    className="text-sm font-medium truncate max-w-[160px]"
                    title={displayName}
                  >
                    {displayName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {displayRole}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                disabled={loggingOut}
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
              </button>
            </div>
          </div>

          <nav className="mt-3 flex gap-1 overflow-x-auto">
            {navLinks.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(l.href + '/');
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
                    active
                      ? 'bg-sky-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4">{children}</main>
    </div>
  );
}
