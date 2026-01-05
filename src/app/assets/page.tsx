'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import AssetTable from '@/components/assets/asset-table';
import ImportAssetsModal from '@/components/assets/import-assets-modal';
import Guard from '@/components/auth-guard';
import { api, type AuthUser } from '@/lib/api';

type AssetSummary = {
  id: string;
  tag: string;
  name: string;
  status?: string;
};

type Site = {
  id: string;
  name: string;
  code?: string | null;
};

type Location = {
  id: string;
  name: string;
  code?: string | null;
  siteId?: string | null;
  site?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
};

export default function AssetsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [showImport, setShowImport] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // ==== Auth / rol ====
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadMe() {
      try {
        const res = await api.get('/api/auth/me');
        if (!active) return;
        setMe(res.data as AuthUser);
      } catch (err) {
        console.error('Error cargando /api/auth/me', err);
        if (!active) return;
        setMe(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    loadMe();
    return () => {
      active = false;
    };
  }, []);

  const roleUpper = me?.role ? String(me.role).toUpperCase() : undefined;
  const isDriver = roleUpper === 'CONDUCTOR';

  // Solo estos roles pueden ver botones de gestión de activos
  const canManageAssets =
    roleUpper === 'SUPER_ADMIN' || roleUpper === 'ACTIVOS_FIJOS';

  // Si es CONDUCTOR, lo mandamos a /routes y no mostramos inventario
  useEffect(() => {
    if (!authLoading && isDriver) {
      router.replace('/routes');
    }
  }, [authLoading, isDriver, router]);

  // ==== Datos para el modal de traslados ====
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [targetSiteId, setTargetSiteId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');

  const [loadingTransferData, setLoadingTransferData] = useState(false);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // 👉 Barra de búsqueda para activos en el modal de traslados
  const [assetSearch, setAssetSearch] = useState('');

  // 👉 Solo activos EN BODEGA / IN_STOCK
  const transferableAssets = assets.filter((a) => {
    const status = String(a.status || '').toUpperCase();
    return status === 'IN_STOCK' || status === 'EN BODEGA';
  });

  // 👉 Filtro por búsqueda (tag o nombre)
  const normalizedSearch = assetSearch.trim().toLowerCase();
  const visibleAssets = transferableAssets.filter((a) => {
    if (!normalizedSearch) return true;
    const tag = (a.tag || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    return tag.includes(normalizedSearch) || name.includes(normalizedSearch);
  });

  // Cargar datos cuando se abre el modal de traslados
  useEffect(() => {
    if (!showTransfer || !canManageAssets) return;

    const loadData = async () => {
      setLoadingTransferData(true);
      setTransferError(null);
      try {
        const [resAssets, resSites, resLocations] = await Promise.all([
          api.get('/api/assets', { params: { pageSize: 500 } }),
          api.get('/api/sites'),
          api.get('/api/catalog/locations'), // bodegas / ubicaciones
        ]);

        setAssets((resAssets.data?.items ?? []) as AssetSummary[]);
        setSites((resSites.data?.items ?? []) as Site[]);
        setLocations((resLocations.data?.items ?? []) as Location[]);
      } catch (err) {
        console.error(err);
        setTransferError('No se pudieron cargar datos para el traslado.');
      } finally {
        setLoadingTransferData(false);
      }
    };

    loadData();
  }, [showTransfer, canManageAssets]);

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Filtrar ubicaciones por sede si el modelo tiene siteId
  const filteredLocations = locations.filter((loc) => {
    if (targetSiteId && 'siteId' in loc && loc.siteId) {
      return loc.siteId === targetSiteId;
    }
    return true;
  });

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssetIds.length) {
      alert('Selecciona al menos un activo.');
      return;
    }
    if (!targetLocationId) {
      alert('Selecciona la bodega / ubicación destino.');
      return;
    }

    setSavingTransfer(true);
    try {
      await api.post('/api/movements/bulk-transfer', {
        assetIds: selectedAssetIds,
        toLocationId: targetLocationId,
        ...(targetSiteId ? { siteId: targetSiteId } : {}),
      });

      setShowTransfer(false);
      setSelectedAssetIds([]);
      setTargetSiteId('');
      setTargetLocationId('');
      setAssetSearch('');
      qc.invalidateQueries({ queryKey: ['assets'] });
    } catch (err) {
      console.error(err);
      alert('No se pudo registrar el traslado.');
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleCloseTransfer = () => {
    setShowTransfer(false);
    setAssetSearch('');
  };

  return (
    <Guard>
      {/* Mientras validamos auth o redirigimos al conductor */}
      {authLoading || isDriver ? (
        <div className="p-4 text-sm text-slate-500">
          {authLoading ? 'Verificando usuario…' : 'Redirigiendo a rutas…'}
        </div>
      ) : (
        <section className="space-y-4">
          {/* Encabezado con acciones */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">Activos</h1>

            {canManageAssets && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTransfer(true)}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Traslados
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Importar CSV
                </button>
                <Link
                  href="/assets/new"
                  className="rounded-xl bg-lime-500 text-white px-4 py-2 text-sm hover:bg-lime-600 disabled:opacity-60"
                >
                  Crear activo
                </Link>
              </div>
            )}
          </div>

          {/* Tabla */}
          <AssetTable />

          {/* Modal de importación (solo roles que pueden gestionar) */}
          {canManageAssets && (
            <ImportAssetsModal
              open={showImport}
              onOpenChange={setShowImport}
              onImported={() => qc.invalidateQueries({ queryKey: ['assets'] })}
            />
          )}

          {/* Modal de TRASLADOS (solo roles que pueden gestionar) */}
          {canManageAssets && showTransfer && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white p-4 shadow-lg dark:bg-slate-900 flex flex-col">
                <h2 className="text-base font-semibold mb-3">Traslado de activos</h2>

                <form
                  onSubmit={handleTransferSubmit}
                  className="flex flex-col gap-3 flex-1 text-sm"
                >
                  <div className="grid gap-4 md:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Columna: selección de activos */}
                    <div>
                      <h3 className="font-medium mb-2 text-sm">Activos en bodega</h3>
                      <p className="text-xs text-slate-500 mb-2">
                        Solo se listan activos que están EN BODEGA / IN_STOCK (no asignados).
                      </p>

                      {/* Barra de búsqueda */}
                      <input
                        type="text"
                        placeholder="Buscar por código o nombre…"
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="mb-2 w-full rounded border px-2 py-1 text-xs bg-white dark:bg-slate-950"
                      />

                      {loadingTransferData && (
                        <p className="text-xs text-slate-500">
                          Cargando activos…
                        </p>
                      )}
                      {transferError && (
                        <p className="text-xs text-red-500">
                          {transferError}
                        </p>
                      )}

                      {!loadingTransferData && !transferableAssets.length && (
                        <p className="text-xs text-slate-500">
                          No hay activos en bodega disponibles para traslado.
                        </p>
                      )}

                      {!loadingTransferData &&
                        transferableAssets.length > 0 &&
                        !visibleAssets.length && (
                          <p className="text-xs text-slate-500">
                            No hay activos que coincidan con la búsqueda.
                          </p>
                        )}

                      <div className="space-y-1 max-h-64 overflow-y-auto border rounded p-2 bg-white dark:bg-slate-950">
                        {visibleAssets.map((a) => (
                          <label
                            key={a.id}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={selectedAssetIds.includes(a.id)}
                              onChange={() => toggleAsset(a.id)}
                            />
                            <span className="truncate">
                              <b>{a.tag}</b>{' — '}{a.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Columna: destino */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Sede destino (opcional)
                        </label>
                        <select
                          className="w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-slate-950"
                          value={targetSiteId}
                          onChange={(e) => {
                            setTargetSiteId(e.target.value);
                            setTargetLocationId('');
                          }}
                        >
                          <option value="">Selecciona…</option>
                          {sites.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {s.code ? ` (${s.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Bodega / Ubicación destino
                        </label>
                        <select
                          className="w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-slate-950"
                          value={targetLocationId}
                          onChange={(e) => setTargetLocationId(e.target.value)}
                          required
                        >
                          <option value="">Selecciona…</option>
                          {filteredLocations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                              {loc.code ? ` (${loc.code})` : ''}
                              {loc.site?.name ? ` — ${loc.site.name}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Footer del modal */}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCloseTransfer}
                      className="rounded-lg border px-3 py-1.5 text-xs"
                      disabled={savingTransfer}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingTransfer || loadingTransferData}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      {savingTransfer ? 'Guardando…' : 'Guardar traslado'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}
    </Guard>
  );
}
