// src/components/ui/status-badge.tsx
'use client';

import { tAssetStatus } from '@/lib/i18n';

export default function StatusBadge({ status }: { status?: string | null }) {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide';
  const css: Record<string, string> = {
    IN_STOCK:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    ASSIGNED:
      'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    IN_REPAIR:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    DISPOSED:
      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  };

  const klass = status ? css[status] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' 
                       : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return <span className={`${base} ${klass}`}>{tAssetStatus(status)}</span>;
}
