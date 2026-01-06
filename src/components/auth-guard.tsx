'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api';

const ROLE_DRIVER = 'CONDUCTOR';
const ROLE_INVENTORY = 'INVENTARIO';
const ROLE_ADMIN = 'ADMINISTRATIVO';

type GuardProps = {
  children: ReactNode;
};

const HOME_BY_ROLE: Record<string, string> = {
  [ROLE_DRIVER]: '/routes',
  [ROLE_INVENTORY]: '/assets',
  [ROLE_ADMIN]: '/assets',
};

function getHomeForRole(role?: string | null) {
  const r = (role || '').toUpperCase();
  return HOME_BY_ROLE[r] || '/assets';
}

function isPathAllowedForRole(role: string | null, pathname: string | null) {
  if (!pathname) return true;
  const r = (role || '').toUpperCase();

  const isAllowed = (bases: string[]) =>
    bases.some(
      (base) => pathname === base || pathname.startsWith(base + '/'),
    );

  // CONDUCTOR → solo rutas
  if (r === ROLE_DRIVER) {
    return isAllowed(['/routes']);
  }

  // INVENTARIO → activos, rutas, población, entregas/recogidas y reportes
  if (r === ROLE_INVENTORY) {
    return isAllowed(['/assets', '/routes', '/people', '/entregas','/reports']);
  }

  // ADMINISTRATIVO → mismos módulos que inventario (ajusta si quieres restringir)
  if (r === ROLE_ADMIN) {
    return isAllowed(['/assets', '/reports']);
  }

  // Otros roles: sin restricciones adicionales
  return true;
}

/**
 * Guard:
 * - Si no hay token => redirige a /login
 * - Si hay token:
 *    - Lee user_role de localStorage
 *    - Valida que la ruta actual esté permitida para ese rol
 *    - Si no está permitida => redirige a la "home" de ese rol
 */
export default function Guard({ children }: GuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // La página de login no se protege
    if (pathname?.startsWith('/login')) {
      setReady(true);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      // Sin token → a login
      router.replace('/login');
      return;
    }

    let role: string | null = null;
    if (typeof window !== 'undefined') {
      role = localStorage.getItem('user_role');
    }

    // Si la ruta NO está permitida para este rol, redirige a su home
    if (!isPathAllowedForRole(role, pathname)) {
      const target = getHomeForRole(role);
      if (pathname !== target) {
        router.replace(target);
      }
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    );
  }

  return <>{children}</>;
}
