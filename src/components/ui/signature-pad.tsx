'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false });

type Props = {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
};

export default function SignaturePad({ value, onChange }: Props) {
  const ref = useRef<any>(null);

  useEffect(() => {
    // si quieres precargar una firma desde value, aquí podrías hacerlo
  }, [value]);

  const clear = () => {
    ref.current?.clear();
    onChange(null);
  };

  const handleEnd = () => {
    const empty = ref.current?.isEmpty?.();
    onChange(empty ? null : ref.current?.toDataURL('image/png'));
  };

  return (
    <div>
      <div className="rounded-xl border bg-white dark:bg-slate-950">
        <SignatureCanvas
          ref={ref}
          canvasProps={{ width: 500, height: 200, className: 'w-full h-[200px] rounded-xl' }}
          onEnd={handleEnd}
          backgroundColor="rgba(0,0,0,0)"
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="rounded-xl border px-3 py-1.5 text-sm" onClick={clear}>
          Limpiar
        </button>
      </div>
    </div>
  );
}
