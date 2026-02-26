import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Download } from 'lucide-react';
import clsx from 'clsx';
import { fetchChats, fetchChatById, generateChatSummary } from '../lib/api';

const TABS = ['Details', 'Analysis', 'Stats', 'Variables'];

function formatTimestamp(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CallLog() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [chatDetail, setChatDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Details');
  const [feedback, setFeedback] = useState('');
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const autoSummaryRequestedRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchChats({ limit: 50 });
        if (!cancelled && Array.isArray(list)) setChats(list);
        if (!cancelled && list.length > 0 && !selectedId) setSelectedId(list[0].id);
      } catch (e) {
        if (!cancelled) setChats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setChatDetail(null);
      setDetailLoading(false);
      if (audioRef.current) {
        audioRef.current.src = '';
        setPlaying(false);
        setProgress(0);
        setDuration(0);
        setCurrentTime(0);
      }
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setChatDetail(null);
    (async () => {
      try {
        const data = await fetchChatById(selectedId);
        if (cancelled) return;
        setChatDetail(data);
        if (data.recordingPlaybackUrl && audioRef.current) {
          audioRef.current.src = data.recordingPlaybackUrl;
          setProgress(0);
          setCurrentTime(0);
          setPlaying(false);
        } else if (audioRef.current) {
          audioRef.current.src = '';
        }
      } catch {
        if (!cancelled) setChatDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  // Auto-generate summary when viewing a chat that has transcript but no summary
  useEffect(() => {
    if (!chatDetail?.id || detailLoading) return;
    const hasTranscript = chatDetail.transcript && Array.isArray(chatDetail.transcript) && chatDetail.transcript.length > 0;
    const hasSummary = chatDetail.callSummary && String(chatDetail.callSummary).trim();
    if (!hasTranscript || hasSummary || autoSummaryRequestedRef.current.has(chatDetail.id)) return;
    autoSummaryRequestedRef.current.add(chatDetail.id);
    setSummaryGenerating(true);
    generateChatSummary(chatDetail.id)
      .then((r) => {
        if (r.ok && r.callSummary) {
          setChatDetail((prev) => (prev ? { ...prev, callSummary: r.callSummary } : null));
        }
      })
      .catch(() => {})
      .finally(() => setSummaryGenerating(false));
  }, [chatDetail?.id, chatDetail?.transcript, chatDetail?.callSummary, detailLoading]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime);
      setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    };
    const onLoadedMetadata = () => setDuration(el.duration);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('ended', onEnded);
    };
  }, [chatDetail?.id]);

  const handlePlayPause = () => {
    const el = audioRef.current;
    if (!el || !el.src) return;
    if (playing) el.pause();
    else el.play();
    setPlaying(!playing);
  };

  const handleSeek = (e) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    el.currentTime = pct * el.duration;
    setProgress(pct * 100);
    setCurrentTime(el.currentTime);
  };

  const handleGenerateSummary = async () => {
    if (!selectedId || summaryGenerating) return;
    setSummaryGenerating(true);
    try {
      const { ok, callSummary } = await generateChatSummary(selectedId);
      if (ok && callSummary) {
        setChatDetail((prev) => (prev ? { ...prev, callSummary } : null));
      }
    } finally {
      setSummaryGenerating(false);
    }
  };

  const selectedChat = chats.find((c) => c.id === selectedId);
  const hasTranscript = Boolean(chatDetail?.transcript && Array.isArray(chatDetail.transcript) && chatDetail.transcript.length > 0);
  const hasSummary = Boolean(chatDetail?.callSummary && String(chatDetail.callSummary).trim());
  const hasRecording = Boolean(chatDetail?.recordingPlaybackUrl);
  const details = chatDetail
    ? {
        agent: chatDetail.agentId,
        beginTimestamp: formatTimestamp(chatDetail.startedAt),
        duration: formatDuration(chatDetail.durationSeconds),
        provider: chatDetail.channel || 'web',
        endReason: chatDetail.endReason || '—',
      }
    : null;

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">Call Log</h1>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_2fr_1fr] gap-4">
        {/* Left: Call list */}
        <div className="flex flex-col min-h-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Interactions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : chats.length === 0 ? (
              <p className="text-sm text-gray-500 p-3">No chats yet.</p>
            ) : (
              chats.map((call) => (
                <button
                  key={call.id}
                  type="button"
                  onClick={() => setSelectedId(call.id)}
                  className={clsx(
                    'w-full text-left p-3 rounded-lg transition-colors',
                    selectedId === call.id
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono text-gray-500 truncate flex-1">{call.id}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 shrink-0">
                      {call.status || 'unknown'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{formatTimestamp(call.startedAt)}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{call.agentId}</div>
                  <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                    {call.channel || 'Web'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Center: Audio + Summary */}
        <div className="flex flex-col min-h-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-800/30">
            <audio ref={audioRef} preload="metadata" />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlayPause}
                disabled={!hasRecording}
                className={clsx(
                  'p-2.5 rounded-full transition-colors',
                  hasRecording
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                )}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0" onClick={handleSeek}>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
              <button type="button" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Volume">
                <Volume2 className="w-5 h-5" />
              </button>
              {hasRecording && (
                <a
                  href={chatDetail?.recordingPlaybackUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
              )}
            </div>
            {selectedId && !detailLoading && !hasRecording && (
              <p className="text-xs text-gray-500 mt-2">No recording for this chat.</p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Call summary</h3>
                {hasSummary ? (
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{chatDetail.callSummary}</p>
                ) : hasTranscript ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">No call summary for this call.</p>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={summaryGenerating}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {summaryGenerating ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating…
                        </>
                      ) : (
                        'Generate summary'
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No call summary for this call.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Details + Feedback */}
        <div className="flex flex-col min-h-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-800">
            <p className="text-xs font-mono text-gray-500 break-all">{selectedChat?.id ?? '—'}</p>
          </div>
          <div className="flex border-b border-gray-800">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'flex-1 px-3 py-2.5 text-xs font-medium transition-colors',
                  activeTab === tab
                    ? 'text-indigo-400 border-b-2 border-indigo-500 bg-gray-800/50'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'Details' && details && (
              <dl className="space-y-3">
                {Object.entries(details).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500">{key}</dt>
                    <dd className="text-sm text-gray-200 mt-0.5 font-mono break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {activeTab !== 'Details' && (
              <p className="text-sm text-gray-500">Content for {activeTab} will appear here.</p>
            )}
          </div>
          <div className="p-4 border-t border-gray-800 space-y-2">
            <label className="block text-xs font-medium text-gray-400">Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback to your agent here..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button
              type="button"
              className="w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
