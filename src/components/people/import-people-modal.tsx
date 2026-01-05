'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ImportPeopleModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'csv' | 'json'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState<string>('');
  const [deleteMode, setDeleteMode] = useState<boolean>(false); // 👈 nuevo checkbox

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'csv') {
        if (!file) throw new Error('Selecciona un archivo CSV');
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post(
          `/api/people/bulk${deleteMode ? '?delete=1' : ''}`,
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return res.data;
      } else {
        let items: any[] = [];
        try {
          items = JSON.parse(jsonText);
          if (!Array.isArray(items)) throw new Error();
        } catch {
          throw new Error('JSON inválido. Debe ser un arreglo de objetos.');
        }

        // En modo delete solo necesitamos documentId; filtramos para evitar payload innecesario
        const payload = deleteMode
          ? items
              .filter((x) => x && (x.documentId ?? '').toString().trim().length > 0)
              .map((x) => ({ documentId: x.documentId }))
          : items;

        if (deleteMode && payload.length === 0) {
          throw new Error('Para eliminar en masa, el JSON debe contener al menos un documentId.');
        }

        const res = await api.post(`/api/people/bulk${deleteMode ? '?delete=1' : ''}`, {
          items: payload,
        });
        return res.data;
      }
    },
    onSuccess: (data) => {
      // Soporta ambas formas de respuesta
      const msg =
        data?.imported != null
          ? `Procesadas: ${data.imported}`
          : `Creados: ${data?.created ?? 0}, Actualizados: ${data?.updated ?? 0}, Omitidos: ${data?.skipped ?? 0}${
              Array.isArray(data?.errors) && data.errors.length ? `, Errores: ${data.errors.length}` : ''
            }`;

      toast.success(deleteMode ? 'Eliminación masiva completada' : `Importación completada. ${msg}`);
      qc.invalidateQueries({ queryKey: ['people'] });
      handleClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error ?? e?.message ?? 'No se pudo procesar la operación');
    },
  });

  function handleClose() {
    setFile(null);
    setJsonText('');
    setMode('csv');
    setDeleteMode(false);
    onClose();
  }

  function downloadTemplate() {
    // Para importación normal (crear/actualizar) — incluye todas las columnas
    // Si usas el checkbox de eliminar, basta con "Documento"
    const headers = [
      'Documento',
      'Nombre',
      'Tipo de usuario',
      'EPS',
      'Departamento',
      'Municipio',
      'Dirección',
      'Estado Final',
      'Tipo de inactividad',
      'Fecha inactividad',
    ];
    const sample1 = '12345678,Juan Pérez,PACIENTE,Coomeva,Santander,Bucaramanga,Cra 1 #2-3,Activo,,';
    const sample2 = '87654321,Ana Gómez,OPS,Sanitas,Bogotá,Bogotá,Cl 10 #20-30,Inactivo,FALLECIDO,2024-03-01';
    const csv = [headers.join(','), sample1, sample2].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-3">
      <div className="w-full max-w-2xl rounded-2xl border bg-white p-4 shadow-xl dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Importar usuarios</h3>
          <button
            onClick={handleClose}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Puedes subir un <b>CSV</b> con cabeceras en español o pegar un <b>JSON</b> (arreglo de objetos).
        </p>

        {/* Checkbox de eliminación masiva */}
        

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setMode('csv')}
            className={`rounded-full px-3 py-1.5 text-sm ${
              mode === 'csv'
                ? 'bg-sky-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => setMode('json')}
            className={`rounded-full px-3 py-1.5 text-sm ${
              mode === 'json'
                ? 'bg-sky-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            JSON
          </button>

          <div className="ml-auto">
            <button
              onClick={downloadTemplate}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Descargar plantilla CSV
            </button>
          </div>
        </div>
        
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <input
            id="deleteMode"
            type="checkbox"
            checked={deleteMode}
            onChange={(e) => setDeleteMode(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <label htmlFor="deleteMode" className="cursor-pointer">
            <b>Eliminar personas incluidas en el archivo</b>. Si está activo, <i>no</i> se crearán ni
            actualizarán registros; se eliminarán por <code>Documento</code> todas las personas listadas.
          </label>
        </div>

        {mode === 'csv' ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-1.5">
              <label className="text-sm">Archivo CSV</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
              />
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              Cabeceras válidas (no importa mayúsculas/minúsculas):{' '}
              <code>Documento</code>, <code>Nombre</code>, <code>Tipo de usuario</code>, <code>EPS</code>,{' '}
              <code>Departamento</code>, <code>Municipio</code>, <code>Dirección</code>, <code>Estado Final</code>,{' '}
              <code>Tipo de inactividad</code>, <code>Fecha inactividad</code>.
              {deleteMode && (
                <>
                  <br />
                  <b>En eliminación masiva</b>: solo se usará <code>Documento</code>.
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-1.5">
              <label className="text-sm">JSON (arreglo de objetos)</label>
              <textarea
                rows={10}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm bg-white font-mono dark:bg-slate-950"
                placeholder={
                  deleteMode
                    ? `[
  { "documentId": "123" },
  { "documentId": "456" }
]`
                    : `[
  { "documentId": "123", "fullName": "Juan Pérez", "type": "PACIENTE", "eps": "Coomeva", "department": "Santander", "municipality": "Bucaramanga", "address": "Cra 1 #2-3", "finalStatus": "ACTIVO" },
  { "documentId": "456", "fullName": "Ana Gómez",  "type": "OPS",       "eps": "Sanitas", "department": "Bogotá",    "municipality": "Bogotá",      "address": "Cl 10 #20-30", "finalStatus": "INACTIVO", "inactivityType": "FALLECIDO", "inactivityDate": "2024-03-01" }
]`
                }
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-xl bg-lime-500 text-white px-4 py-2 text-sm hover:bg-lime-600 disabled:opacity-60"
          >
            {mutation.isPending ? (deleteMode ? 'Eliminando…' : 'Importando…') : deleteMode ? 'Eliminar' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}
