'use client';

import * as React from 'react';
import {
  Dialog, DialogPortal, DialogOverlay, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;   // el botón/enlace que abre el modal
  danger?: boolean;            // pinta el botón de acción en rojo
};

export default function ConfirmDialogFancy({
  title = '¿Seguro?',
  description = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  children,
  danger = true,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleConfirm() {
    try {
      setLoading(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        <DialogContent
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[92vw] max-w-md rounded-2xl border bg-white/95 dark:bg-slate-900/95
                     shadow-2xl p-5"
        >
          <DialogHeader className="mb-1">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl">
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={`rounded-xl ${danger ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
            >
              {loading ? 'Procesando…' : confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
