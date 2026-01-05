import { Inbox } from 'lucide-react';

export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border rounded-xl bg-white dark:bg-slate-900 p-8 text-center space-y-2">
      <div className="mx-auto h-12 w-12 grid place-content-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
        <Inbox size={20}/>
      </div>
      <h3 className="font-medium">{title}</h3>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
