'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, type Asset, type Paginated, type Movement } from '@/lib/api';
import StatusBadge from '@/components/ui/status-badge';
import MovementActions from '@/components/assets/movement-actions';
import { useState } from 'react';
import { toast } from 'sonner';
import { tMovement, tLifeState } from '@/lib/i18n';

/* === Tipos para anexos que vienen en /api/assets/:id === */
type Attachment = {
  id: string;
  type: 'SOPORTE_BAJA' | 'FACTURA_COMPRA';
  fileName: string;
  path: string; // URL pública (p.ej. /uploads/...)
  size: number;
  mime: string;
  createdAt: string;
};

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Base URL de la API para construir URLs absolutas a /uploads
  const API_BASE_URL =
    (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '') || '';

  const assetQ = useQuery({
    queryKey: ['asset', id],
    // Tipamos para que acepte attachments opcionales
    queryFn: async () =>
      (
        await api.get<Asset & { attachments?: Attachment[] }>(`/api/assets/${id}`)
      ).data,
  });

  const histQ = useQuery({
    queryKey: ['movements', id],
    queryFn: async () =>
      (
        await api.get<Paginated<Movement>>(`/api/movements/by-asset/${id}`, {
          params: { pageSize: 50 },
        })
      ).data,
  });

  const refetchAll = () => {
    assetQ.refetch();
    histQ.refetch();
  };

  const [confirmDel, setConfirmDel] = useState(false);

  // Estado para el modal de vista previa de anexos
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  if (assetQ.isLoading) return <p className="p-4">Cargando…</p>;
  if (!assetQ.data) return <p className="p-4">No encontrado.</p>;

  const a = assetQ.data as any;

  // Helpers
  const fDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString() : '—';
  const fDateTime = (d?: string | null) =>
    d ? new Date(d).toLocaleString() : '—';
  const fMoney = (n?: number | string | null) =>
    n != null ? Number(n).toLocaleString('es-CO') : '—';

  const lifeStatePill = (life?: string) => {
    const base =
      'px-2 py-1 rounded-lg text-[10px] font-semibold tracking-wide';
    const map: Record<string, string> = {
      ACTIVE:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      INACTIVE:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      RETIRED:
        'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    };
    const cls =
      map[life || 'ACTIVE'] ||
      'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    return <span className={`${base} ${cls}`}>{tLifeState(life)}</span>;
  };

  const custAddr = (cust?: any) => {
    if (!cust) return '';
    const parts = [cust.department, cust.municipality, cust.address].filter(
      Boolean,
    );
    return parts.join(', ');
  };

  const ubicacionActualTexto = (() => {
    if (a.currentCustodian) {
      const addr = custAddr(a.currentCustodian);
      return addr
        ? `Asignado a: ${a.currentCustodian.fullName} — Dirección: ${addr}`
        : `Asignado a: ${a.currentCustodian.fullName}`;
    }
    if (a.currentLocation) return `Ubicación: ${a.currentLocation.name}`;
    return 'Sin ubicación/custodio';
  })();

  async function handleDelete() {
    try {
      await api.delete(`/api/assets/${id}`);
      toast.success('Activo eliminado');
      router.push('/assets');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo eliminar');
    } finally {
      setConfirmDel(false);
    }
  }

  /* === Helpers de anexos === */
  const attachments: Attachment[] = Array.isArray(a.attachments)
    ? a.attachments
    : [];
  const topAttachments = attachments.slice(0, 5);
  const typeLabel = (t: Attachment['type']) =>
    t === 'SOPORTE_BAJA' ? 'Soporte de baja' : 'Factura de compra';

  // Abrir modal de vista previa
  const openPreview = (att: Attachment) => {
    const url = att.path.startsWith('http')
      ? att.path
      : `${API_BASE_URL}${att.path}`; // p.ej. https://stockit-uyvn.onrender.com/uploads/...
    setPreviewUrl(url);
    setPreviewName(att.fileName || 'Anexo');
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewName(null);
  };

  return (
    <section className="space-y-4">
      {/* Encabezado */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">
              {a.tag} — {a.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {ubicacionActualTexto}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={a.status} />
            {lifeStatePill(a.lifeState)}
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-3 flex flex-wrap gap-2">
          <MovementActions assetId={id} onDone={refetchAll} />
          <Link
            href={`/assets/${id}/edit`}
            className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Editar activo"
          >
            Editar
          </Link>
          <Link
            href={`/assets/${id}/anexos`}
            className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Gestionar anexos"
          >
            Anexos
          </Link>
          <button
            onClick={() => setConfirmDel(true)}
            className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm hover:opacity-95"
            title="Eliminar activo"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Información del activo */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 p-4">
        <h2 className="font-medium mb-3">Información del activo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Código:</span> <b>{a.tag}</b>
          </div>
          <div>
            <span className="text-slate-500">Categoría:</span>{' '}
            <b>{a.category?.name ?? '—'}</b>
          </div>

          <div>
            <span className="text-slate-500">Sede:</span>{' '}
            <b>{a.site?.name ?? '—'}</b>
          </div>
          <div>
            <span className="text-slate-500">Bodega asignada:</span>{' '}
            <b>{a.assignedWarehouse?.name ?? '—'}</b>
          </div>

          <div>
            <span className="text-slate-500">Ubicación actual:</span>{' '}
            <b>{a.currentLocationLabel ?? a.currentLocation?.name ?? '—'}</b>
          </div>
          <div>
            <span className="text-slate-500">Marca:</span>{' '}
            <b>{a.brand ?? '—'}</b>
          </div>

          <div>
            <span className="text-slate-500">Modelo:</span>{' '}
            <b>{a.model ?? '—'}</b>
          </div>
          <div>
            <span className="text-slate-500">Serie:</span>{' '}
            <b>{a.serial ?? '—'}</b>
          </div>

          <div>
            <span className="text-slate-500">Proveedor:</span>{' '}
            <b>{a.supplierName ?? '—'}</b>
          </div>
          <div>
            <span className="text-slate-500">Factura:</span>{' '}
            <b>{a.invoiceNumber ?? '—'}</b>
          </div>

          <div>
            <span className="text-slate-500">Invima:</span>{' '}
            <b>{a.invimaCode ?? '—'}</b>
          </div>
          <div>
            <span className="text-slate-500">Valor:</span>{' '}
            <b>{fMoney(a.purchaseCost)}</b>
          </div>

          <div>
            <span className="text-slate-500">Fecha de compra:</span>{' '}
            <b>{fDate(a.purchaseDate)}</b>
          </div>
          <div>
            <span className="text-slate-500">Garantía hasta:</span>{' '}
            <b>{fDate(a.warrantyUntil)}</b>
          </div>

          <div>
            <span className="text-slate-500">Tipo de adquisición:</span>{' '}
            <b>{a.acquisitionType ?? '—'}</b>
          </div>
          <div>
            <span className="text-slate-500">Fecha de ingreso:</span>{' '}
            <b>{fDate(a.createdAt)}</b>
          </div>
        </div>
      </div>

      {/* === Anexos (preview en el detalle) === */}
      <div className="border rounded-xl bg-white dark:bg-slate-900">
        <div className="px-4 py-3 font-medium border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2>Anexos</h2>
          <Link
            href={`/assets/${id}/anexos`}
            className="text-sm rounded-lg border px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Ver todos / Cargar
          </Link>
        </div>
        <div className="p-4">
          {topAttachments.length === 0 ? (
            <div className="text-sm text-slate-500">Sin anexos.</div>
          ) : (
            <ul className="space-y-3">
              {topAttachments.map((att) => (
                <li
                  key={att.id}
                  className="rounded-lg border p-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {typeLabel(att.type)}
                    </div>
                    <div
                      className="text-xs text-slate-500 truncate max-w-[520px]"
                      title={att.fileName}
                    >
                      {att.fileName} —{' '}
                      {new Date(att.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openPreview(att)}
                      className="text-sm rounded-lg border px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Ver
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Historial (cuadro con scroll) */}
      <div className="border rounded-xl bg-white dark:bg-slate-900">
        <h2 className="px-4 py-3 font-medium border-b border-slate-100 dark:border-slate-800">
          Historial
        </h2>

        <div className="p-4">
          <div className="rounded-lg border bg-white dark:bg-slate-900 max-h-[380px] overflow-auto">
            {histQ.data && histQ.data.items.length > 0 ? (
              <ul className="p-3 space-y-3">
                {histQ.data.items.map((m) => (
                  <li key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {tMovement(m.type)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {fDateTime(m.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {m.fromLocation && <>De: {m.fromLocation.name} </>}
                      {m.toLocation && <>→ A: {m.toLocation.name} </>}
                      {m.toPerson && <>→ A: {m.toPerson.fullName} </>}
                      {m.reference && <> — Ref: {m.reference}</>}
                      {m.notes && <> — {m.notes}</>}
                      {m.createdBy && (
                        <>
                          {' '}
                          — Registrado por:{' '}
                          <b>{m.createdBy.name || m.createdBy.email}</b>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">
                Sin movimientos aún.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de vista previa de anexos */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold truncate">
                {previewName || 'Vista previa de anexo'}
              </h3>
              <button
                type="button"
                onClick={closePreview}
                className="text-xs px-2 py-1 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1">
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Vista previa PDF"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center p-4">
          <div className="w-full max-w-sm rounded-xl border bg-white dark:bg-slate-9

00 p-4 space-y-3">
            <h4 className="font-medium">Eliminar activo</h4>
            <p className="text-sm text-slate-600">
              ¿Seguro que deseas eliminar{' '}
              <b>
                {a.tag} — {a.name}
              </b>
              ? <br />
              (Se marcará como eliminado)
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="text-sm px-3 py-2 rounded-lg border"
                onClick={() => setConfirmDel(false)}
              >
                Cancelar
              </button>
              <button
                className="text-sm px-3 py-2 rounded-lg bg-rose-600 text-white hover:opacity-95"
                onClick={handleDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
