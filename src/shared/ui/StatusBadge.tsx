export function StatusBadge({ status }: { status: 'ready' | 'active' | 'next' }) {
  const styles = {
    ready: 'bg-brand-teal/12 text-brand-teal',
    active: 'bg-brand-coral/12 text-brand-coral',
    next: 'bg-ink/8 text-ink',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${styles[status]}`}
    >
      {status}
    </span>
  );
}
