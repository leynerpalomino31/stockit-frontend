'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

type AttachmentType = 'SOPORTE_BAJA' | 'FACTURA_COMPRA';

type Attachment = {
  id: string;
  assetId: string;
  type: AttachmentType;
  fileName: string;
  path: string;   // relativo en el backend (ej: /uploads/assets/..../file.pdf)
  size: number;
  mime: string;
  createdAt: string;
};

function formatBytes(b?: number) {
  if (!b && b !== 0) return '—';
  const u = ['B','KB','MB','GB','TB'];
  const i = b === 0 ? 0 : Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function AssetAttachmentsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<AttachmentType>('FACTURA_COMPRA');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Base absoluta del API para construir links que apunten al backend
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  const listQ = useQuery({
    queryKey: ['asset-attachments', id],
    queryFn: async () =>
      (await api.get<{ items: Attachment[] }>(`/api/assets/${id}/attachments`)).data,
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona un PDF');
      if (file.type !== 'application/pdf') throw new Error('Solo se permite PDF');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      const res = await api.post(`/api/assets/${id}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as Attachment;
    },
    onSuccess: () => {
      toast.success('Anexo cargado');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['asset-attachments', id] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error ?? e?.message ?? 'No se pudo cargar el anexo');
    },
  });

  const remove = useMutation({
    mutationFn: async (attId: string) => {
      await api.delete(`/api/attachments/${attId}`);
    },
    onSuccess: () => {
      toast.success('Anexo eliminado');
      qc.invalidateQueries({ queryKey: ['asset-attachments', id] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error ?? e?.message ?? 'No se pudo eliminar');
    },
  });

  const total = listQ.data?.items?.length ?? 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Anexos</h1>
        <Link
          href={`/assets/${id}`}
          className="text-sm rounded-lg border px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          ← Volver al activo
        </Link>
      </div>

      {/* Cargar anexo */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="font-medium">Nuevo anexo (PDF)</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <label className="text-sm">Tipo de anexo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AttachmentType)}
              className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
            >
              <option value="SOPORTE_BAJA">Soporte de baja</option>
              <option value="FACTURA_COMPRA">Factura de compra</option>
            </select>
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <label className="text-sm">Archivo PDF</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => upload.mutate()}
            disabled={upload.isPending || !file}
            className="rounded-xl bg-sky-700 text-white px-4 py-2 text-sm hover:bg-sky-800 disabled:opacity-60"
          >
            {upload.isPending ? 'Cargando…' : 'Subir anexo'}
          </button>
        </div>
      </div>

      {/* Lista de anexos */}
      <div className="rounded-xl border bg-white dark:bg-slate-900">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-medium">Archivos ({total})</h2>
        </div>

        <div className="p-4">
          {listQ.isLoading ? (
            <div className="text-sm text-slate-500">Cargando…</div>
          ) : total === 0 ? (
            <div className="text-sm text-slate-500">Sin anexos aún.</div>
          ) : (
            <ul className="space-y-3">
              {listQ.data!.items.map((att) => {
                // Siempre usar el endpoint de descarga (attachment)
                const downloadUrl = API_BASE
                  ? `${API_BASE}/api/attachments/${att.id}/download`
                  : `/api/attachments/${att.id}/download`;

                return (
                  <li key={att.id} className="rounded-lg border p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {att.type === 'SOPORTE_BAJA' ? 'Soporte de baja' : 'Factura de compra'}
                      </div>
                      <div
                        className="text-xs text-slate-500 truncate max-w-[520px]"
                        title={`${att.fileName} • ${att.mime || 'application/pdf'} • ${formatBytes(att.size)}`}
                      >
                        {att.fileName} — {new Date(att.createdAt).toLocaleString()} — {formatBytes(att.size)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Forzar descarga en PDF (el backend pone Content-Disposition: attachment) */}
                      <a
                        href={downloadUrl}
                        download={att.fileName || 'archivo.pdf'}
                        rel="noopener"
                        className="text-sm rounded-lg border px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Descargar
                      </a>
                      <button
                        onClick={() => {
                          if (!confirm('¿Eliminar este anexo?')) return;
                          remove.mutate(att.id);
                        }}
                        className="text-sm rounded-lg bg-rose-600 text-white px-3 py-1.5 hover:opacity-95"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
