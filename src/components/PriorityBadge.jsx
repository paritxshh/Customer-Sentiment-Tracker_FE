import clsx from 'clsx';

const STYLES = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export default function PriorityBadge({ level, score }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', STYLES[level] || STYLES.low)}>
      {level}
      {score != null && <span className="opacity-70">({score})</span>}
    </span>
  );
}
