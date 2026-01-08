'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Guard from '@/components/auth-guard';

type Person   = { id: string; fullName: string };
type Asset    = { id: string; tag: string; name: string };
type User     = { id: string; email: string; name?: string | null };
type Category = { id: string; name: string; code?: string | null };
type Site     = { id: string; name: string };
type Location = { id: string; name: string; siteId?: string | null };

// Opciones de estado para inventario
const STATUS_OPTIONS = [
  { value: 'IN_STOCK',  label: 'En bodega' },
  { value: 'ASSIGNED',  label: 'Asignado' },
  { value: 'IN_REPAIR', label: 'En reparación' },
  { value: 'LOST',      label: 'Perdido' },
  { value: 'DISPOSED',  label: 'De baja' },
];

export default function ReportesPage() {
  // Combos base
  const peopleQ = useQuery({
    queryKey: ['people-mini'],
    queryFn: async () =>
      (await api.get<{ items: Person[] }>('/api/people', { params: { pageSize: 500 } })).data.items,
  });

  const assetsQ = useQuery({
    queryKey: ['assets-mini'],
    queryFn: async () =>
      (await api.get<{ items: Asset[] }>('/api/assets', { params: { pageSize: 500 } })).data.items,
  });

  const usersQ = useQuery({
    queryKey: ['users-mini'],
    queryFn: async () =>
      (await api.get<{ items: User[] }>('/api/users', { params: { pageSize: 500 } })).data.items,
  });

  // Combos para filtros de inventario
  const categoriesQ = useQuery({
    queryKey: ['categories-mini'],
    queryFn: async () =>
      (await api.get<{ items: Category[] }>('/api/catalog/categories', { params: { pageSize: 1000 } }))
        .data.items,
  });

  const sitesQ = useQuery({
    queryKey: ['sites-mini'],
    queryFn: async () =>
      (await api.get<{ items: Site[] }>('/api/sites', { params: { pageSize: 500 } })).data.items,
  });

  const locationsQ = useQuery({
    queryKey: ['locations-mini'],
    queryFn: async () =>
      (await api.get<{ items: Location[] }>('/api/catalog/locations', { params: { pageSize: 2000 } }))
        .data.items,
  });

  // Filtros de fecha (movimientos)
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // Filtros movimientos
  const [assetId, setAssetId] = useState<string>('');
  const [personId, setPersonId] = useState<string>('');
  const [adminId, setAdminId] = useState<string>('');

  // Filtros inventario
  const [invQ, setInvQ] = useState('');
  const [invStatus, setInvStatus] = useState<string[]>([]);
  const [invCategoryIds, setInvCategoryIds] = useState<string[]>([]);
  const [invSiteIds, setInvSiteIds] = useState<string[]>([]);
  const [invWarehouseIds, setInvWarehouseIds] = useState<string[]>([]);

  // Helper genérico para checkboxes
  function toggleValue(current: string[], value: string, checked: boolean) {
    if (checked) {
      if (current.includes(value)) return current;
      return [...current, value];
    }
    return current.filter((v) => v !== value);
  }

  // Helper descarga
  async function download(url: string, filename: string) {
    try {
      const res = await api.get(url, {
        responseType: 'blob',
        withCredentials: true,
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo descargar');
    }
  }

  /* ========================
     INVENTARIO (CSV)
  ========================== */
  const downloadInventory = () => {
    const params = new URLSearchParams();
    if (invQ) params.set('q', invQ);

    invStatus.forEach((s) => params.append('status', s));
    invCategoryIds.forEach((id) => params.append('categoryId', id));
    invSiteIds.forEach((id) => params.append('siteId', id));
    invWarehouseIds.forEach((id) => params.append('assignedWarehouseId', id));

    const qs = params.toString();
    const url = qs
      ? `/api/reports/inventory.csv?${qs}`
      : '/api/reports/inventory.csv';

    download(url, 'inventario.csv');
  };

  /* ========================
     MOVIMIENTOS (CSV)
  ========================== */

  const downloadMovByAsset = () => {
    if (!assetId) return toast.error('Selecciona un equipo');
    const p = new URLSearchParams();
    p.set('assetId', assetId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    download(`/api/reports/movements.csv?${qs}`, 'movimientos_por_equipo.csv');
  };

  const downloadMovByPerson = () => {
    if (!personId) return toast.error('Selecciona un usuario/custodio');
    const p = new URLSearchParams();
    p.set('personId', personId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    download(`/api/reports/movements.csv?${qs}`, 'movimientos_por_usuario.csv');
  };

  const downloadMovByAdmin = () => {
    if (!adminId) return toast.error('Selecciona un usuario administrativo');
    const p = new URLSearchParams();
    p.set('createdById', adminId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    download(`/api/reports/movements.csv?${qs}`, 'movimientos_por_admin.csv');
  };

  const downloadMovAll = () => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    const url = qs
      ? `/api/reports/movements.csv?${qs}`
      : '/api/reports/movements.csv';
    download(url, 'movimientos_globales.csv');
  };

  return (
    <Guard>
      <section className="space-y-6">
        <h1 className="text-lg font-semibold">Reportes</h1>

        {/* INVENTARIO */}
        <div className="border rounded-xl bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-medium">Inventario (CSV)</h2>
            <p className="text-xs text-slate-500">
              Filtros multiselección por estado, categoría, sede y bodega asignada.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {/* Búsqueda libre */}
            <div>
              <label className="text-xs text-slate-500">Buscar</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={invQ}
                onChange={(e) => setInvQ(e.target.value)}
                placeholder="código / nombre / serie / custodio"
              />
            </div>

            {/* Estado (checklist) */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Estado (multi)</label>
              <div className="border rounded-lg px-3 py-2 max-h-40 overflow-auto space-y-1">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border"
                      checked={invStatus.includes(opt.value)}
                      onChange={(e) =>
                        setInvStatus((prev) => toggleValue(prev, opt.value, e.target.checked))
                      }
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categoría (checklist) */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Categoría (multi)</label>
              <div className="border rounded-lg px-3 py-2 max-h-40 overflow-auto space-y-1">
                {categoriesQ.data?.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border"
                      checked={invCategoryIds.includes(c.id)}
                      onChange={(e) =>
                        setInvCategoryIds((prev) =>
                          toggleValue(prev, c.id, e.target.checked),
                        )
                      }
                    />
                    <span>
                      {c.name}
                      {c.code ? ` (${c.code})` : ''}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sede (checklist) */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Sede (multi)</label>
              <div className="border rounded-lg px-3 py-2 max-h-40 overflow-auto space-y-1">
                {sitesQ.data?.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border"
                      checked={invSiteIds.includes(s.id)}
                      onChange={(e) =>
                        setInvSiteIds((prev) =>
                          toggleValue(prev, s.id, e.target.checked),
                        )
                      }
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bodega asignada (checklist) */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className="text-xs text-slate-500 block mb-1">
                Bodega asignada (multi)
              </label>
              <div className="border rounded-lg px-3 py-2 max-h-48 overflow-auto space-y-1">
                {locationsQ.data?.map((l) => (
                  <label
                    key={l.id}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border"
                      checked={invWarehouseIds.includes(l.id)}
                      onChange={(e) =>
                        setInvWarehouseIds((prev) =>
                          toggleValue(prev, l.id, e.target.checked),
                        )
                      }
                    />
                    <span>{l.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm"
              onClick={downloadInventory}
            >
              Descargar inventario
            </button>
          </div>
        </div>

        {/* MOVIMIENTOS */}
        <div className="border rounded-xl bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-medium">Movimientos (CSV)</h2>
            <p className="text-xs text-slate-500">
              Puedes filtrar por equipo, custodio, usuario administrativo o descargar todo.
            </p>
          </div>

          {/* Filtro de fechas */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs text-slate-500">Desde</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Hasta</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {/* Por equipo */}
            <div className="border rounded-lg p-3 flex flex-col gap-2">
              <p className="text-sm font-medium">Por equipo</p>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              >
                <option value="">— Seleccionar equipo —</option>
                {assetsQ.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag} — {a.name}
                  </option>
                ))}
              </select>
              <button
                className="self-end rounded-lg border px-3 py-2 text-sm"
                onClick={downloadMovByAsset}
              >
                Descargar
              </button>
            </div>

            {/* Por custodio */}
            <div className="border rounded-lg p-3 flex flex-col gap-2">
              <p className="text-sm font-medium">Por usuario (custodio)</p>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                <option value="">— Seleccionar usuario —</option>
                {peopleQ.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
              <button
                className="self-end rounded-lg border px-3 py-2 text-sm"
                onClick={downloadMovByPerson}
              >
                Descargar
              </button>
            </div>

            {/* Por usuario administrativo */}
            <div className="border rounded-lg p-3 flex flex-col gap-2">
              <p className="text-sm font-medium">Por usuario administrativo</p>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
              >
                <option value="">— Seleccionar usuario —</option>
                {usersQ.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
              <button
                className="self-end rounded-lg border px-3 py-2 text-sm"
                onClick={downloadMovByAdmin}
              >
                Descargar
              </button>
            </div>

            {/* Global */}
            <div className="border rounded-lg p-3 flex flex-col gap-2">
              <p className="text-sm font-medium">Global (sin filtro por entidad)</p>
              <p className="text-xs text-slate-500">
                Usa solo el rango de fechas; si no eliges fechas, descarga todos los movimientos.
              </p>
              <button
                className="self-end rounded-lg border px-3 py-2 text-sm"
                onClick={downloadMovAll}
              >
                Descargar global
              </button>
            </div>
          </div>
        </div>
      </section>
    </Guard>
  );
}
