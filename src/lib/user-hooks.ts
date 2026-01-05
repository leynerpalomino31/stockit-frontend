'use client';
import { api } from './api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/api/users')).data
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name: string; role: 'ADMIN'|'OPERATOR'|'VIEWER'; password: string }) =>
      api.post('/api/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; role?: string; isActive?: boolean } }) =>
      api.patch(`/api/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/api/users/${id}/reset-password`, { password }),
  });
}
