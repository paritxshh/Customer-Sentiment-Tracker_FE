import { useEffect, useState, useRef } from 'react';
import { fetchCustomers } from '../lib/api';
import { Users, Search, X, Phone } from 'lucide-react';

export default function Customers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchCustomers({ sortBy, search: search || undefined, page, limit: 20 }).then(setData).finally(() => setLoading(false));
  }, [sortBy, search, page]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Customers
          </h2>
          <p className="text-sm text-gray-500 mt-1">Track customer sentiment over time</p>
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
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
            <option value="createdAt">Newest</option>
            <option value="sentiment">Most Negative</option>
            <option value="feedback">Most Feedback</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.results?.length ? (
        <p className="text-gray-500 text-center py-16">No customers found</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.results.map((c) => (
              <div
                key={c._id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{c.customerId}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.avgSentimentScore < -0.3 ? 'bg-red-500/10 text-red-400' : c.avgSentimentScore > 0.3 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                    {c.avgSentimentScore}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200">{c.name || c.email}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.email}</p>
                {c.phone && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-gray-400">{c.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
                  <span>{c.feedbackCount} feedback{c.feedbackCount !== 1 ? 's' : ''}</span>
                  <span className="capitalize">Last: {c.lastSentiment}</span>
                </div>
              </div>
            ))}
          </div>

          {data.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Page {data.pagination.page} of {data.pagination.pages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
                <button disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
