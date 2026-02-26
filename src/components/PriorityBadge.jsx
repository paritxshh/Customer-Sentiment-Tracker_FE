import clsx from 'clsx';

const STYLES = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30 ring-red-500/10',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30 ring-orange-500/10',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30 ring-amber-500/10',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-emerald-500/10',
};

export default function PriorityBadge({ level, score }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide border ring-1',
        STYLES[level] || STYLES.low,
      )}
    >
      {level}
      {score != null && <span className="opacity-60 font-normal normal-case">({score})</span>}
    </span>
  );
}
