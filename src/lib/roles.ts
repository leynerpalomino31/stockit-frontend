export type AppRole =
  | 'CONDUCTOR'
  | 'ADMINISTRATIVO'
  | 'INVENTARIO'
  | 'SUPER ADMIN'
  | 'ACTIVOS FIJOS';

export type Caps = {
  viewInventory: boolean;   // Puede ver Inventario (listados, detalle)
  editInventory: boolean;   // Puede crear/editar/eliminar/registrar movimientos/importar
  viewRoutes: boolean;      // Puede ver Rutas
  editRoutes: boolean;      // Puede crear/editar rutas
  adminAll: boolean;        // Todo
};

export function capsFor(role?: string | null): Caps {
  const r = (role || '').toUpperCase();

  // Matriz de permisos
  switch (r as AppRole) {
    case 'CONDUCTOR':
      return { viewInventory: false, editInventory: false, viewRoutes: true,  editRoutes: true,  adminAll: false };
    case 'ADMINISTRATIVO':
      return { viewInventory: true,  editInventory: false, viewRoutes: false, editRoutes: false, adminAll: false };
    case 'INVENTARIO':
      return { viewInventory: true,  editInventory: true,  viewRoutes: true,  editRoutes: true,  adminAll: false };
    case 'ACTIVOS FIJOS':
    case 'SUPER ADMIN':
      return { viewInventory: true,  editInventory: true,  viewRoutes: true,  editRoutes: true,  adminAll: true  };
    default:
      // Por defecto: solo lectura de inventario
      return { viewInventory: true, editInventory: false, viewRoutes: false, editRoutes: false, adminAll: false };
  }
}
