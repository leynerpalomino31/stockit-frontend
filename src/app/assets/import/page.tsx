// src/app/assets/import/page.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type BulkResult = {
  created: number;
  updated: number;
  errors: { row: number; tag?: string; error: string }[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function ImportAssetsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Selecciona un archivo (CSV o JSON)');

    setLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);

      // 👇 Nuevo endpoint en español
      const { data } = await api.post<BulkResult>('/api/assets/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(data);
      toast.success(`Proceso completado: ${data.created} creado(s), ${data.updated} actualizado(s)`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo importar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Importar activos</h1>
        <a
          className="text-sm underline"
          href={`${API_BASE}/api/assets/import/template`}
          target="_blank"
          rel="noreferrer"
        >
          Descargar plantilla (ES)
        </a>
      </div>

      <div className="border rounded-xl bg-white dark:bg-slate-900 p-4 space-y-3">
        <p className="text-sm text-slate-600">
          Sube un <b>CSV</b> (recomendado) o <b>JSON</b> con las columnas en <b>español</b>.
          Los nombres admitidos coinciden con la plantilla.
        </p>

        <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/40 p-3 text-xs leading-5 text-slate-700 dark:text-slate-300">
          <div className="font-semibold mb-1">Columnas soportadas (plantilla ES):</div>
          <code>
            tag, nombre, serie, marca, modelo, categoria_codigo, categoria_nombre, ubicacion_nombre,
            fecha_compra, costo_compra, tipo_adquisicion, proveedor, numero_factura, codigo_invima,
            nivel_riesgo, garantia_hasta, estado_operativo, estado_vida, sede_codigo, bodega_asignada, notas
          </code>
          <div className="mt-2">
            <b>Valores válidos</b>:
            <ul className="list-disc ml-5 mt-1">
              <li>
                <b>estado_operativo</b>: EN_BODEGA, ASIGNADO, EN_REPARACION, PERDIDO, BAJA
              </li>
              <li>
                <b>estado_vida</b>: ACTIVO, INACTIVO, RETIRADO
              </li>
              <li>
                <b>tipo_adquisicion</b>: COMPRA, ARRIENDO, DONACION, INTERNO, OTRO
              </li>
              <li>
                <b>nivel_riesgo</b>: BAJO, MEDIO, ALTO, CRITICO
              </li>
              <li>Las fechas: YYYY-MM-DD (ej. 2025-10-23)</li>
            </ul>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 items-start">
          <input
            type="file"
            accept=".csv,text/csv,application/json,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={loading || !file}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Importando…' : 'Subir archivo'}
          </button>
        </form>
      </div>

      {result && (
        <div className="border rounded-xl bg-white dark:bg-slate-900 p-4">
          <h2 className="font-medium mb-2">Resultado</h2>
          <p className="text-sm">
            <b>{result.created}</b> creado(s), <b>{result.updated}</b> actualizado(s)
          </p>

          {result.errors.length > 0 && (
            <div className="mt-3">
              <h3 className="font-medium text-sm">Errores</h3>
              <div className="max-h-64 overflow-y-auto mt-2 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="text-left px-3 py-2">Fila</th>
                      <th className="text-left px-3 py-2">Tag</th>
                      <th className="text-left px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-1">{e.row}</td>
                        <td className="px-3 py-1">{e.tag || '—'}</td>
                        <td className="px-3 py-1">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
