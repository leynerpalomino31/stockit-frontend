'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Guard from '@/components/auth-guard';

type Person   = { id: string; fullName: string; documentId?: string | null };
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

// Tamaño grande para combos de reportes
const BIG_PAGE_SIZE = 10_000;

export default function ReportesPage() {
  // Combos base
  const peopleQ = useQuery({
    queryKey: ['people-mini'],
    queryFn: async () =>
      (
        await api.get<{ items: Person[] }>('/api/people', {
          params: { pageSize: BIG_PAGE_SIZE },
        })
      ).data.items,
  });

  const assetsQ = useQuery({
    queryKey: ['assets-mini'],
    queryFn: async () =>
      (
        await api.get<{ items: Asset[] }>('/api/assets', {
          params: { pageSize: BIG_PAGE_SIZE },
        })
      ).data.items,
  });

  const usersQ = useQuery({
    queryKey: ['users-mini'],
    queryFn: async () =>
      (
        await api.get<{ items: User[] }>('/api/users', {
          params: { pageSize: BIG_PAGE_SIZE },
        })
      ).data.items,
  });

  // Combos para filtros de inventario
  const categoriesQ = useQuery({
    queryKey: ['categories-mini'],
    queryFn: async () =>
      (
        await api.get<{ items: Category[] }>('/api/catalog/categories', {
          params: { pageSize: 1000 },
        })
      ).data.items,
  });

  const sitesQ = useQuery({
    queryKey: ['sites-mini'],
    queryFn: async () =>
      (
        await api.get<{ items: Site[] }>('/api/sites', {
          params: { pageSize: 500 },
        })
      ).data.items,
  });

  const locationsQ = useQuery({
    queryKey: ['locations-mini'],
    queryFn: async () =>
      (
        await api.get<{ items: Location[] }>('/api/catalog/locations', {
          params: { pageSize: 2000 },
        })
      ).data.items,
  });

  // Filtros de fecha (movimientos)
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // Filtros movimientos (checklists)
  const [movAssetIds, setMovAssetIds] = useState<string[]>([]);
  const [movPersonIds, setMovPersonIds] = useState<string[]>([]);
  const [movAdminIds, setMovAdminIds] = useState<string[]>([]);

  // Búsquedas locales en listas de movimientos
  const [assetSearch, setAssetSearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

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
     MOVIMIENTOS (CSV unificado)
  ========================== */
  const downloadMovements = () => {
    const params = new URLSearchParams();

    if (from) params.set('from', from);
    if (to) params.set('to', to);

    movAssetIds.forEach((id) => params.append('assetId', id));
    movPersonIds.forEach((id) => params.append('personId', id));
    movAdminIds.forEach((id) => params.append('createdById', id));

    const qs = params.toString();
    const url = qs
      ? `/api/reports/movements.csv?${qs}`
      : '/api/reports/movements.csv';

    download(url, 'movimientos.csv');
  };

  // Filtros locales para mostrar listas (activos / custodios / admins)
  const filteredAssets =
    assetsQ.data?.filter((a) => {
      const term = assetSearch.trim().toLowerCase();
      if (!term) return true;
      return (
        a.tag.toLowerCase().includes(term) ||
        a.name.toLowerCase().includes(term)
      );
    }) ?? [];

  const filteredPeople =
    peopleQ.data?.filter((p) => {
      const term = personSearch.trim().toLowerCase();
      if (!term) return true;
      return (
        (p.fullName || '').toLowerCase().includes(term) ||
        (p.documentId || '').toLowerCase().includes(term)
      );
    }) ?? [];

  const filteredAdmins =
    usersQ.data?.filter((u) => {
      const term = adminSearch.trim().toLowerCase();
      if (!term) return true;
      const base = `${u.name || ''} ${u.email || ''}`.toLowerCase();
      return base.includes(term);
    }) ?? [];

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
              Filtra por activos, custodios y usuarios administrativos. Si no seleccionas nada, trae todos los movimientos del rango.
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

          {/* Checklists de movimientos */}
          <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-3">
            {/* Activos fijos */}
            <div className="border rounded-lg p-3 flex flex-col gap-2">
              <p className="text-sm font-medium">Activos fijos</p>
              <input
                className="w-full rounded-lg border px-3 py-1.5 text-xs mb-2"
                placeholder="Buscar por código / nombre"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
              />
              <div className="border rounded-lg px-3 py-2 max-h-60 overflow-auto space-y-1">
                {filteredAssets.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border"
                      checked={movAssetIds.includes(a.id)}
                      onChange={(e) =>
                        setMovAssetIds((prev) =>
                          toggleValue(prev, a.id, e.target.checked),
                        )
                      }
                    />
                    <span>
                      {a.tag} — {a.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Usuarios (custodios) */}
            <div className="border rounded-lg p-3 flex flex-col gap-2">
              <p className="text-sm font-medium">Usuarios (custodios)</p>
              <input
                className="w-full rounded-lg border px-3 py-1.5 text-xs mb-2"
                placeholder="Buscar por nombre / documento"
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
              />
              <div className="border rounded-lg px-3 py-2 max-h-60 overflow-auto space-y-1">
                {filteredPeople.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border"
                      checked={movPersonIds.includes(p.id)}
                      onChange={(e) =>
                        setMovPersonIds((prev) =>
                          toggleValue(prev, p.id, e.target.checked),
                        )
                      }
                    />
                    <span>
                      {p.fullName}
                      {p.documentId ? ` — ${p.documentId}` : ''}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Usuarios administrativos */}
            <div className="border rounded-lg p-3 flex flex-col gap-2">
              <p className="text-sm font-medium">Usuarios administrativos</p>
              <input
                className="w-full rounded-lg border px-3 py-1.5 text-xs mb-2"
                placeholder="Buscar por nombre / correo"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
              <div className="border rounded-lg px-3 py-2 max-h-60 overflow-auto space-y-1">
                {filteredAdmins.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border"
                      checked={movAdminIds.includes(u.id)}
                      onChange={(e) =>
                        setMovAdminIds((prev) =>
                          toggleValue(prev, u.id, e.target.checked),
                        )
                      }
                    />
                    <span>{u.name || u.email}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm"
              onClick={downloadMovements}
            >
              Descargar movimientos
            </button>
          </div>
        </div>
      </section>
    </Guard>
  );
}
