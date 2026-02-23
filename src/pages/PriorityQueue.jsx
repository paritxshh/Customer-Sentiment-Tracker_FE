import { useEffect, useState } from 'react';
import { fetchPriorityQueue } from '../lib/api';
import PriorityBadge from '../components/PriorityBadge';
import SentimentBadge from '../components/SentimentBadge';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function PriorityQueue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    setLoading(true);
    fetchPriorityQueue({ level: level || undefined })
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, [level]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            Priority Queue
          </h2>
          <p className="text-sm text-gray-500 mt-1">Critical and high priority feedback requiring immediate attention</p>
        </div>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Urgent</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {data?.summary && (
        <div className="flex gap-3">
          {Object.entries(data.summary).map(([lvl, info]) => (
            <div key={lvl} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm">
              <span className="capitalize text-gray-400">{lvl}:</span>{' '}
              <span className="font-bold text-gray-200">{info.count}</span>
              <span className="text-gray-600 ml-1">(avg {info.avgScore})</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.results?.length ? (
        <div className="text-center py-16 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No urgent feedback found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.results.map((item) => (
            <div key={item._id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === item._id ? null : item._id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-800/50 transition-colors"
              >
                <PriorityBadge level={item.priorityLevel} score={item.priorityScore} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{item.emailSubject || item.text?.slice(0, 80)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.senderEmail || 'API submission'} &middot; {new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <SentimentBadge sentiment={item.sentiment} score={item.score} />
                {expanded === item._id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {expanded === item._id && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{item.text}</p>
                  {item.urgencyKeywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.urgencyKeywords.map((kw) => (
                        <span key={kw} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">{kw}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Source: {item.source}</span>
                    <span>Urgency: {item.urgency}</span>
                    {item.senderName && <span>Sender: {item.senderName}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
