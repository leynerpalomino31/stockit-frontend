export default function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <div className="h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" style={{ width }} />;
}
