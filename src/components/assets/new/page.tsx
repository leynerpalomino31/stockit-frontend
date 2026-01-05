// src/app/assets/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type Asset, type Paginated } from '@/lib/api';
import { useState } from 'react';

type Category = { id: string; name: string };
type Location = { id: string; name: string };

export default function NewAssetPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Paginated<Category>>('/api/catalog/categories', { params: { pageSize: 100 } })).data.items
  });

  const locs = useQuery({
    queryKey: ['locations'],
    queryFn: async () => (await api.get<Paginated<Location>>('/api/catalog/locations', { params: { pageSize: 100 } })).data.items
  });

  const create = useMutation({
    mutationFn: async (data: any) => (await api.post<Asset>('/api/assets', data)).data
  });

  const onSubmit = async (form: HTMLFormElement) => {
    form.preventDefault();
    const fd = new FormData(form);
    const payload: any = {
      tag: fd.get('tag')?.toString().trim(),
      name: fd.get('name')?.toString().trim(),
      categoryId: fd.get('categoryId')?.toString() || null,
      brand: fd.get('brand')?.toString().trim() || null,
      model: fd.get('model')?.toString().trim() || null,
      serial: fd.get('serial')?.toString().trim() || null,
      currentLocationId: fd.get('locationId')?.toString() || null,
      status: 'IN_STOCK' as const,
    };

    if (!payload.tag || !payload.name || !payload.categoryId) {
      alert('Tag, Nombre y Categoría son obligatorios.'); return;
    }

    try {
      setSaving(true);
      const asset = await create.mutateAsync(payload);
      router.replace(`/assets/${asset.id}`);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'No se pudo crear el activo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">Nuevo activo</h1>

      <form onSubmit={(e)=>onSubmit(e.currentTarget)} className="grid gap-4 max-w-2xl border rounded-xl bg-white dark:bg-slate-900 p-4">
        <div className="grid gap-1.5">
          <label className="text-sm">Tag / Código *</label>
          <input name="tag" className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950" placeholder="ACT-0002" />
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm">Nombre *</label>
          <input name="name" className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950" placeholder="Portátil Dell" />
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm">Categoría *</label>
          <select name="categoryId" className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950">
            <option value="">Selecciona…</option>
            {cats.data?.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm">Ubicación (opcional)</label>
          <select name="locationId" className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950">
            <option value="">—</option>
            {locs.data?.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <label className="text-sm">Marca</label>
            <input name="brand" className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm">Modelo</label>
            <input name="model" className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm">Serie</label>
            <input name="serial" className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={()=>history.back()} className="rounded-xl border px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Guardando…' : 'Crear activo'}
          </button>
        </div>
      </form>
    </section>
  );
}
