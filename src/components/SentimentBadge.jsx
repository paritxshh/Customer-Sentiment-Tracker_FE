import clsx from 'clsx';

const STYLES = {
  positive: 'bg-emerald-500/15 text-emerald-400',
  negative: 'bg-red-500/15 text-red-400',
  neutral: 'bg-gray-500/15 text-gray-400',
  mixed: 'bg-amber-500/15 text-amber-400',
};

export default function SentimentBadge({ sentiment, score }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', STYLES[sentiment] || STYLES.neutral)}>
      {sentiment}
      {score != null && <span className="opacity-70">({score})</span>}
    </span>
  );
}
