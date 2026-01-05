'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';

type Site = { id: string; name: string; code: string };
type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number; pages: number };

export default function SitesPanel() {
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState<Partial<Site>>({ name: '', code: '' });

  // Listado de sedes
  const sites = useQuery({
    queryKey: ['sites', q],
    queryFn: async () =>
      (await api.get<Paginated<Site>>('/api/sites', { params: { q, pageSize: 50 } })).data,
  });

  // Crear
  const create = useMutation({
    mutationFn: async (data: Partial<Site>) => (await api.post<Site>('/api/sites', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      setForm({ name: '', code: '' });
    },
  });

  // Actualizar
  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Site> }) =>
      (await api.patch<Site>(`/api/sites/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      setEditing(null);
      setForm({ name: '', code: '' });
    },
  });

  // Eliminar
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/sites/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: (form.name || '').trim(),
      code: (form.code || '').trim().toUpperCase(),
    };
    if (!payload.name || !payload.code) {
      alert('Nombre y código son obligatorios');
      return;
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold mb-3">Sedes</h2>

      {/* Buscador + total */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar sede por nombre o código…"
            className="w-full rounded-full border px-10 py-2 text-sm bg-white dark:bg-slate-950
                       focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-700"
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
        <span className="text-xs text-slate-500">
          {sites.data ? `${sites.data.total} resultado(s)` : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Formulario */}
        <form onSubmit={submit} className="border rounded-xl bg-white dark:bg-slate-900 p-4 space-y-3">
          <h3 className="font-medium">{editing ? 'Editar sede' : 'Nueva sede'}</h3>

          <div className="grid gap-1.5">
            <label className="text-sm">Nombre</label>
            <input
              className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
              value={form.name || ''}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Piedecuesta"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">Código</label>
            <input
              className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
              value={form.code || ''}
              onChange={(e) =>
                setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))
              }
              placeholder="PIE"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({ name: '', code: '' });
                }}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700"
            >
              {editing ? 'Guardar cambios' : 'Crear sede'}
            </button>
          </div>
        </form>

        {/* Lista */}
        <div className="border rounded-xl bg-white dark:bg-slate-900 p-4">
          <h3 className="font-medium mb-2">Listado de sedes</h3>
          {sites.isLoading && <div className="text-sm text-slate-500">Cargando…</div>}
          <ul className="divide-y max-h-[55vh] overflow-y-auto">
            {sites.data?.items.map((s) => (
              <li key={s.id} className="py-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">Código: {s.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setForm({ name: s.name, code: s.code });
                    }}
                    className="rounded-xl border px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('¿Eliminar esta sede?')) return;
                      try {
                        await remove.mutateAsync(s.id);
                      } catch (e: any) {
                        alert(e?.response?.data?.error ?? 'No se pudo eliminar');
                      }
                    }}
                    className="rounded-xl border px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
            {(sites.data?.items.length ?? 0) === 0 && !sites.isLoading && (
              <li className="py-6 text-center text-sm text-slate-500">Sin sedes.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
