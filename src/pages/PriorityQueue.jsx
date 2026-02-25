import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchPriorityQueue, fetchUsers, updateFeedback, callCustomerWithDefault } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PriorityBadge from '../components/PriorityBadge';
import SentimentBadge from '../components/SentimentBadge';
import {
  AlertTriangle, ChevronDown, ChevronUp, Package, Truck, CreditCard,
  RefreshCw, XCircle, ShieldAlert, Ban, UserX, Box, HelpCircle, Tag,
  Search, X, UserPlus, CheckCircle2, Clock, Circle, Phone,
} from 'lucide-react';

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

const STATUS_CONFIG = {
  new: { label: 'New', icon: Circle, color: 'text-gray-400 bg-gray-500/10 border-gray-600' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-600' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-600' },
};

function formatCategory(cat) {
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Other';
}

export default function PriorityQueue() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState({});
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const debounceRef = useRef(null);
  const isAdmin = user?.username === 'admin';

  const loadData = useCallback(() => {
    setLoading(true);
    fetchPriorityQueue({
      level: level || undefined,
      category: category || undefined,
      status: statusFilter || undefined,
      assignedTo: assigneeFilter || undefined,
      search: search || undefined,
      page,
      limit: 20,
    })
      .then(setData)
      .finally(() => setLoading(false));
  }, [level, category, statusFilter, assigneeFilter, search, page]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { fetchUsers().then(setUsers).catch(() => {}); }, []);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val.trim());
      setPage(1);
    }, 400);
  };

  const clearSearch = () => { setSearchInput(''); setSearch(''); setPage(1); };
  const toggleCategory = (key) => { setCategory((prev) => (prev === key ? '' : key)); setPage(1); };
  const changeLevel = (val) => { setLevel(val); setPage(1); };

  const [error, setError] = useState('');
  const [calling, setCalling] = useState({});

  const handleAssign = async (feedbackId, userId) => {
    setUpdating((prev) => ({ ...prev, [feedbackId]: true }));
    setError('');
    try {
      const updated = await updateFeedback(feedbackId, {
        assignedTo: userId || null,
      });
      setData((prev) => ({
        ...prev,
        results: prev.results.map((r) => (r._id === feedbackId ? updated : r)),
      }));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Assign failed';
      setError(msg);
    } finally {
      setUpdating((prev) => ({ ...prev, [feedbackId]: false }));
    }
  };

  const handleAssignToMe = async (feedbackId) => {
    if (!user?.id) return;
    await handleAssign(feedbackId, user.id);
  };

  const handleStatusChange = async (feedbackId, newStatus) => {
    if (newStatus === 'resolved') {
      setResolveModal(feedbackId);
      setResolveNote('');
      return;
    }
    setUpdating((prev) => ({ ...prev, [feedbackId]: true }));
    setError('');
    try {
      const updated = await updateFeedback(feedbackId, { status: newStatus });
      setData((prev) => ({
        ...prev,
        results: prev.results.map((r) => (r._id === feedbackId ? updated : r)),
      }));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Status update failed';
      setError(msg);
    } finally {
      setUpdating((prev) => ({ ...prev, [feedbackId]: false }));
    }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    setUpdating((prev) => ({ ...prev, [resolveModal]: true }));
    setError('');
    try {
      const updated = await updateFeedback(resolveModal, {
        status: 'resolved',
        resolutionNote: resolveNote.trim(),
      });
      setData((prev) => ({
        ...prev,
        results: prev.results.map((r) => (r._id === resolveModal ? updated : r)),
      }));
      setResolveModal(null);
      setResolveNote('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Resolve failed';
      setError(msg);
    } finally {
      setUpdating((prev) => ({ ...prev, [resolveModal]: false }));
    }
  };

  const handleCall = async (item) => {
    const phone = item.customer?.phone;
    if (!phone) return;
    setCalling((prev) => ({ ...prev, [item._id]: 'calling' }));
    setError('');
    try {
      await callCustomerWithDefault({
        toNumber: phone,
        dynamicVariables: {
          customer_name: item.senderName || item.customer?.name || 'Customer',
          customer_email: item.senderEmail || '',
          issue_type: formatCategory(item.issueCategory),
          priority: item.priorityLevel,
          issue_summary: (item.emailSubject || item.text?.slice(0, 200) || ''),
        },
      });
      setCalling((prev) => ({ ...prev, [item._id]: 'success' }));
      setTimeout(() => setCalling((prev) => ({ ...prev, [item._id]: null })), 3000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Call failed';
      setError(msg);
      setCalling((prev) => ({ ...prev, [item._id]: null }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            value={assigneeFilter}
            onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Assignees</option>
            <option value={user?.id || ''}>My Tickets</option>
            <option value="unassigned">Unassigned</option>
            {isAdmin && users.filter((u) => u._id !== user?.id).map((u) => (
              <option key={u._id} value={u._id}>{u.displayName || u.username}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
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

      {/* Summary */}
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

      {/* Category filter */}
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

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Queue items */}
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
          {data.results.map((item) => {
            const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
            const StIcon = st.icon;
            const assignedUser = item.assignedTo;
            const isUpdating = updating[item._id];

            return (
              <div key={item._id} className={`bg-gray-900 border rounded-xl overflow-hidden ${item.status === 'resolved' ? 'border-gray-800/50 opacity-60' : 'border-gray-800'}`}>
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
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status badge */}
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border ${st.color}`}>
                      <StIcon className="w-3 h-3" />
                      {st.label}
                    </span>
                    {/* Assignee badge */}
                    {assignedUser ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-indigo-600 text-indigo-300 bg-indigo-500/10">
                        {assignedUser.displayName || assignedUser.username}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-gray-700 text-gray-500 bg-gray-800/50">
                        Unassigned
                      </span>
                    )}
                    <SentimentBadge sentiment={item.sentiment} score={item.score} />
                    {item.customer?.phone && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-emerald-700 text-emerald-400 bg-emerald-500/10" title={item.customer.phone}>
                        <Phone className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  {expanded === item._id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>

                {expanded === item._id && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{item.text}</p>

                    {item.urgencyKeywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.urgencyKeywords.map((kw) => (
                          <span key={kw} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">{kw}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Source: {item.source}</span>
                      <span>Urgency: {item.urgency}</span>
                      {item.issueCategory && <span>Issue: {formatCategory(item.issueCategory)}</span>}
                      {item.senderName && <span>Sender: {item.senderName}</span>}
                      {item.customer?.phone && (
                        <span className="text-emerald-400">
                          <Phone className="w-3 h-3 inline mr-1" />{item.customer.phone}
                        </span>
                      )}
                    </div>

                    {item.customer?.phone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCall(item); }}
                        disabled={calling[item._id] === 'calling'}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-50 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {calling[item._id] === 'calling'
                          ? 'Calling...'
                          : calling[item._id] === 'success'
                            ? 'Call Started!'
                            : `Call via Voice Bot`}
                      </button>
                    )}

                    {item.resolutionNote && (
                      <div className="bg-emerald-500/5 border border-emerald-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-emerald-400 mb-1">Resolution Note</p>
                        <p className="text-sm text-gray-300">{item.resolutionNote}</p>
                        {item.resolvedAt && (
                          <p className="text-xs text-gray-500 mt-1">Resolved {new Date(item.resolvedAt).toLocaleString()}</p>
                        )}
                      </div>
                    )}

                    {/* Action bar */}
                    {item.status !== 'resolved' && (
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-800/50">
                        {isAdmin && (
                          <>
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-3.5 h-3.5 text-gray-500" />
                              <select
                                value={assignedUser?._id || ''}
                                onChange={(e) => { e.stopPropagation(); handleAssign(item._id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isUpdating}
                                className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                              >
                                <option value="">Unassigned</option>
                                {users.map((u) => (
                                  <option key={u._id} value={u._id}>{u.displayName || u.username}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {!isAdmin && assignedUser && (
                          <span className="text-xs text-gray-500">
                            Assigned to <span className="text-indigo-400 font-medium">{assignedUser.displayName || assignedUser.username}</span>
                          </span>
                        )}

                        {(isAdmin || (assignedUser && assignedUser._id === user?.id)) && (
                          <div className="ml-auto flex items-center gap-2">
                            {item.status === 'new' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(item._id, 'in_progress'); }}
                                disabled={isUpdating}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
                              >
                                Start Working
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(item._id, 'resolved'); }}
                              disabled={isUpdating}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                            >
                              Resolve
                            </button>
                          </div>
                        )}

                        {!isAdmin && !assignedUser && (
                          <span className="ml-auto text-xs text-gray-600 italic">Waiting for assignment</span>
                        )}

                        {!isAdmin && assignedUser && assignedUser._id !== user?.id && (
                          <span className="ml-auto text-xs text-gray-600 italic">Assigned to {assignedUser.displayName || assignedUser.username}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
            <button disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-1">Resolve Feedback</h3>
            <p className="text-sm text-gray-500 mb-4">Add an optional note about how this was resolved.</p>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="e.g. Refund issued, customer contacted..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setResolveModal(null); setResolveNote(''); }}
                className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={updating[resolveModal]}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {updating[resolveModal] ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
