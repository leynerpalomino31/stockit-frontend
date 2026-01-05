'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type BulkResult = {
  created: number;
  updated: number;
  errors: { row: number; tag?: string; error: string }[];
};

// Mapeo: clave CSV -> etiqueta visible en español
const COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'tag', label: 'Código' },
  { key: 'name', label: 'Nombre' },
  { key: 'serial', label: 'Serie' },
  { key: 'brand', label: 'Marca' },
  { key: 'model', label: 'Modelo' },
  { key: 'categoryCode', label: 'Código de categoría' },
  { key: 'categoryName', label: 'Nombre de categoría' },
  { key: 'locationName', label: 'Ubicación (nombre)' },
  { key: 'purchaseDate', label: 'Fecha de compra (YYYY-MM-DD)' },
  { key: 'purchaseCost', label: 'Costo de compra' },
  { key: 'acquisitionType', label: 'Tipo de adquisición' },
  { key: 'supplierName', label: 'Proveedor' },
  { key: 'invoiceNumber', label: 'N.º de factura' },
  { key: 'invimaCode', label: 'Código Invima' },
  { key: 'riskLevel', label: 'Nivel de riesgo' },
  { key: 'warrantyUntil', label: 'Garantía hasta (YYYY-MM-DD)' },
  { key: 'notes', label: 'Observación' },
  // { key: 'site', label: 'Sede' }, // descomenta si usas este campo en tu backend
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void; // refrescar lista al terminar
};

export default function ImportAssetsModal({ open, onOpenChange, onImported }: Props) {
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [result, setResult] = React.useState<BulkResult | null>(null);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
    setDownloading(false);
    onOpenChange(false);
  };

  async function downloadTemplate() {
    try {
      setDownloading(true);
      // Usa axios (api) para que incluya cookies y el interceptor 401→refresh
      const res = await api.get('/api/assets/bulk/template', {
        responseType: 'blob', // ← importante
        withCredentials: true, // ← explícito
      });

      // Nombre por defecto
      const filename = getFilenameFromHeaders(res.headers) || 'plantilla_activos.csv';

      // Descarga programática
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        'No se pudo descargar la plantilla';
      toast.error(msg);
      // Útil para depurar por si hay 401 en ngrok
      console.log('GET /api/assets/bulk/template error:', e?.response || e);
    } finally {
      setDownloading(false);
    }
  }

  function getFilenameFromHeaders(headers: any) {
    const cd = headers?.['content-disposition'] as string | undefined;
    if (!cd) return null;
    const m = /filename="?([^"]+)"?/i.exec(cd);
    return m?.[1] ?? null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Selecciona un archivo CSV');
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const { data } = await api.post<BulkResult>('/api/assets/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      setResult(data);
      toast.success(`Importación completada: ${data.created} creado(s), ${data.updated} actualizado(s)`);
      onImported?.();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'No se pudo importar';
      toast.error(msg);
      console.log('POST /api/assets/bulk error:', e?.response || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar activos (CSV)</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con los campos que se muestran abajo. Puedes descargar una plantilla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campos soportados como chips (en español) */}
          <div>
            <p className="text-sm text-slate-600 mb-2">Campos soportados:</p>
            <div className="flex flex-wrap gap-2">
              {COLUMNS.map(({ key, label }) => (
                <span
                  key={key}
                  title={`Clave CSV: ${key}`}
                  className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Nota: las claves reales del CSV siguen en inglés (pasa el cursor por cada etiqueta para ver la clave).
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="shrink-0">
                <label className="text-sm block mb-1">Archivo CSV</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
              </div>

              {/* Botón que descarga usando axios + cookies */}
              <button
                type="button"
                onClick={downloadTemplate}
                disabled={downloading}
                className="text-xs underline whitespace-nowrap disabled:opacity-60"
                title="Descargar plantilla CSV"
              >
                {downloading ? 'Descargando…' : 'Descargar plantilla'}
              </button>
            </div>

            {result && (
              <div className="border rounded-lg p-3">
                <p className="text-sm">
                  <b>{result.created}</b> creado(s), <b>{result.updated}</b> actualizado(s)
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Errores</p>
                    <div className="max-h-40 overflow-y-auto mt-2 border rounded-md">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                            <th className="text-left px-2 py-1">Fila</th>
                            <th className="text-left px-2 py-1">Código (tag)</th>
                            <th className="text-left px-2 py-1">Detalle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.errors.map((er, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-2 py-1">{er.row}</td>
                              <td className="px-2 py-1">{er.tag || '—'}</td>
                              <td className="px-2 py-1 break-words">{er.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <button type="button" className="rounded-xl border px-4 py-2 text-sm" onClick={handleClose}>
                Cerrar
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? 'Importando…' : 'Subir CSV'}
              </button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
