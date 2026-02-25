import { useEffect, useState, useRef } from 'react';
import { fetchFeedback } from '../lib/api';
import PriorityBadge from '../components/PriorityBadge';
import SentimentBadge from '../components/SentimentBadge';
import { MessageSquare, Package, Truck, CreditCard, RefreshCw, XCircle, ShieldAlert, Ban, UserX, Box, HelpCircle, Tag, RotateCcw, Search, X } from 'lucide-react';

const CATEGORY_CONFIG = [
  { key: 'missing_item', label: 'Missing Item', icon: Package },
  { key: 'damaged', label: 'Damaged', icon: Ban },
  { key: 'refund', label: 'Refund', icon: CreditCard },
  { key: 'replacement', label: 'Replacement', icon: RefreshCw },
  { key: 'cancellation', label: 'Cancellation', icon: XCircle },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'late_delivery', label: 'Late Delivery', icon: Truck },
  { key: 'wrong_item', label: 'Wrong Item', icon: Box },
  { key: 'account_issue', label: 'Account Issue', icon: UserX },
  { key: 'fraud', label: 'Fraud', icon: ShieldAlert },
  { key: 'poor_service', label: 'Poor Service', icon: Tag },
  { key: 'other', label: 'Other', icon: HelpCircle },
];

function formatCategory(cat) {
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Other';
}

export default function Feedback() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sentiment: '', sortBy: 'createdAt', priority: '', category: '', search: '', page: 1 });
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const params = { ...filters, limit: 15 };
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
    fetchFeedback(params).then(setData).finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));
  const toggleCategory = (key) => setFilter('category', filters.category === key ? '' : key);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter('search', val.trim());
    }, 400);
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilter('search', '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
          All Feedback
        </h2>
        <p className="text-sm text-gray-500 mt-1">Browse and filter all analyzed feedback</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by email..."
            className="bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-56"
          />
          {searchInput && (
            <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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
        {(filters.sentiment || filters.priority) && (
          <button
            onClick={() => setFilters({ sentiment: '', sortBy: filters.sortBy, priority: '', category: filters.category, page: 1 })}
            className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset filters
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Issue Type</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('category', '')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !filters.category
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
            }`}
          >
            All
          </button>
          {CATEGORY_CONFIG.map(({ key, label, icon: Icon }) => {
            const isActive = filters.category === key;
            return (
              <button
                key={key}
                onClick={() => setFilter('category', key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>
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
                  <th className="text-left py-2 pr-4 font-medium">Issue</th>
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
                    <td className="py-3 pr-4">
                      {item.issueCategory && item.issueCategory !== 'other' && (
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-xs whitespace-nowrap">
                          {formatCategory(item.issueCategory)}
                        </span>
                      )}
                      {(!item.issueCategory || item.issueCategory === 'other') && (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
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
