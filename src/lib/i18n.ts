// src/lib/i18n.ts
// Etiquetas en ESPAÑOL para enums y valores del dominio.
// Compatibles con valores antiguos en INGLÉS.

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
type Dict = Record<string, string>;

function normalizeKey(v?: string | null) {
  return (v ?? '').trim().toUpperCase();
}

function pick(map: Dict, v?: string | null, fallback = '—') {
  if (!v) return fallback;
  const key = normalizeKey(v);
  return map[key] ?? fallback;
}

// ──────────────────────────────────────────────────────────────────────────
// Activos
// ──────────────────────────────────────────────────────────────────────────
export function tAssetStatus(s?: string | null) {
  const map: Dict = {
    // ✅ Nuevos (esquema ES)
    EN_BODEGA: 'EN BODEGA',
    ASIGNADO: 'ASIGNADO',
    EN_REPARACION: 'EN REPARACIÓN',
    PERDIDO: 'PERDIDO',
    BAJA: 'BAJA',

    // ↩︎ Compat inglés
    IN_STOCK: 'EN BODEGA',
    ASSIGNED: 'ASIGNADO',
    IN_REPAIR: 'EN REPARACIÓN',
    LOST: 'PERDIDO',
    DISPOSED: 'BAJA',
  };
  return pick(map, s);
}

export function tLifeState(s?: string | null) {
  const map: Dict = {
    // ✅ Nuevos
    ACTIVO: 'ACTIVO',
    INACTIVO: 'INACTIVO',
    RETIRADO: 'RETIRADO',

    // ↩︎ Compat inglés
    ACTIVE: 'ACTIVO',
    INACTIVE: 'INACTIVO',
    RETIRED: 'RETIRADO',
  };
  return pick(map, s);
}

// ──────────────────────────────────────────────────────────────────────────
// Movimientos
// ──────────────────────────────────────────────────────────────────────────
export function tMovement(s?: string | null) {
  const map: Dict = {
    // ✅ Nuevos
    ENTRADA_INVENTARIO: 'Entrada a inventario',
    SALIDA_INVENTARIO: 'Salida de inventario',
    ASIGNACION: 'Asignación',
    DEVOLUCION: 'Devolución',
    TRASLADO: 'Traslado',
    MANTENIMIENTO_SALIDA: 'Salida a mantenimiento',
    MANTENIMIENTO_ENTRADA: 'Regreso de mantenimiento',

    // ↩︎ Compat inglés
    STOCK_IN: 'Entrada a inventario',
    STOCK_OUT: 'Salida de inventario',
    ASSIGN: 'Asignación',
    RETURN: 'Devolución',
    TRANSFER: 'Traslado',
    MAINTENANCE_OUT: 'Salida a mantenimiento',
    MAINTENANCE_IN: 'Regreso de mantenimiento',
  };
  return pick(map, s);
}

// ──────────────────────────────────────────────────────────────────────────
// Rutas
// ──────────────────────────────────────────────────────────────────────────
export function tRouteStatus(s?: string | null) {
  const map: Dict = {
    // ✅ Nuevos
    BORRADOR: 'Borrador',
    PROGRAMADA: 'Programada',
    EN_CURSO: 'En curso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',

    // ↩︎ Compat inglés
    DRAFT: 'Borrador',
    SCHEDULED: 'Programada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
  };
  return pick(map, s);
}

export function tRouteType(s?: string | null) {
  const map: Dict = {
    // ✅ Nuevos
    ENTREGA: 'ENTREGA',
    RECOGIDA: 'RECOGIDA',
    MIXTA: 'MIXTA',

    // ↩︎ Compat inglés
    DELIVERY: 'ENTREGA',
    PICKUP: 'RECOGIDA',
    MIXED: 'MIXTA',
  };
  return pick(map, s);
}

export function tStopType(s?: string | null) {
  const map: Dict = {
    // ✅ Nuevos
    ENTREGA: 'ENTREGA',
    RECOGIDA: 'RECOGIDA',

    // ↩︎ Compat inglés
    DELIVERY: 'ENTREGA',
    PICKUP: 'RECOGIDA',
  };
  return pick(map, s);
}

export function tRouteItemAction(s?: string | null) {
  const map: Dict = {
    // ✅ Nuevos
    ENTREGAR: 'Entregar',
    RECOGER: 'Recoger',

    // ↩︎ Compat inglés
    DELIVER: 'Entregar',
    PICKUP: 'Recoger',
  };
  return pick(map, s);
}

// ──────────────────────────────────────────────────────────────────────────
/** Tipo de movimiento de handover (documento): ENTREGA / RECOGIDA */
export function tHandoverType(s?: string | null) {
  const map: Dict = {
    ENTREGA: 'ENTREGA',
    RECOGIDA: 'RECOGIDA',
  };
  return pick(map, s);
}

/** Parentesco mostrado en firmas/entregas (normaliza varias variantes) */
export function tPersonRelation(s?: string | null) {
  const map: Dict = {
    // Núcleo
    PACIENTE: 'PACIENTE',
    CUIDADOR: 'CUIDADOR',
    FAMILIAR: 'FAMILIAR',
    COLABORADOR: 'COLABORADOR',

    // Familiares comunes
    MADRE: 'MADRE',
    PADRE: 'PADRE',
    HIJO: 'HIJO',
    HIJA: 'HIJA',
    HERMANO: 'HERMANO',
    HERMANA: 'HERMANA',
    ESPOSO: 'ESPOSO',
    ESPOSA: 'ESPOSA',
    ABUELA: 'ABUELA',
    ABUELO: 'ABUELO',
    NIETO: 'NIETO',
    NIETA: 'NIETA',
    TIO: 'TÍO',
    TIA: 'TÍA',
    PRIMO: 'PRIMO',
    PRIMA: 'PRIMA',
    CUÑADO: 'CUÑADO',
    CUÑADA: 'CUÑADA',
    YERNO: 'YERNO',
    NUERA: 'NUERA',
    TUTOR: 'TUTOR',
    TUTORA: 'TUTORA',
    HIJASTRO: 'HIJASTRO',
    HIJASTRA: 'HIJASTRA',
    SOBRINO: 'SOBRINO',
    SOBRINA: 'SOBRINA',
  };
  return pick(map, s);
}
