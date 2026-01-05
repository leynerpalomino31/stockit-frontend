// src/app/login/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [documentId, setDocumentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Si ya hay token, mandamos al usuario directo al inventario
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.replace('/assets');
    }
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload = {
        documentId: documentId.trim(),
        password,
      };

      const res = await api.post('/api/auth/login', payload);

      // 👇 asumimos que el backend devuelve { accessToken, user }
      const { accessToken, user } = res.data || {};

      if (!accessToken) {
        throw new Error('Respuesta inválida del servidor (sin accessToken).');
      }

      // Guardar token para el API
      localStorage.setItem('access_token', accessToken);

      // Guardar ID del usuario (para trazabilidad en backend)
      if (user?.id) {
        localStorage.setItem('user_id', String(user.id));
      } else {
        localStorage.removeItem('user_id');
      }

      // Guardar rol (para que el Guard sepa si es CONDUCTOR u otro rol)
      if (user?.role) {
        localStorage.setItem('user_role', String(user.role));
      } else {
        localStorage.removeItem('user_role');
      }

      // (Opcional) guardar también el nombre si lo quieres usar en la UI
      if (user?.name) {
        localStorage.setItem('user_name', String(user.name));
      } else {
        localStorage.removeItem('user_name');
      }

      // Redirigir directo al inventario
      router.replace('/assets');
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'No fue posible iniciar sesión. Verifica tus datos.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh grid place-items-center bg-slate-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Ingresar a Activos Fijos MTD
        </h1>
        <p className="text-sm text-slate-600 mb-6 text-center">
          Solo usuarios administrativos pueden acceder.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Número de documento
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  // Icono ojo tachado
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5 0-9-4-10-8 0-1.09.25-2.13.7-3.06" />
                    <path d="M6.1 6.1A9.77 9.77 0 0 1 12 4c5 0 9 4 10 8-.27.96-.69 1.86-1.23 2.68" />
                    <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
                    <path d="m3 3 18 18" />
                  </svg>
                ) : (
                  // Icono ojo normal
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 text-white py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
