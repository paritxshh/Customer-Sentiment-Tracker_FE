import { useEffect, useState, useRef } from 'react';
import { fetchPriorityQueue } from '../lib/api';
import PriorityBadge from '../components/PriorityBadge';
import SentimentBadge from '../components/SentimentBadge';
import { AlertTriangle, ChevronDown, ChevronUp, Package, Truck, CreditCard, RefreshCw, XCircle, ShieldAlert, Ban, UserX, Box, HelpCircle, Tag, Search, X } from 'lucide-react';

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

export default function PriorityQueue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchPriorityQueue({
      level: level || undefined,
      category: category || undefined,
      search: search || undefined,
      page,
      limit: 20,
    })
      .then(setData)
      .finally(() => setLoading(false));
  }, [level, category, search, page]);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val.trim());
      setPage(1);
    }, 400);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const toggleCategory = (key) => {
    setCategory((prev) => (prev === key ? '' : key));
    setPage(1);
  };

  const changeLevel = (val) => {
    setLevel(val);
    setPage(1);
  };

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
        <div className="flex items-center gap-3">
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
          <select
            value={level}
            onChange={(e) => changeLevel(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Urgent</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {data?.summary && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(data.summary).map(([lvl, info]) => (
            <div key={lvl} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm">
              <span className="capitalize text-gray-400">{lvl}:</span>{' '}
              <span className="font-bold text-gray-200">{info.count}</span>
              <span className="text-gray-600 ml-1">(avg {info.avgScore})</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Filter by Issue Type</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategory(''); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !category
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
            }`}
          >
            All
          </button>
          {CATEGORY_CONFIG.map(({ key, label, icon: Icon }) => {
            const count = data?.categories?.[key] || 0;
            const isActive = category === key;
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : count > 0
                      ? 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                      : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-default'
                }`}
                disabled={count === 0 && !isActive}
              >
                <Icon className="w-3 h-3" />
                {label}
                {count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-indigo-500/30' : 'bg-gray-800'}`}>
                    {count}
                  </span>
                )}
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
        <div className="text-center py-16 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{category ? `No "${formatCategory(category)}" issues found` : 'No urgent feedback found'}</p>
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500">{item.senderEmail || 'API submission'} &middot; {new Date(item.createdAt).toLocaleString()}</p>
                    {item.issueCategory && item.issueCategory !== 'other' && (
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-medium">
                        {formatCategory(item.issueCategory)}
                      </span>
                    )}
                  </div>
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
                    {item.issueCategory && <span>Issue: {formatCategory(item.issueCategory)}</span>}
                    {item.senderName && <span>Sender: {item.senderName}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
            <button disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
