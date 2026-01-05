'use client';

import { useState, type ChangeEvent } from 'react';
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

  // Helper genérico para <select multiple>
  function handleMultiChange(setter: (values: string[]) => void) {
    return (e: ChangeEvent<HTMLSelectElement>) => {
      const values = Array.from(e.target.selectedOptions).map((o) => o.value);
      setter(values);
    };
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
     - Filtros multiselección
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

  // Movimientos por equipo
  const downloadMovByAsset = () => {
    if (!assetId) return toast.error('Selecciona un equipo');
    const p = new URLSearchParams();
    p.set('assetId', assetId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    download(`/api/reports/movements.csv?${qs}`, 'movimientos_por_equipo.csv');
  };

  // Movimientos por custodio
  const downloadMovByPerson = () => {
    if (!personId) return toast.error('Selecciona un usuario/custodio');
    const p = new URLSearchParams();
    p.set('personId', personId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    download(`/api/reports/movements.csv?${qs}`, 'movimientos_por_usuario.csv');
  };

  // Movimientos por usuario administrativo
  const downloadMovByAdmin = () => {
    if (!adminId) return toast.error('Selecciona un usuario administrativo');
    const p = new URLSearchParams();
    p.set('createdById', adminId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    download(`/api/reports/movements.csv?${qs}`, 'movimientos_por_admin.csv');
  };

  // Movimientos globales (sin filtros de entidad)
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

            {/* Estado (multi) */}
            <div>
              <label className="text-xs text-slate-500">Estado (multi)</label>
              <select
                multiple
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
                value={invStatus}
                onChange={handleMultiChange(setInvStatus)}
              >
                <option value="IN_STOCK">En bodega</option>
                <option value="ASSIGNED">Asignado</option>
                <option value="IN_REPAIR">En reparación</option>
                <option value="LOST">Perdido</option>
                <option value="DISPOSED">De baja</option>
              </select>
            </div>

            {/* Categoría (multi) */}
            <div>
              <label className="text-xs text-slate-500">Categoría (multi)</label>
              <select
                multiple
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
                value={invCategoryIds}
                onChange={handleMultiChange(setInvCategoryIds)}
              >
                {categoriesQ.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.code ? ` (${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sede (multi) */}
            <div>
              <label className="text-xs text-slate-500">Sede (multi)</label>
              <select
                multiple
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
                value={invSiteIds}
                onChange={handleMultiChange(setInvSiteIds)}
              >
                {sitesQ.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bodega asignada (multi) */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className="text-xs text-slate-500">Bodega asignada (multi)</label>
              <select
                multiple
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
                value={invWarehouseIds}
                onChange={handleMultiChange(setInvWarehouseIds)}
              >
                {locationsQ.data?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
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
