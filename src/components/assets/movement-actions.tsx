'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type MovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ASSIGN'
  | 'RETURN'
  | 'TRANSFER'
  | 'MAINTENANCE_OUT'
  | 'MAINTENANCE_IN';

type Person = {
  id: string;
  fullName: string;
  documentId: string | null;
  department: string | null;
  municipality: string | null;
  address: string | null;
};

type Location = {
  id: string;
  name: string;
};

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export default function MovementActions({
  assetId,
  onDone,
}: {
  assetId: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);

  // listados
  const [people, setPeople] = useState<Person[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // selección
  const [selPersonId, setSelPersonId] = useState<string>('');
  const [selReturnLocId, setSelReturnLocId] = useState<string>('');
  const [selTransferLocId, setSelTransferLocId] = useState<string>('');

  // botones
  const [submitting, setSubmitting] = useState<MovementType | null>(null);

  // Abre modal y carga opciones (si no están)
  useEffect(() => {
    if (!open) return;
    // si ya cargamos, no repitas
    if (people.length && locations.length) return;

    const load = async () => {
      try {
        setLoadingLists(true);

        const [p, l] = await Promise.all([
          api.get<Paginated<Person>>('/api/people', {
            params: { pageSize: 200 }, // sin q para tener lista completa
            withCredentials: true,
          }),
          api.get<{ items: Location[] }>('/api/catalog/locations', {
            params: { pageSize: 200 },
            withCredentials: true,
          }),
        ]);

        setPeople(p.data.items || []);
        setLocations(l.data.items || (l.data as any) || []);
      } catch (e: any) {
        const url = e?.config?.url;
        const status = e?.response?.status;
        toast.error(
          `No se pudieron cargar listas${status ? ` (HTTP ${status})` : ''}${
            url ? ` — ${url}` : ''
          }`
        );
      } finally {
        setLoadingLists(false);
      }
    };

    load();
  }, [open, people.length, locations.length]);

  // Helpers de envío
  const runMovement = async (payload: {
    type: MovementType;
    toPersonId?: string | null;
    toLocationId?: string | null;
  }) => {
    try {
      setSubmitting(payload.type);
      await api.post(
        '/api/movements',
        {
          assetId,
          type: payload.type,
          toPersonId: payload.toPersonId ?? null,
          toLocationId: payload.toLocationId ?? null,
        },
        { withCredentials: true }
      );
      toast.success('Movimiento registrado');
      setOpen(false);
      setSelPersonId('');
      setSelReturnLocId('');
      setSelTransferLocId('');
      onDone?.();
    } catch (e: any) {
      const url = e?.config?.url;
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || e?.message || 'No se pudo registrar';
      toast.error(`${msg}${status ? ` (HTTP ${status})` : ''}${url ? ` — ${url}` : ''}`);
    } finally {
      setSubmitting(null);
    }
  };

  const disabledAssign = !selPersonId || submitting !== null;
  const disabledReturn = !selReturnLocId || submitting !== null;
  const disabledTransfer = !selTransferLocId || submitting !== null;

  // contenido de modal
  const modal = useMemo(() => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-2xl rounded-2xl border bg-white p-4 shadow-xl dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Registrar movimiento</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 text-sm border hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {/* Cuerpo */}
          <div className="mt-4 grid gap-4">
            {/* Asignar a custodio */}
            <div className="rounded-xl border p-4">
              <div className="font-medium mb-2">Asignar a custodio</div>

              <div className="flex gap-2 items-center">
                <select
                  disabled={loadingLists}
                  className="min-w-[260px] rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={selPersonId}
                  onChange={(e) => setSelPersonId(e.target.value)}
                >
                  <option value="">Selecciona persona</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                      {p.documentId ? ` — ${p.documentId}` : ''}
                      {/* puedes mostrar depto/muni si quieres */}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => runMovement({ type: 'ASSIGN', toPersonId: selPersonId })}
                  disabled={disabledAssign}
                  className="rounded-xl bg-sky-600 text-white px-4 py-2 text-sm hover:bg-sky-700 disabled:opacity-60"
                >
                  {submitting === 'ASSIGN' ? 'Asignando…' : 'Asignar'}
                </button>
              </div>

              {loadingLists && (
                <div className="text-xs text-slate-500 mt-2">Cargando personas…</div>
              )}
            </div>

            {/* Retornar a ubicación (stock) */}
            <div className="rounded-xl border p-4">
              <div className="font-medium mb-2">Retornar a ubicación</div>
              <div className="flex gap-2 items-center">
                <select
                  disabled={loadingLists}
                  className="min-w-[260px] rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={selReturnLocId}
                  onChange={(e) => setSelReturnLocId(e.target.value)}
                >
                  <option value="">Selecciona ubicación</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() =>
                    runMovement({ type: 'RETURN', toLocationId: selReturnLocId })
                  }
                  disabled={disabledReturn}
                  className="rounded-xl bg-sky-600 text-white px-4 py-2 text-sm hover:bg-sky-700 disabled:opacity-60"
                >
                  {submitting === 'RETURN' ? 'Retornando…' : 'Retornar'}
                </button>
              </div>
            </div>

            {/* Transferir ubicación */}
            <div className="rounded-xl border p-4">
              <div className="font-medium mb-2">Transferir ubicación</div>
              <div className="flex gap-2 items-center">
                <select
                  disabled={loadingLists}
                  className="min-w-[260px] rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={selTransferLocId}
                  onChange={(e) => setSelTransferLocId(e.target.value)}
                >
                  <option value="">Nueva ubicación</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() =>
                    runMovement({ type: 'TRANSFER', toLocationId: selTransferLocId })
                  }
                  disabled={disabledTransfer}
                  className="rounded-xl bg-sky-600 text-white px-4 py-2 text-sm hover:bg-sky-700 disabled:opacity-60"
                >
                  {submitting === 'TRANSFER' ? 'Transfiriendo…' : 'Transferir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    open,
    loadingLists,
    people,
    locations,
    selPersonId,
    selReturnLocId,
    selTransferLocId,
    submitting,
  ]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm hover:opacity-95"
        title="Registrar movimiento"
      >
        Acciones
      </button>
      {modal}
    </>
  );
}
