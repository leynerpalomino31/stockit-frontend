'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRoutesList } from '@/lib/hooks';
import Guard from '@/components/auth-guard';

function fDateTime(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
}

function fDateOnly(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString();
}

// Badge de estado con colores
function statusBadgeClass(status?: string) {
  const s = (status || '').toUpperCase();

  // COMPLETADA → verde
  if (s.includes('COMPLET')) {
    return 'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-900/40 dark:text-emerald-200';
  }

  // PROGRAMADA → amarillo
  if (s.includes('PROGRAM')) {
    return 'inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/60 dark:bg-amber-900/40 dark:text-amber-200';
  }

  // EN CURSO → azul
  if (s.includes('CURSO')) {
    return 'inline-flex items-center rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:border-sky-500/60 dark:bg-sky-900/40 dark:text-sky-200';
  }

  // CANCELADA → rojo
  if (s.includes('CANCEL')) {
    return 'inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:border-rose-500/60 dark:bg-rose-900/40 dark:text-rose-200';
  }

  // BORRADOR / otros → gris
  return 'inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200';
}

export default function RoutesPage() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useRoutesList(q);

  // Paginación local
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Reset página cuando cambia búsqueda o pageSize
  useEffect(() => {
    setPage(1);
  }, [q, pageSize]);

  const routes = data ?? [];
  const totalItems = routes.length;

  const totalPages = useMemo(
    () => (totalItems === 0 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize))),
    [totalItems, pageSize]
  );

  const paginatedRoutes = useMemo(() => {
    if (totalItems === 0) return [];
    const start = (page - 1) * pageSize;
    return routes.slice(start, start + pageSize);
  }, [routes, page, pageSize, totalItems]);

  const showingCount =
    totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);

  return (
    <Guard>
      <section className="space-y-3">
        {/* Buscador */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por dirección, contacto, activo…"
              className="w-full rounded-full border px-10 py-2 text-sm bg-white dark:bg-slate-950
                       focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Bloque: Mostrar X + texto + botones paginación */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
          {/* Selector "Mostrar:" */}
          <div className="flex items-center gap-2">
            <span>Mostrar:</span>
            <select
              className="rounded-xl border px-2 py-1.5 text-xs bg-white dark:bg-slate-950"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) || 10)}
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>por página</span>
          </div>

          {/* Texto + botones paginación */}
          <div className="flex items-center gap-4">
            <span>
              {totalItems === 0
                ? 'Sin rutas para mostrar.'
                : `Mostrando ${showingCount} de ${totalItems} rutas`}
            </span>

            {totalItems > 0 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-2 py-1 rounded-lg border disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <button
                  type="button"
                  className="px-2 py-1 rounded-lg border disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {isLoading && (
            <div className="text-sm text-slate-500">Cargando rutas…</div>
          )}
          {!isLoading && totalItems === 0 && (
            <div className="text-sm text-slate-500">Sin resultados.</div>
          )}

          {paginatedRoutes.map((r) => {
            const title = `${r.code.toString().padStart(3, '0')} - ${r.type}`; // type ya viene en español
            const createdAt = (r as any).createdAt as string | undefined;
            const scheduledDate =
              ((r as any).scheduledDate as string | undefined) ?? r.date;

            return (
              <div
                key={r.id}
                className="rounded-xl border bg-white dark:bg-slate-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold truncate max-w-[260px]"
                        title={title}
                      >
                        {title}
                      </span>

                      {/* Badge de estado con color */}
                      <span className={statusBadgeClass(r.status as string)}>
                        {r.status}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {/* Fechas */}
                      <div>
                        <span className="text-slate-500">Creada:&nbsp;</span>
                        <b>{fDateTime(createdAt)}</b>
                      </div>
                      <div>
                        <span className="text-slate-500">Programada:&nbsp;</span>
                        {/* SOLO FECHA, SIN HORA */}
                        <b>{fDateOnly(scheduledDate)}</b>
                      </div>

                      {/* Teléfono + Dirección */}
                      <div>
                        <span className="text-slate-500">Teléfono:&nbsp;</span>
                        <b>{r.contactPhone || '—'}</b>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">Dirección:&nbsp;</span>
                        <b title={r.address || ''}>{r.address || '—'}</b>
                      </div>

                      {/* Paciente */}
                      <div className="truncate sm:col-span-2">
                        <span className="text-slate-500">Paciente:&nbsp;</span>
                        <b title={r.contact || ''}>
                          {r.contact || '—'}
                          {r.contactDoc
                            ? ` - ${r.contactDoc.replace(/^Doc:\s*/i, '')}`
                            : ''}
                        </b>
                      </div>

                      {/* Activos */}
                      <div className="truncate sm:col-span-2">
                        <span className="text-slate-500">Activos:&nbsp;</span>
                        <b className="break-words">
                          {r.assetTags?.length ? r.assetTags.join(', ') : '—'}
                        </b>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/routes/${r.id}`}
                    className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white inline-flex items-center gap-1 shrink-0"
                  >
                    Ver
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </Guard>
  );
}
