'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import ImportPeopleModal from '@/components/people/import-people-modal';
import Guard from '@/components/auth-guard';

type PersonType = 'NOMINA' | 'OPS' | 'PACIENTE' | 'TERCERO';

type Person = {
  id: string;
  documentId: string | null;
  fullName: string;
  type: PersonType;
  eps: string | null;
  department: string | null;
  municipality: string | null;
  address: string | null;
  finalStatus: string | null;     // 'ACTIVO' | 'INACTIVO'
  inactivityType: string | null;  // opciones del select
  inactivityDate: string | null;  // YYYY-MM-DD
};

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

type PageSizeOption = 10 | 50 | 100 | 'ALL';

const TYPE_LABEL: Record<PersonType, string> = {
  NOMINA: 'Nómina',
  OPS: 'OPS',
  PACIENTE: 'Paciente',
  TERCERO: 'Tercero',
};

const INACTIVITY_TYPES = [
  'FALLECIDO',
  'EGRESO BARTHEL',
  'CAMBIO DE PRESTADOR',
  'SALIDA COLABORADOR',
  'EGRESO ADMINISTRATIVO',
] as const;

const normalizeType = (t?: any): PersonType =>
  t === 'NOMINA' || t === 'OPS' || t === 'TERCERO' || t === 'PACIENTE' ? t : 'PACIENTE';

const normalizeFinalStatus = (s?: any): 'ACTIVO' | 'INACTIVO' | null => {
  const v = String(s ?? '').trim().toLowerCase();
  if (v === 'activo' || v === 'act' || v === 'active' || v === '1' || v === 'a') return 'ACTIVO';
  if (v.includes('inactiv') || v === '0' || v === 'i' || v === 'inactive') return 'INACTIVO';
  return null;
};

const labelFinalStatus = (s?: string | null) =>
  normalizeFinalStatus(s) === 'INACTIVO' ? 'Inactivo' : 'Activo';

/* Debounce helper */
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function PeoplePage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 350);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const [form, setForm] = useState<Partial<Person>>({
    type: 'PACIENTE',
    finalStatus: 'ACTIVO',
  });

  // Paginación
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [page, setPage] = useState<number>(1);

  // Reset página cuando cambia búsqueda o pageSize
  useEffect(() => {
    setPage(1);
  }, [dq, pageSize]);

  const people = useQuery({
    queryKey: ['people', { dq, page, pageSize }],
    queryFn: async () => {
      try {
        const params: any = {
          page,
          pageSize: pageSize === 'ALL' ? 1000 : pageSize, // "Todos" -> un tamaño grande
        };
        if (dq) params.q = dq;
        const { data } = await api.get<Paginated<Person>>('/api/people', { params });
        return data;
      } catch (e: any) {
        const msg = e?.response?.data?.error || 'No se pudo obtener usuarios';
        toast.error(msg);
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: typeof pageSize === 'number' ? pageSize : 100,
          pages: 1,
        } as Paginated<Person>;
      }
    },
    keepPreviousData: true,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const create = useMutation({
    mutationFn: async (data: Partial<Person>) =>
      (await api.post<Person>('/api/people', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      setForm({ type: 'PACIENTE', finalStatus: 'ACTIVO' });
      toast.success('Usuario creado');
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Person> }) =>
      (await api.patch<Person>(`/api/people/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      setEditingId(null);
      setForm({ type: 'PACIENTE', finalStatus: 'ACTIVO' });
      toast.success('Usuario actualizado');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/people/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      toast.success('Usuario eliminado');
    },
  });

  const startEdit = (p: Person) => {
    const normStatus = normalizeFinalStatus(p.finalStatus) ?? 'ACTIVO';
    setEditingId(p.id);
    setForm({
      ...p,
      type: normalizeType(p.type),
      finalStatus: normStatus,
      inactivityDate: p.inactivityDate ? p.inactivityDate.slice(0, 10) : null,
    });
  };

  const onChangeFinalStatus = (value: 'ACTIVO' | 'INACTIVO') => {
    if (value === 'ACTIVO') {
      setForm((f) => ({
        ...f,
        finalStatus: 'ACTIVO',
        inactivityType: null,
        inactivityDate: null,
      }));
    } else {
      setForm((f) => ({ ...f, finalStatus: 'INACTIVO' }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalStatus = normalizeFinalStatus(form.finalStatus) ?? 'ACTIVO';
    const payload = {
      documentId: form.documentId?.trim() || null,
      fullName: form.fullName?.trim(),
      type: normalizeType(form.type),
      eps: form.eps?.trim() || null,
      department: form.department?.trim() || null,
      municipality: form.municipality?.trim() || null,
      address: form.address?.trim() || null,
      finalStatus, // 'ACTIVO' | 'INACTIVO'
      inactivityType:
        finalStatus === 'INACTIVO' ? form.inactivityType?.trim() || null : null,
      inactivityDate: finalStatus === 'INACTIVO' ? form.inactivityDate || null : null,
    };

    if (!payload.fullName) return toast.error('El nombre es obligatorio');

    if (editingId) await update.mutateAsync({ id: editingId, data: payload });
    else await create.mutateAsync(payload);
  };

  const rows = useMemo(() => {
    const items = people.data?.items ?? [];
    return items.map((p) => (
      <tr key={p.id} className="hover:bg-slate-50/50">
        <td className="p-3">{p.documentId || '—'}</td>
        <td className="p-3">{p.fullName}</td>
        <td className="p-3">{TYPE_LABEL[normalizeType(p.type)]}</td>
        <td className="p-3">{p.eps || '—'}</td>
        <td className="p-3">{p.department || '—'}</td>
        <td className="p-3">{p.municipality || '—'}</td>
        <td className="p-3 max-w-[220px] truncate" title={p.address || ''}>
          {p.address || '—'}
        </td>
        <td className="p-3">{labelFinalStatus(p.finalStatus)}</td>
        <td className="p-3">{p.inactivityType || '—'}</td>
        <td className="p-3">
          {p.inactivityDate ? p.inactivityDate.slice(0, 10) : '—'}
        </td>
        <td className="p-3">
          <div className="flex gap-2">
            <button
              onClick={() => startEdit(p)}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Editar
            </button>
            <button
              onClick={async () => {
                if (!confirm('¿Eliminar este usuario?')) return;
                try {
                  await remove.mutateAsync(p.id);
                } catch (e: any) {
                  toast.error(
                    e?.response?.data?.error ?? 'No se pudo eliminar'
                  );
                }
              }}
              className="rounded-md border px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    ));
  }, [people.data, remove]);

  const isInactive = normalizeFinalStatus(form.finalStatus) === 'INACTIVO';

  // Datos para el footer de paginación
  const totalItems = people.data?.total ?? 0;
  const currentPage = people.data?.page ?? page;
  const effectivePageSize =
    people.data?.pageSize ??
    (pageSize === 'ALL'
      ? totalItems || 1000
      : (pageSize as number));

  const totalPages =
    pageSize === 'ALL'
      ? 1
      : people.data?.pages ??
        (effectivePageSize
          ? Math.max(1, Math.ceil(totalItems / effectivePageSize))
          : 1);

  const showingCount =
    totalItems === 0
      ? 0
      : pageSize === 'ALL'
      ? totalItems
      : Math.min(totalItems, currentPage * effectivePageSize);

  return (
    <Guard>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Poblacion</h1>
        </div>

        {/* Buscador + Botón Importar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o documento…"
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

          <button
            onClick={() => setShowImport(true)}
            className="rounded-xl bg-sky-700 text-white px-3 py-2 text-sm hover:bg-sky-800"
          >
            Importar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Formulario */}
          <form
            onSubmit={submit}
            className="border rounded-xl bg-white dark:bg-slate-900 p-4 space-y-3"
          >
            <h2 className="font-medium">
              {editingId ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm">Documento</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.documentId || ''}
                  onChange={(e) =>
                    setForm({ ...form, documentId: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm">Tipo de usuario</label>
                <select
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.type || 'PACIENTE'}
                  onChange={(e) =>
                    setForm({ ...form, type: normalizeType(e.target.value) })
                  }
                >
                  <option value="NOMINA">Nómina</option>
                  <option value="OPS">OPS</option>
                  <option value="PACIENTE">Paciente</option>
                  <option value="TERCERO">Tercero</option>
                </select>
              </div>

              <div className="grid gap-1.5 sm:col-span-2">
                <label className="text-sm">Nombre</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.fullName || ''}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm">EPS</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.eps || ''}
                  onChange={(e) => setForm({ ...form, eps: e.target.value })}
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm">Departamento</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.department || ''}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm">Municipio</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.municipality || ''}
                  onChange={(e) =>
                    setForm({ ...form, municipality: e.target.value })
                  }
                />
              </div>

              {/* Dirección */}
              <div className="grid gap-1.5 sm:col-span-2">
                <label className="text-sm">Dirección</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.address || ''}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Carrera 10 # 20-30 Apto 101"
                />
              </div>

              {/* Estado final como select */}
              <div className="grid gap-1.5">
                <label className="text-sm">Estado final</label>
                <select
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={normalizeFinalStatus(form.finalStatus) ?? 'ACTIVO'}
                  onChange={(e) =>
                    onChangeFinalStatus(
                      e.target.value as 'ACTIVO' | 'INACTIVO'
                    )
                  }
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              {/* Campos de inactividad (solo INACTIVO) */}
              {isInactive && (
                <>
                  <div className="grid gap-1.5">
                    <label className="text-sm">Tipo de inactivación</label>
                    <select
                      className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                      value={form.inactivityType || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          inactivityType: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Seleccione…</option>
                      {INACTIVITY_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-sm">Fecha inactividad</label>
                    <input
                      type="date"
                      className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                      value={form.inactivityDate || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          inactivityDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ type: 'PACIENTE', finalStatus: 'ACTIVO' });
                  }}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {editingId ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>

          {/* Tabla de usuarios */}
          <div className="border rounded-xl bg-white dark:bg-slate-900 p-0 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-medium">
                Usuarios{' '}
                {people.data ? `${people.data.total} resultado(s)` : ''}
              </h2>

              {/* Bloque de paginación tipo "Mostrar:" */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Mostrar:</span>
                  <select
                    className="rounded-lg border px-2 py-1 text-xs bg-white dark:bg-slate-950"
                    value={pageSize === 'ALL' ? 'ALL' : String(pageSize)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPageSize(
                        v === 'ALL'
                          ? 'ALL'
                          : (parseInt(v, 10) as PageSizeOption)
                      );
                    }}
                  >
                    <option value="10">10</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="ALL">Todos</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>
                    {totalItems === 0
                      ? 'Sin usuarios para mostrar.'
                      : pageSize === 'ALL'
                      ? `Mostrando ${totalItems} usuarios`
                      : `Mostrando ${showingCount} de ${totalItems} usuarios`}
                  </span>

                  {totalItems > 0 && pageSize !== 'ALL' && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border disabled:opacity-40"
                        onClick={() =>
                          setPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage <= 1}
                      >
                        Anterior
                      </button>
                      <span>
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border disabled:opacity-40"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage >= totalPages}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-auto" style={{ maxHeight: '68vh' }}>
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600">
                  <tr>
                    <th className="text-left p-3">Documento</th>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">EPS</th>
                    <th className="text-left p-3">Departamento</th>
                    <th className="text-left p-3">Municipio</th>
                    <th className="text-left p-3">Dirección</th>
                    <th className="text-left p-3">Estado Final</th>
                    <th className="text-left p-3">Tipo inactivación</th>
                    <th className="text-left p-3">Fecha inactividad</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.length > 0 ? (
                    rows
                  ) : (
                    <tr>
                      <td
                        className="p-6 text-center text-slate-500"
                        colSpan={11}
                      >
                        {people.isLoading ? 'Cargando…' : 'Sin usuarios.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <ImportPeopleModal
          open={showImport}
          onClose={() => setShowImport(false)}
        />
      </section>
    </Guard>
  );
}
