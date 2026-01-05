'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

/* ============================
   Tipos mini (opcionales)
============================ */
type MiniItem = { id: string; name: string };
type MiniSite = { id: string; name: string; code: string };
type MiniUser = { id: string; email: string | null; name?: string | null; role?: string };

export type PersonMini = {
  id: string;
  fullName: string;
  documentId?: string | null;
  email?: string | null;
  phone?: string | null;
};

/* ===== Rutas ===== */
export type MiniRoute = {
  id: string;
  code: string;           // ej. "RUTA 001"
  date: string;
  type: 'DELIVERY' | 'PICKUP' | 'MIXED';
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  address: string | null;
  contact: string | null;
  contactPhone: string | null;
  contactDoc: string | null;
  assetTags: string[];
};

export type RouteDetail = MiniRoute & {
  vehiclePlate?: string | null;
  notes?: string | null;
  // backend puede enviar uno u otro:
  driverName?: string | null;
  driverId?: string | null;
  stop?: {
    id: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    contactName: string | null;
    contactPhone: string | null;
    type: 'DELIVERY' | 'PICKUP';
    notes: string | null;
    items: Array<{ id: string; action: 'DELIVER' | 'PICKUP'; qty: number; asset: { id: string; tag: string; name: string } }>;
  } | null;
};

/* Helper defensivo: asegura [] ante errores */
async function safeGetArray<T = any>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    const out = await fn();
    return Array.isArray(out) ? out : [];
  } catch {
    return [];
  }
}

/* ============================
   Autenticación / sesión
============================ */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; user: any }>('/api/auth/me');
      return data.user;
    },
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/* ============================
   Queries (siempre retornan [])
============================ */
export function useCategories(q = '') {
  return useQuery<MiniItem[]>({
    queryKey: ['categories', q],
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: MiniItem[] }>('/api/catalog/categories', {
          params: { q, pageSize: 100 },
        });
        return data?.items ?? [];
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useLocations(q = '') {
  return useQuery<MiniItem[]>({
    queryKey: ['locations', q],
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: MiniItem[] }>('/api/catalog/locations', {
          params: { q, pageSize: 100 },
        });
        return data?.items ?? [];
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Personas (catálogo general): incluye documentId.
 */
export function usePersons(q = '') {
  return useQuery<PersonMini[]>({
    queryKey: ['persons', q],
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: PersonMini[] }>('/api/catalog/persons', {
          params: { q, pageSize: 100 },
        });
        return data?.items ?? [];
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 🔎 Búsqueda para la pantalla “Usuarios” (por nombre o documento).
 * Endpoint: /api/people?q=...
 */
export type PeopleRow = {
  id: string;
  documentId: string | null;
  fullName: string;
  type?: string | null;
  eps?: string | null;
  department?: string | null;
  municipality?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  finalStatus?: string | null;
  inactivityDate?: string | null;
};

export function usePeopleSearch(q: string, pageSize = 100) {
  return useQuery<PeopleRow[]>({
    queryKey: ['people-search', q, pageSize],
    enabled: (q ?? '').trim().length > 0,
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: PeopleRow[] }>('/api/people', {
          params: { q, pageSize },
        });
        return data?.items ?? [];
      }),
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  });
}

/**
 * Personas para ENTREGAS/RECOGIDAS (por nombre/doc).
 * Endpoint: /api/people/handover/search?q=...&limit=...
 */
export function usePersonsForHandover(q = '', limit = 3000) {
  return useQuery<PersonMini[]>({
    queryKey: ['people-handover-search', q, limit],
    enabled: (q ?? '').trim().length > 0,
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: PersonMini[] }>('/api/people/handover/search', {
          params: { q, limit },
        });
        return data?.items ?? [];
      }),
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  });
}

/**
 * Usuarios administrativos mini (si aplica en tu app)
 */
export function useUsersMini() {
  return useQuery<MiniUser[]>({
    queryKey: ['users-mini'],
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: MiniUser[] }>('/api/users', {
          params: { pageSize: 500 },
        });
        return data?.items ?? [];
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Conductores (usuarios con rol CONDUCTOR).
 * Backend: GET /api/users/drivers?q=&active=true
 */
export type DriverMini = { id: string; fullName: string; email?: string | null; documentId?: string | null };
export function useDrivers(q = '', active = true) {
  return useQuery<DriverMini[]>({
    queryKey: ['drivers', q, active],
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: DriverMini[] }>('/api/users/drivers', {
          params: { q, active },
        });
        return data?.items ?? [];
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useSites() {
  return useQuery<MiniSite[]>({
    queryKey: ['sites'],
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: MiniSite[] }>('/api/sites', {
          params: { pageSize: 100 },
        });
        return data?.items ?? [];
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/* ===== Rutas ===== */
export function useRoutesList(q = '') {
  return useQuery<MiniRoute[]>({
    queryKey: ['routes', q],
    queryFn: () =>
      safeGetArray(async () => {
        const { data } = await api.get<{ items: MiniRoute[] }>('/api/routes', {
          params: { q, pageSize: 50 },
        });
        return data?.items ?? [];
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useRoute(id?: string) {
  return useQuery<RouteDetail>({
    queryKey: ['route', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<RouteDetail>(`/api/routes/${id}`);
      return data as RouteDetail;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/* ============================
   Mutations
============================ */
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/api/catalog/categories/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/catalog/categories/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/api/catalog/locations/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/catalog/locations/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  });
}
