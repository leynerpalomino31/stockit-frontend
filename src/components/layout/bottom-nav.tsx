'use client';
import Link from 'next/link';
import { Home, PackageSearch, PlusSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';

const Item = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
  const path = usePathname();
  const active = path === href || (href !== '/' && path.startsWith(href));
  return (
    <Link
      href={href}
      className={`flex flex-col items-center py-2 text-xs
        ${active ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'}`}
    >
      <Icon size={20}/>
      <span className="mt-1">{label}</span>
    </Link>
  );
};

export default function BottomNav() {
  return (
    <footer className="sticky bottom-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur">
      <nav className="grid grid-cols-3 max-w-screen-md mx-auto">
        <Item href="/" icon={Home} label="Inicio" />
        <Item href="/assets" icon={PackageSearch} label="Activos" />
        <Item href="/assets/new" icon={PlusSquare} label="Nuevo" />
        <Item href="/settings" icon={Settings} label="Config" />
      </nav>
    </footer>
  );
}
