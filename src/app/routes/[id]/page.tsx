'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRoute } from '@/lib/hooks';
import { api } from '@/lib/api';

function fDateTime(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
}

function fDateOnly(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString();
}

// Lista de parentescos
const RELATIONS: string[] = [
  'HIJA', 'HIJO', 'MADRE', 'PADRE', 'SOBRINA', 'SOBRINO', 'HIJASTRO', 'HIJASTRA',
  'HERMANO', 'HERMANA', 'TIA', 'TIO', 'COLABORADOR', 'YERNO', 'NIETO', 'NIETA',
  'CUÑADO', 'NUERA', 'PRIMA', 'PRIMO', 'ABUELA', 'PACIENTE', 'ESPOSO', 'ESPOSA',
  'TUTORA', 'TUTOR', 'CUIDADOR', 'FAMILIAR',
];

// Tipo para novedades/anexos
type Novedad = {
  id: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mime?: string | null;
  createdAt: string;
};

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useRoute(id);

  // ───────── Novedades (anexos) ─────────
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [novedadesLoading, setNovedadesLoading] = useState(false);
  const [novedadesError, setNovedadesError] = useState<string | null>(null);

  async function loadNovedades() {
    if (!id) return;
    try {
      setNovedadesLoading(true);
      setNovedadesError(null);
      const res = await api.get(`/api/routes/${id}/novedades`);
      setNovedades(res.data?.items ?? []);
    } catch (err) {
      console.error(err);
      setNovedadesError('No se pudieron cargar las novedades.');
    } finally {
      setNovedadesLoading(false);
    }
  }

  useEffect(() => {
    loadNovedades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [novDescription, setNovDescription] = useState('');
  const [novFile, setNovFile] = useState<File | null>(null);
  const [savingNovedad, setSavingNovedad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ───────── State para modales (Completar / Pendiente) ─────────
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Modal "Completar"
  const [whoSigns, setWhoSigns] = useState('');
  const [signerId, setSignerId] = useState('');
  const [relation, setRelation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [savingComplete, setSavingComplete] = useState(false);

  // Firma: canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Modal "Pendiente / Reprogramar"
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [savingPending, setSavingPending] = useState(false);

  // Fechas derivadas del DTO
  const createdAt = (data as any)?.createdAt as string | undefined;
  const scheduledDateRaw =
    ((data as any)?.scheduledDate as string | undefined) ??
    ((data as any)?.date as string | undefined);

  // ───────── Inicializar fecha programada en el input date ─────────
  useEffect(() => {
    if (!scheduledDateRaw) {
      setNewScheduledDate('');
      return;
    }
    const dt = new Date(scheduledDateRaw);
    if (isNaN(dt.getTime())) {
      setNewScheduledDate('');
      return;
    }
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    setNewScheduledDate(`${year}-${month}-${day}`); // YYYY-MM-DD
  }, [scheduledDateRaw]);

  // ───────── Inicializar tamaño del canvas de firma ─────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 160; // alto fijo

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ───────── Helpers de dibujo (firma) ─────────
  const getCanvasPointFromMouse = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getCanvasPointFromTouch = (
    e: React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    if (!t) return null;
    return {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
    };
  };

  const startDrawing = (point: { x: number; y: number } | null) => {
    if (!point) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    isDrawingRef.current = true;
    lastPointRef.current = point;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setHasSignature(true);
  };

  const continueDrawing = (point: { x: number; y: number } | null) => {
    if (!point) return;
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const last = lastPointRef.current;
    if (!last) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.moveTo(last.x, last.y);
    }
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // ───────── Handlers Novedades ─────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setNovFile(f);
  };

  const handleNovedadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    if (!novFile && !novDescription.trim()) {
      alert('Agrega al menos una descripción o un archivo.');
      return;
    }

    const formData = new FormData();
    if (novFile) formData.append('file', novFile);
    formData.append('description', novDescription.trim());

    try {
      setSavingNovedad(true);
      await api.post(`/api/routes/${id}/novedades`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reset formulario
      setNovDescription('');
      setNovFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refrescar lista
      await loadNovedades();
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar la novedad.');
    } finally {
      setSavingNovedad(false);
    }
  };

  // ───────── Early returns ─────────
  if (isLoading && !data) {
    return <p className="p-4 text-sm text-slate-500">Cargando…</p>;
  }
  if (!data) {
    return <p className="p-4 text-sm text-slate-500">No encontrada.</p>;
  }

  // Nombre del conductor: primero el texto libre driverName; si no, el usuario asignado
  const driverLabel =
    (data as any).driverName ??
    (data as any).assignedDriver?.name ??
    '—';

  const codeText =
    typeof (data as any).code === 'string'
      ? (data as any).code
      : String((data as any).routeNumber ?? '').padStart(3, '0');

  const title = `RUTA ${codeText} - ${(data as any).type}`; // type ya viene en español
  const scheduledDateToShow = scheduledDateRaw;

  const isCompleted =
    String(data.status || '').toUpperCase().includes('COMPLET');

  // ───────── Handlers de los modales ─────────

  async function handleCompleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!whoSigns.trim() || !signerId.trim() || !relation) {
      alert('Por favor completa: Quién firma, Identificación y Parentesco.');
      return;
    }
    if (!hasSignature) {
      const confirmNoSig = confirm(
        'No hay firma dibujada. ¿Deseas guardar sin firma?'
      );
      if (!confirmNoSig) return;
    }

    setSavingComplete(true);
    try {
      const parts: string[] = [
        `Firma: ${whoSigns.trim()}`,
        `Identificación: ${signerId.trim()}`,
        `Parentesco: ${relation}`,
      ];
      if (email.trim()) parts.push(`Correo: ${email.trim()}`);
      if (phone.trim()) parts.push(`Teléfono: ${phone.trim()}`);
      if (notes.trim()) parts.push(`Obs: ${notes.trim()}`);

      // Capturar firma como dataURL (imagen)
      let signatureDataToSend: string | undefined;
      if (hasSignature && canvasRef.current) {
        const signatureDataUrl = canvasRef.current.toDataURL('image/png');
        // Lo dejamos también en notes por compatibilidad
        parts.push(`FirmaImagenDataURL: ${signatureDataUrl}`);
        // Y lo mandamos explícito al backend
        signatureDataToSend = signatureDataUrl;
      }

      const detailNotes = parts.join(' | ');
      const combinedNotes = [
        (data as any).notes || '',
        detailNotes,
      ]
        .filter(Boolean)
        .join(' || ');

      await api.patch(`/api/routes/${id}`, {
        status: 'COMPLETED',
        notes: combinedNotes,
        signerEmail: email.trim() || undefined,
        signatureData: signatureDataToSend,
      });

      setShowCompleteModal(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('No se pudo completar la ruta.');
    } finally {
      setSavingComplete(false);
    }
  }

  async function handlePendingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newScheduledDate) {
      alert('Selecciona la nueva fecha programada.');
      return;
    }

    setSavingPending(true);
    try {
      await api.patch(`/api/routes/${id}`, {
        scheduledDate: newScheduledDate, // YYYY-MM-DD
        status: 'SCHEDULED',
      });

      setShowPendingModal(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('No se pudo reprogramar la ruta.');
    } finally {
      setSavingPending(false);
    }
  }

  return (
    <section className="space-y-4">
      {/* ───────── Cabecera ───────── */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-slate-500 mt-1 space-x-1">
              <span>
                Estado: <b>{data.status}</b>
              </span>
              <span>—</span>
              <span>
                Creada: <b>{fDateTime(createdAt)}</b>
              </span>
              <span>—</span>
              <span>
                Programada:{' '}
                <b>{fDateOnly(scheduledDateToShow)}</b>
              </span>
            </p>
          </div>

          {/* Botones de acciones */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowPendingModal(true)}
              className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Marcar como pendiente / Reprogramar
            </button>
            <button
              type="button"
              onClick={() => setShowCompleteModal(true)}
              disabled={isCompleted}
              className="rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            >
              {isCompleted ? 'Ruta completada' : 'Completar ruta'}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <span className="text-slate-500">Conductor:&nbsp;</span>
            <b>{driverLabel}</b>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-500">Notas:&nbsp;</span>
            <b>{(data as any).notes || '—'}</b>
          </div>
        </div>
      </div>

      {/* ───────── Stop principal ───────── */}
      {(data as any).stop && (
        <div className="border rounded-xl bg-white dark:bg-slate-900 p-4">
          <h2 className="font-medium mb-2">Punto</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="truncate">
              <span className="text-slate-500">Dirección:&nbsp;</span>
              <b title={(data as any).stop.address || ''}>
                {(data as any).stop.address || '—'}
              </b>
            </div>
            <div>
              <span className="text-slate-500">Contacto:&nbsp;</span>
              <b>{(data as any).stop.contactName || '—'}</b>
            </div>
            <div>
              <span className="text-slate-500">Teléfono:&nbsp;</span>
              <b>{(data as any).stop.contactPhone || '—'}</b>
            </div>
            <div>
              <span className="text-slate-500">Tipo de parada:&nbsp;</span>
              <b>{(data as any).stop.type}</b>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Notas:&nbsp;</span>
              <b>{(data as any).stop.notes || '—'}</b>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Activos</h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-3 py-2">Código</th>
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Acción</th>
                    <th className="text-left px-3 py-2">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {(data as any).stop.items?.map((it: any) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2">{it.asset?.tag}</td>
                      <td className="px-3 py-2">{it.asset?.name}</td>
                      <td className="px-3 py-2">{it.action}</td>
                      <td className="px-3 py-2">{it.qty}</td>
                    </tr>
                  ))}
                  {(!(data as any).stop.items ||
                    (data as any).stop.items.length === 0) && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        Sin activos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Novedades (anexos) ───────── */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-medium">Novedades (anexos)</h2>
          <span className="text-xs text-slate-500">
            Evidencias de la ruta (fotos, notas)
          </span>
        </div>

        {/* Formulario nueva novedad */}
        <form onSubmit={handleNovedadSubmit} className="flex flex-col gap-3 text-sm mb-4">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Descripción
              </label>
              <textarea
                className="w-full rounded border px-2 py-1.5"
                rows={3}
                value={novDescription}
                onChange={(e) => setNovDescription(e.target.value)}
                placeholder="Describe la novedad o evidencia registrada en esta ruta..."
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Archivo (foto / evidencia)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-600
                           file:mr-3 file:rounded-lg file:border file:border-slate-300
                           file:bg-slate-50 file:px-3 file:py-1.5
                           file:text-xs file:font-medium
                           hover:file:bg-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Puedes adjuntar fotos, capturas de pantalla o PDFs.
              </p>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="submit"
              disabled={savingNovedad}
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white
                         hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingNovedad ? 'Guardando…' : 'Agregar novedad'}
            </button>
          </div>
        </form>

        {/* Lista de novedades */}
        <div className="space-y-2">
          {novedadesLoading && (
            <p className="text-xs text-slate-500">Cargando novedades…</p>
          )}

          {novedadesError && (
            <p className="text-xs text-red-500">{novedadesError}</p>
          )}

          {!novedadesLoading && novedades.length === 0 && !novedadesError && (
            <p className="text-xs text-slate-500">
              Aún no hay novedades registradas para esta ruta.
            </p>
          )}

          {novedades.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 flex gap-3"
            >
              <div className="min-w-[140px] text-xs text-slate-500">
                <div>{fDateTime(n.createdAt)}</div>
                <div className="text-[10px] uppercase tracking-wide">
                  Registrada
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  {n.description?.trim() || '(Sin descripción)'}
                </div>
                {n.fileUrl && (
                  <a
                    href={n.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center text-xs text-sky-600 hover:underline"
                  >
                    Ver archivo
                    <svg
                      className="ml-1 h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 3h7v7" />
                      <path d="M10 14 21 3" />
                      <path d="M21 14v7H3V3h7" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal COMPLETAR (con firma canvas + scroll) */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md max-h-[90vh] rounded-xl bg-white p-4 shadow-lg dark:bg-slate-900 flex flex-col">
            <h2 className="mb-3 text-base font-semibold">
              Completar ruta
            </h2>

            <form onSubmit={handleCompleteSubmit} className="flex flex-col gap-3 text-sm flex-1">
              {/* Contenido scrolleable */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Quién firma
                  </label>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={whoSigns}
                    onChange={(e) => setWhoSigns(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Identificación
                  </label>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={signerId}
                    onChange={(e) => setSignerId(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Parentesco
                  </label>
                  <select
                    className="w-full rounded border px-2 py-1.5"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    required
                  >
                    <option value="">Selecciona…</option>
                    {RELATIONS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    className="w-full rounded border px-2 py-1.5"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Teléfono
                  </label>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    className="w-full rounded border px-2 py-1.5"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Firma canvas */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Firma
                  </label>
                  <div className="rounded border bg-white overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-40 touch-none"
                      onMouseDown={(e) => startDrawing(getCanvasPointFromMouse(e))}
                      onMouseMove={(e) => continueDrawing(getCanvasPointFromMouse(e))}
                      onMouseUp={endDrawing}
                      onMouseLeave={endDrawing}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        startDrawing(getCanvasPointFromTouch(e));
                      }}
                      onTouchMove={(e) => {
                        e.preventDefault();
                        continueDrawing(getCanvasPointFromTouch(e));
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        endDrawing();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="mt-1 rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Limpiar firma
                  </button>
                </div>
              </div>

              {/* Footer fijo dentro del modal */}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  disabled={savingComplete}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingComplete}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingComplete ? 'Guardando…' : 'Guardar y completar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PENDIENTE / REPROGRAMAR */}
      {showPendingModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md max-h-[90vh] rounded-xl bg-white p-4 shadow-lg dark:bg-slate-900 flex flex-col">
            <h2 className="mb-3 text-base font-semibold">
              Reprogramar ruta
            </h2>

            <form onSubmit={handlePendingSubmit} className="flex flex-col gap-3 text-sm flex-1">
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Nueva fecha programada
                  </label>
                  <input
                    type="date"
                    className="w-full rounded border px-2 py-1.5"
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPendingModal(false)}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  disabled={savingPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPending}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {savingPending ? 'Guardando…' : 'Guardar fecha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
