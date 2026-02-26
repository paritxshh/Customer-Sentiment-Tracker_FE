import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchPriorityQueue, fetchUsers, updateFeedback, callCustomerWithDefault, endVoiceCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PriorityBadge from '../components/PriorityBadge';
import SentimentBadge from '../components/SentimentBadge';
import {
  AlertTriangle, ChevronDown, ChevronUp, Package, Truck, CreditCard,
  RefreshCw, XCircle, ShieldAlert, Ban, UserX, Box, HelpCircle, Tag,
  Search, X, UserPlus, CheckCircle2, Clock, Circle, Phone,
  Filter, ChevronLeft, ChevronRight,
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
  new: { label: 'New', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-600' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-600' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-600' },
};

const PRIORITY_BORDER = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-emerald-500',
};

const SUMMARY_STYLE = {
  critical: { border: 'border-red-500/30', text: 'text-red-400', bg: 'bg-red-500/5', icon: '🔴' },
  high: { border: 'border-orange-500/30', text: 'text-orange-400', bg: 'bg-orange-500/5', icon: '🟠' },
  medium: { border: 'border-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/5', icon: '🟡' },
  low: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/5', icon: '🟢' },
};

function formatCategory(cat) {
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Other';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
  const [showFilters, setShowFilters] = useState(false);
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
  const [activeCall, setActiveCall] = useState(null);

  const handleAssign = async (feedbackId, userId) => {
    setUpdating((prev) => ({ ...prev, [feedbackId]: true }));
    setError('');
    try {
      const updated = await updateFeedback(feedbackId, { assignedTo: userId || null });
      setData((prev) => ({
        ...prev,
        results: prev.results.map((r) => (r._id === feedbackId ? updated : r)),
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Assign failed');
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
      setError(err.response?.data?.message || err.message || 'Status update failed');
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
      setError(err.response?.data?.message || err.message || 'Resolve failed');
    } finally {
      setUpdating((prev) => ({ ...prev, [resolveModal]: false }));
    }
  };

  const handleCall = async (item) => {
    const phone = item.customer?.phone;
    if (!phone || activeCall) return;
    setActiveCall({ itemId: item._id, status: 'calling', callSid: null });
    setError('');
    try {
      const result = await callCustomerWithDefault({
        toNumber: phone,
        dynamicVariables: {
          customer_name: item.senderName || item.customer?.name || 'Customer',
          customer_email: item.senderEmail || '',
          issue_type: formatCategory(item.issueCategory),
          priority: item.priorityLevel,
          issue_summary: (item.emailSubject || item.text?.slice(0, 200) || ''),
        },
      });
      setActiveCall({ itemId: item._id, status: 'ongoing', callSid: result.callSid || null });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Call failed');
      setActiveCall(null);
    }
  };

  const handleEndCall = async (e) => {
    e.stopPropagation();
    if (activeCall?.callSid) {
      try { await endVoiceCall(activeCall.callSid); } catch { /* ignore */ }
    }
    setActiveCall(null);
  };

  const activeFilterCount = [level, category, statusFilter, assigneeFilter].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2.5 text-gray-100">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              Priority Queue
            </h2>
            <p className="text-sm text-gray-500 mt-1.5 ml-[46px]">
              Feedback items requiring immediate attention, sorted by urgency.
            </p>
          </div>
        </div>

        {/* Search + Filter toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by email or subject..."
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg pl-9 pr-8 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchInput && (
              <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filters panel */}
        {showFilters && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority Level</label>
                <select
                  value={level}
                  onChange={(e) => changeLevel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Assignee</label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Assignees</option>
                  <option value={user?.id || ''}>My Tickets</option>
                  <option value="unassigned">Unassigned</option>
                  {isAdmin && users.filter((u) => u._id !== user?.id).map((u) => (
                    <option key={u._id} value={u._id}>{u.displayName || u.username}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category chips */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Issue Type</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setCategory(''); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    !category
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-gray-800/80 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isActive
                          ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                          : count > 0
                            ? 'bg-gray-800/80 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                            : 'bg-gray-900/30 border-gray-800/50 text-gray-600 cursor-default'
                      }`}
                      disabled={count === 0 && !isActive}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                      {count > 0 && (
                        <span className={`ml-0.5 text-[10px] tabular-nums ${isActive ? 'text-indigo-400' : 'text-gray-500'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setLevel(''); setCategory(''); setStatusFilter(''); setAssigneeFilter(''); setPage(1); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary cards — 5 cards in a single line */}
      {data?.summary && (
        <div className="overflow-x-auto">
          <div className="grid gap-3 w-full min-w-0" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            {Object.entries(data.summary).map(([lvl, info]) => {
              const style = SUMMARY_STYLE[lvl] || SUMMARY_STYLE.low;
              return (
                <button
                  key={lvl}
                  onClick={() => { setLevel(level === lvl ? '' : lvl); setPage(1); }}
                  className={`relative text-left rounded-xl border p-4 transition-all hover:scale-[1.02] min-w-0 ${
                    level === lvl
                      ? `${style.bg} ${style.border} ring-1 ring-${lvl === 'critical' ? 'red' : lvl === 'high' ? 'orange' : lvl === 'medium' ? 'amber' : 'emerald'}-500/20`
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>{lvl}</span>
                    <span className="text-lg">{style.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-100 tabular-nums">{info.count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg score: {info.avgScore}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Queue items */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading queue...</p>
        </div>
      ) : !data?.results?.length ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">
            {category ? `No "${formatCategory(category)}" issues found` : 'No urgent feedback found'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {category ? 'Try selecting a different issue type.' : 'All caught up! Check back later.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.results.map((item) => {
            const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
            const StIcon = st.icon;
            const assignedUser = item.assignedTo;
            const isUpdating = updating[item._id];
            const isExpanded = expanded === item._id;
            const borderColor = PRIORITY_BORDER[item.priorityLevel] || 'border-l-gray-600';

            return (
              <div
                key={item._id}
                className={`rounded-xl border-l-[3px] border border-gray-800 overflow-hidden transition-all ${borderColor} ${
                  item.status === 'resolved' ? 'opacity-50' : ''
                } ${isExpanded ? 'bg-gray-900' : 'bg-gray-900/70 hover:bg-gray-900'}`}
              >
                {/* Collapsed row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : item._id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
                >
                  {/* Priority + Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <PriorityBadge level={item.priorityLevel} score={item.priorityScore} />
                      {item.issueCategory && item.issueCategory !== 'other' && (
                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md text-[11px] font-medium">
                          {formatCategory(item.issueCategory)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-200 truncate mt-1.5">
                      {item.emailSubject || item.text?.slice(0, 80)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.senderEmail || 'API submission'}
                      <span className="mx-1.5 text-gray-700">&middot;</span>
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>

                  {/* Right side: Status + Assignee */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${st.bg} ${st.color}`}>
                        <StIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {assignedUser
                          ? <span className="text-indigo-400">{assignedUser.displayName || assignedUser.username}</span>
                          : 'Unassigned'}
                      </span>
                    </div>
                    {item.customer?.phone && (
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center" title="Has phone number">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    )}
                    <div className="w-5 flex items-center justify-center">
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-500" />
                        : <ChevronDown className="w-4 h-4 text-gray-600" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="border-t border-gray-800" />

                    {/* Feedback text */}
                    <div className="bg-gray-800/40 rounded-lg p-4">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{item.text}</p>
                    </div>

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MetaItem label="Sentiment" value={<SentimentBadge sentiment={item.sentiment} score={item.score} />} />
                      <MetaItem label="Source" value={item.source} />
                      <MetaItem label="Urgency" value={item.urgency} />
                      {item.senderName && <MetaItem label="Sender" value={item.senderName} />}
                    </div>

                    {/* Urgency keywords */}
                    {item.urgencyKeywords?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Urgency Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.urgencyKeywords.map((kw) => (
                            <span key={kw} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md text-xs">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phone + Call action */}
                    {item.customer?.phone && (() => {
                      const isThisCall = activeCall?.itemId === item._id;
                      const callBusy = !!activeCall;
                      return (
                        <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-gray-300">{item.customer.phone}</span>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCall(item); }}
                              disabled={callBusy}
                              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50 ${
                                isThisCall && activeCall.status === 'ongoing'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isThisCall && activeCall.status === 'calling'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
                              }`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {isThisCall && activeCall.status === 'calling'
                                ? 'Connecting...'
                                : isThisCall && activeCall.status === 'ongoing'
                                  ? 'Call Ongoing'
                                  : callBusy
                                    ? 'Call Busy'
                                    : 'Call via Voice Bot'}
                            </button>
                            {isThisCall && activeCall.status === 'ongoing' && (
                              <button
                                onClick={handleEndCall}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-all"
                              >
                                <X className="w-3 h-3" /> End
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Resolution note */}
                    {item.resolutionNote && (
                      <div className="bg-emerald-500/5 border border-emerald-800/40 rounded-lg p-4">
                        <p className="text-xs font-semibold text-emerald-400 mb-1.5">Resolution Note</p>
                        <p className="text-sm text-gray-300">{item.resolutionNote}</p>
                        {item.resolvedAt && (
                          <p className="text-xs text-gray-500 mt-2">Resolved {new Date(item.resolvedAt).toLocaleString()}</p>
                        )}
                      </div>
                    )}

                    {/* Action bar */}
                    {item.status !== 'resolved' && (
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-800/60">
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-3.5 h-3.5 text-gray-500" />
                            <select
                              value={assignedUser?._id || ''}
                              onChange={(e) => { e.stopPropagation(); handleAssign(item._id, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={isUpdating}
                              className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                            >
                              <option value="">Unassigned</option>
                              {users.map((u) => (
                                <option key={u._id} value={u._id}>{u.displayName || u.username}</option>
                              ))}
                            </select>
                          </div>
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
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50 transition-all"
                              >
                                Start Working
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(item._id, 'resolved'); }}
                              disabled={isUpdating}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
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
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500 tabular-nums">
            Page {data.pagination.page} of {data.pagination.pages}
            <span className="text-gray-600 ml-1">({data.pagination.total} items)</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              disabled={page >= data.pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Resolve Feedback</h3>
                <p className="text-sm text-gray-500">Add a note about how this was resolved.</p>
              </div>
            </div>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="e.g. Refund issued, customer contacted..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setResolveModal(null); setResolveNote(''); }}
                className="px-4 py-2.5 text-sm rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={updating[resolveModal]}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-all"
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

function MetaItem({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="text-sm text-gray-300">{value}</div>
    </div>
  );
}
