import { useEffect, useState } from 'react';
import { fetchFeedback } from '../lib/api';
import PriorityBadge from '../components/PriorityBadge';
import SentimentBadge from '../components/SentimentBadge';
import { MessageSquare } from 'lucide-react';

export default function Feedback() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sentiment: '', sortBy: 'createdAt', priority: '', page: 1 });

  useEffect(() => {
    setLoading(true);
    const params = { ...filters, limit: 15 };
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
    fetchFeedback(params).then(setData).finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
          All Feedback
        </h2>
        <p className="text-sm text-gray-500 mt-1">Browse and filter all analyzed feedback</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filters.sentiment} onChange={(e) => setFilter('sentiment', e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
          <option value="mixed">Mixed</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filters.sortBy} onChange={(e) => setFilter('sortBy', e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="createdAt">Newest First</option>
          <option value="priority">Highest Priority</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.results?.length ? (
        <p className="text-gray-500 text-center py-16">No feedback found</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 pr-4 font-medium">Feedback</th>
                  <th className="text-left py-2 pr-4 font-medium">Sender</th>
                  <th className="text-left py-2 pr-4 font-medium">Sentiment</th>
                  <th className="text-left py-2 pr-4 font-medium">Priority</th>
                  <th className="text-left py-2 pr-4 font-medium">Source</th>
                  <th className="text-left py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((item) => (
                  <tr key={item._id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 pr-4 max-w-xs">
                      <p className="text-gray-300 truncate">{item.emailSubject || item.text?.slice(0, 60)}</p>
                      {item.urgencyKeywords?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.urgencyKeywords.slice(0, 3).map((kw) => (
                            <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">{kw}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{item.senderEmail || '—'}</td>
                    <td className="py-3 pr-4"><SentimentBadge sentiment={item.sentiment} score={item.score} /></td>
                    <td className="py-3 pr-4"><PriorityBadge level={item.priorityLevel} score={item.priorityScore} /></td>
                    <td className="py-3 pr-4 text-gray-500 capitalize">{item.source || 'api'}</td>
                    <td className="py-3 text-gray-500 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)</span>
              <div className="flex gap-2">
                <button disabled={data.pagination.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
                <button disabled={data.pagination.page >= data.pagination.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
