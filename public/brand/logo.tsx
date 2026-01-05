'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Props = {
  height?: number;      // alto del logo en px
  showName?: boolean;   // mostrar “STOCKit” al lado
};

export default function LogoAuto({ height = 28, showName = true }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Mientras no monta (SSR), usa el claro; al montar, cambia según tema
  const src = !mounted
    ? '/brand/Recurso_2isotipo_color.svg'
    : resolvedTheme === 'dark'
      ? '/brand/Recurso_2isotipo_blanco.svg'
      : '/brand/Recurso_2isotipo_color.svg';

  return (
    <div className="flex items-center gap-2">
      <Image
        src={src}
        alt="Logo MTD"
        width={height * 4}   // ajusta la relación ancho/alto de tu isotipo
        height={height}
        priority
        className="h-10 w-10"
      />
      {showName && <span className="font-semibold tracking-wide">StockIT</span>}
    </div>
  );
}
