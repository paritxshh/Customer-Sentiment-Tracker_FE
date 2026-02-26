import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useConversation } from "@elevenlabs/react";
import {
  ArrowLeft, Plus, Pencil, Save, Volume2, Mic, Send, Phone, X,
  Settings, PhoneOff, Bot,
} from "lucide-react";
import {
  fetchVoiceAgents, fetchVoiceAgent, updateVoiceAgent,
  voiceAgentChat, syncVoiceAgent, unlinkVoiceAgent,
  getVoiceAgentSignedUrl, startVoiceAgentPhoneCall,
  setDefaultVoiceAgent, getDefaultVoiceAgent,
} from "../lib/api";
import clsx from "clsx";

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

/** Default ElevenLabs client_events (must match backend). Used when customizing conversation flow. */
const DEFAULT_CLIENT_EVENTS = [
  "conversation_initiation_metadata",
  "asr_initiation_metadata",
  "ping",
  "audio",
  "interruption",
  "user_transcript",
  "tentative_user_transcript",
  "agent_response",
  "agent_response_correction",
  "agent_response_metadata",
  "agent_chat_response_part",
  "client_error",
];

const CLIENT_EVENT_LABELS = {
  interruption: "Allow user to interrupt agent",
  user_transcript: "User transcript",
  agent_response: "Agent response",
  audio: "Audio",
  ping: "Ping",
  tentative_user_transcript: "Tentative user transcript",
  agent_response_correction: "Agent response correction",
  agent_response_metadata: "Agent response metadata",
  agent_chat_response_part: "Agent chat response (streaming)",
  client_error: "Client error",
  conversation_initiation_metadata: "Conversation initiation metadata",
  asr_initiation_metadata: "ASR initiation metadata",
};

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const selectCls = `${inputCls} appearance-none`;
const btnSecondary =
  "px-3 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50";

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ─── Agent List ─────────────────────────────────────────────── */

function AgentList() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState("");
  const [defaultAgentId, setDefaultAgentId] = useState(null);
  const [settingDefault, setSettingDefault] = useState(null);

  useEffect(() => {
    Promise.all([fetchVoiceAgents(), getDefaultVoiceAgent()])
      .then(([agentList, defaultData]) => {
        setAgents(agentList);
        setDefaultAgentId(defaultData.agent?.agentId || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSetDefault = async (e, agentId) => {
    e.preventDefault();
    e.stopPropagation();
    setSettingDefault(agentId);
    try {
      await setDefaultVoiceAgent(agentId);
      setDefaultAgentId(agentId);
    } catch { /* ignore */ }
    setSettingDefault(null);
  };

  const handleCreate = () => {
    const id = newId.trim().replace(/\s+/g, "_").toLowerCase();
    if (!id) return;
    navigate(`/voice-bot/${encodeURIComponent(id)}`);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Voice Agents</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure and test AI voice agents powered by ElevenLabs
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs text-gray-500 mb-1.5">New agent ID</label>
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. support_agent"
            className={inputCls}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!newId.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Create Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No voice agents yet. Create one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <Link
              key={a.agentId}
              to={`/voice-bot/${encodeURIComponent(a.agentId)}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors">
                    {a.name || a.agentId}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{a.agentId}</p>
                </div>
                <Pencil className="w-4 h-4 text-gray-600 group-hover:text-indigo-400" />
              </div>
              <p className="text-sm text-gray-400 mt-3 line-clamp-2">
                {a.objective || "No objective set"}
              </p>
              <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                <span>{a.model}</span>
                {a.elevenlabsAgentId && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    EL Synced
                  </span>
                )}
                {defaultAgentId === a.agentId ? (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-medium">
                    Default Caller
                  </span>
                ) : (
                  <button
                    onClick={(e) => handleSetDefault(e, a.agentId)}
                    disabled={settingDefault === a.agentId}
                    className="px-1.5 py-0.5 rounded border border-gray-700 text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors disabled:opacity-50"
                  >
                    {settingDefault === a.agentId ? 'Setting...' : 'Set as Default'}
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Agent Editor ───────────────────────────────────────────── */

function AgentEditor({ agentId }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("config");
  const [activeSection, setActiveSection] = useState("think");

  const [name, setName] = useState("");
  const [provider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [firstMessage, setFirstMessage] = useState("");
  const [objective, setObjective] = useState("");
  const [prompt, setPrompt] = useState("");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState("");
  const [callEndPrompt, setCallEndPrompt] = useState("");
  const [callEndMessageType, setCallEndMessageType] = useState("dynamic");
  const [callEndMessage, setCallEndMessage] = useState("");
  const [uninterruptibleReasons, setUninterruptibleReasons] = useState([]);
  const [uninterruptibleInput, setUninterruptibleInput] = useState("");
  const [clientEvents, setClientEvents] = useState([]);
  const [showAdvancedEvents, setShowAdvancedEvents] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1);

  const [saveStatus, setSaveStatus] = useState("idle");
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncError, setSyncError] = useState(null);
  const [elDashUrl, setElDashUrl] = useState(null);

  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [contextVars, setContextVars] = useState("");
  const [phoneCallStatus, setPhoneCallStatus] = useState("idle");
  const [phoneCallError, setPhoneCallError] = useState(null);

  const [chatHistory, setChatHistory] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const chatScrollRef = useRef(null);
  const promptRef = useRef(null);

  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  const {
    startSession,
    endSession,
    status: elStatus,
    isSpeaking,
  } = useConversation({
    onMessage: (props) => {
      setChatHistory((h) => [
        ...h,
        { role: props.role === "agent" ? "assistant" : "user", content: props.message },
      ]);
    },
    onError: (msg) => {
      setChatError(msg || "Voice connection error");
      setVoiceConnecting(false);
    },
    onDisconnect: () => {
      setVoiceStatus("idle");
      setVoiceConnecting(false);
    },
  });

  useEffect(() => {
    if (elStatus !== "connected") return;
    setVoiceStatus(isSpeaking ? "speaking" : "listening");
  }, [elStatus, isSpeaking]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchVoiceAgent(agentId), getDefaultVoiceAgent()])
      .then(([data, defaultData]) => {
        if (cancelled) return;
        setName(data.name ?? "");
        setModel(data.model ?? "gpt-4o-mini");
        setTemperature(data.temperature ?? 0.7);
        setFirstMessage(data.firstMessage ?? "");
        setObjective(data.objective ?? "");
        setPrompt(data.prompt ?? "");
        setElevenlabsVoiceId(data.elevenlabsVoiceId ?? "");
        setCallEndPrompt(data.callEndPrompt ?? "");
        setCallEndMessageType(data.callEndMessageType ?? "dynamic");
        setCallEndMessage(data.callEndMessage ?? "");
        setUninterruptibleReasons(data.uninterruptibleReasons ?? []);
        setClientEvents(Array.isArray(data.clientEvents) ? data.clientEvents : []);
        setTtsSpeed(typeof data.ttsSpeed === "number" ? Math.min(1.2, Math.max(0.5, data.ttsSpeed)) : 1);
        if (data.elevenlabsAgentId) {
          setElDashUrl(`https://elevenlabs.io/app/conversational-ai/${data.elevenlabsAgentId}`);
        }
        setIsDefault(defaultData.agent?.agentId === agentId);
        setLoading(false);
      }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [agentId]);

  useEffect(() => {
    if (activeSection !== "think") return;
    const el = promptRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 200)}px`;
  }, [prompt, activeSection]);

  const getPayload = useCallback(() => ({
    name, provider, model, temperature, firstMessage,
    objective, prompt, elevenlabsVoiceId: elevenlabsVoiceId.trim() || undefined,
    callEndPrompt, callEndMessageType,
    callEndMessage: callEndMessage.trim() || undefined,
    uninterruptibleReasons: uninterruptibleReasons.length > 0 ? uninterruptibleReasons : undefined,
    clientEvents: clientEvents.length > 0 ? clientEvents : undefined,
    ttsSpeed,
  }), [name, provider, model, temperature, firstMessage, objective, prompt,
    elevenlabsVoiceId, callEndPrompt, callEndMessageType, callEndMessage, uninterruptibleReasons, clientEvents, ttsSpeed]);

  const interruptionsEnabled = clientEvents.length === 0 || clientEvents.includes("interruption");
  const setInterruptionsEnabled = (on) => {
    if (on) {
      if (clientEvents.length === 0) return; // already default (with interruption)
      if (clientEvents.includes("interruption")) return;
      setClientEvents([...clientEvents, "interruption"].sort());
    } else {
      const base = clientEvents.length > 0 ? clientEvents : DEFAULT_CLIENT_EVENTS;
      setClientEvents(base.filter((e) => e !== "interruption"));
    }
  };
  const toggleClientEvent = (event) => {
    const base = clientEvents.length > 0 ? [...clientEvents] : [...DEFAULT_CLIENT_EVENTS];
    if (base.includes(event)) {
      setClientEvents(base.filter((e) => e !== event));
    } else {
      setClientEvents([...base, event].sort());
    }
  };
  const isEventChecked = (event) => {
    const list = clientEvents.length > 0 ? clientEvents : DEFAULT_CLIENT_EVENTS;
    return list.includes(event);
  };

  const handleSetDefault = async () => {
    setSettingDefault(true);
    try {
      await setDefaultVoiceAgent(agentId);
      setIsDefault(true);
    } catch { /* ignore */ }
    setSettingDefault(false);
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await updateVoiceAgent(agentId, getPayload());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("error");
      setChatError(e.response?.data?.error || e.message);
    }
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const data = await syncVoiceAgent(agentId);
      setSyncStatus("success");
      if (data.agentId) {
        setElDashUrl(`https://elevenlabs.io/app/conversational-ai/${data.agentId}`);
      }
      setTimeout(() => setSyncStatus("idle"), 4000);
    } catch (e) {
      setSyncStatus("error");
      const msg = e.response?.data?.error || e.message;
      setSyncError(msg);
    }
  };

  const handleUnlink = async () => {
    try {
      await unlinkVoiceAgent(agentId);
      setElDashUrl(null);
      setSyncStatus("idle");
    } catch (e) {
      setSyncError(e.response?.data?.error || e.message);
    }
  };

  const parseCtxVars = () => {
    if (!contextVars.trim()) return undefined;
    try {
      const parsed = JSON.parse(contextVars);
      if (typeof parsed === "object" && parsed !== null) {
        const out = {};
        for (const [k, v] of Object.entries(parsed)) {
          out[k] = String(v);
        }
        return out;
      }
    } catch { /* ignore */ }
    return undefined;
  };

  const handlePhoneCall = async () => {
    if (!phoneNumber.trim() || phoneCallStatus === "calling") return;
    setPhoneCallStatus("calling");
    setPhoneCallError(null);
    try {
      await startVoiceAgentPhoneCall(agentId, {
        toNumber: phoneNumber.trim(),
        dynamicVariables: parseCtxVars(),
      });
      setPhoneCallStatus("success");
      setTimeout(() => setPhoneCallStatus("idle"), 3000);
    } catch (e) {
      setPhoneCallStatus("error");
      setPhoneCallError(e.response?.data?.error || e.message);
    }
  };

  const handleSendChat = async () => {
    const msg = chatMsg.trim();
    if (!msg || chatLoading) return;
    setChatMsg("");
    setChatError(null);
    setChatLoading(true);
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    try {
      await updateVoiceAgent(agentId, getPayload());
      const data = await voiceAgentChat(agentId, {
        message: msg,
        history: newHistory.slice(0, -1),
        context_variables: parseCtxVars(),
      });
      setChatHistory((h) => [...h, { role: "assistant", content: data.response }]);
    } catch (e) {
      setChatError(e.response?.data?.error || e.message);
      setChatHistory(newHistory.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const handleVoiceToggle = useCallback(async () => {
    if (elStatus === "connected") {
      await endSession();
      return;
    }
    setChatError(null);
    setVoiceConnecting(true);
    try {
      const data = await getVoiceAgentSignedUrl(agentId);
      const dynamicVariables = parseCtxVars();
      await startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        ...(dynamicVariables && Object.keys(dynamicVariables).length > 0 ? { dynamicVariables } : {}),
      });
      setVoiceStatus("listening");
    } catch (e) {
      setChatError(e.response?.data?.error || e.message || "Voice connection failed");
    } finally {
      setVoiceConnecting(false);
    }
  }, [agentId, elStatus, endSession, startSession, contextVars]);

  const ctxJsonError = contextVars.trim() === "" ? null : (() => {
    try {
      const p = JSON.parse(contextVars);
      return typeof p === "object" && p !== null ? null : "Must be a JSON object";
    } catch { return "Invalid JSON"; }
  })();

  if (loading) return <Spinner />;

  const SECTIONS = [
    { id: "think", label: "LLM & Prompt", icon: Settings },
    { id: "conversation-flow", label: "Conversation Flow", icon: Mic },
    { id: "speech-settings", label: "Speech Settings", icon: Volume2 },
    { id: "call-end", label: "Call End", icon: PhoneOff },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] -m-6">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 shrink-0">
        {/* Row 1: Navigation */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/voice-bot")} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold truncate">{name || agentId}</h1>
            <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded shrink-0 hidden sm:inline">{agentId}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {["config", "test"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={clsx(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  activeTab === t
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                    : "border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {/* Row 2: Actions */}
        <div className="flex items-center gap-2 px-6 pb-3 overflow-x-auto">
          <button onClick={handleSave} disabled={saveStatus === "saving"} className={`${btnSecondary} shrink-0`}>
            <span className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
            </span>
          </button>
          <button onClick={handleSync} disabled={syncStatus === "syncing"} className={`${btnSecondary} shrink-0`}>
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              {syncStatus === "syncing" ? "Syncing..." : syncStatus === "success" ? "Synced" : "Sync to EL"}
            </span>
          </button>
          {syncError && <span className="text-xs text-red-400 max-w-[180px] truncate shrink-0" title={syncError}>{syncError}</span>}
          {elDashUrl && (
            <>
              <a href={elDashUrl} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} shrink-0`}>Open in EL</a>
              <button onClick={handleUnlink} className="text-xs text-gray-500 hover:text-amber-400 transition-colors shrink-0">Unlink</button>
            </>
          )}
          <div className="ml-auto shrink-0">
            {isDefault ? (
              <span className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-medium">
                <Phone className="w-3.5 h-3.5" /> Default Caller
              </span>
            ) : (
              <button onClick={handleSetDefault} disabled={settingDefault} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-700 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors disabled:opacity-50">
                <Phone className="w-3.5 h-3.5" />
                {settingDefault ? 'Setting...' : 'Set as Default Caller'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Config tab */}
        {activeTab === "config" && (
          <>
            <aside className="w-48 shrink-0 border-r border-gray-800 bg-gray-900/50 py-3">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={clsx(
                    "flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors",
                    activeSection === id
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </aside>
            <main className="flex-1 overflow-auto p-6 space-y-8">
              {activeSection === "conversation-flow" && (
                <>
                  <section className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-200">Client events (ElevenLabs)</h2>
                    <p className="text-xs text-gray-500">
                      Control which events the ElevenLabs agent sends and whether the user can interrupt the agent while it is speaking. Changes apply after you Save and Sync to ElevenLabs.
                    </p>
                    <div className="flex flex-col gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={interruptionsEnabled}
                          onChange={(e) => setInterruptionsEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-200">
                          {CLIENT_EVENT_LABELS.interruption}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 pl-7">
                        When enabled, users can interrupt the agent mid-sentence. Disable for legal disclaimers or when full delivery is required.
                      </p>
                    </div>
                    <div className="border-t border-gray-800 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedEvents((v) => !v)}
                        className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                      >
                        {showAdvancedEvents ? "Hide" : "Show"} other client events
                      </button>
                      {showAdvancedEvents && (
                        <div className="mt-3 flex flex-col gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700 max-h-64 overflow-auto">
                          {DEFAULT_CLIENT_EVENTS.filter((e) => e !== "interruption").map((event) => (
                            <label key={event} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isEventChecked(event)}
                                onChange={() => toggleClientEvent(event)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-300">
                                {CLIENT_EVENT_LABELS[event] ?? event}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
              {activeSection === "speech-settings" && (
                <>
                  <section className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-200">Speech speed</h2>
                    <p className="text-xs text-gray-500">
                      Control how fast the agent speaks. Changes apply after you Save and Sync to ElevenLabs.
                    </p>
                    <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 max-w-md">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500 shrink-0 w-8">Slower</span>
                        <input
                          type="range"
                          min={0.5}
                          max={1.2}
                          step={0.1}
                          value={ttsSpeed}
                          onChange={(e) => setTtsSpeed(Number(e.target.value))}
                          className="flex-1 h-2 rounded-lg appearance-none bg-gray-700 accent-indigo-500"
                        />
                        <span className="text-xs text-gray-500 shrink-0 w-8">Faster</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-300">
                        Speed: <span className="font-mono text-indigo-400">{ttsSpeed.toFixed(1)}×</span>
                        {ttsSpeed === 1 && <span className="text-gray-500 ml-1">(default)</span>}
                      </p>
                    </div>
                  </section>
                </>
              )}
              {activeSection === "think" && (
                <>
                  <section className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-200">Agent Identity</h2>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Display Name</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Agent" className={inputCls} />
                    </div>
                  </section>
                  <section className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-200">LLM Configuration</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Provider</label>
                        <input value="openai" disabled className={`${inputCls} opacity-60`} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Model</label>
                        <select value={model} onChange={(e) => setModel(e.target.value)} className={selectCls}>
                          {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Temperature</label>
                        <input type="number" min={0} max={2} step={0.01} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className={inputCls} />
                      </div>
                    </div>
                  </section>
                  <section className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-200">Introduction</h2>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">First Message</label>
                      <textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} rows={3} placeholder="What the agent says first..." className={`${inputCls} resize-y`} />
                    </div>
                  </section>
                  <section className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-200">Agent Guidelines</h2>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Objective</label>
                      <textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} placeholder="What is the agent trying to accomplish?" className={`${inputCls} resize-y`} />
                    </div>
                  </section>
                  <section className="space-y-4">
                    <label className="block text-sm font-medium text-gray-200">Prompt</label>
                    <textarea
                      ref={promptRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={12}
                      placeholder="### Role:&#10;..."
                      className={`${inputCls} font-mono min-h-[200px] resize-y`}
                    />
                  </section>
                  <section className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-200">ElevenLabs Voice</h2>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Voice ID</label>
                      <input
                        value={elevenlabsVoiceId}
                        onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                        placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                        className={`${inputCls} font-mono`}
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Pick a voice from{" "}
                        <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Voice Library</a>,
                        copy its ID, and paste here. Leave empty for default. Then Save Draft and Sync to ElevenLabs.
                      </p>
                    </div>
                  </section>
                </>
              )}
              {activeSection === "call-end" && (
                <>
                  <section className="space-y-3">
                    <h2 className="text-sm font-medium text-gray-200">End Call Prompt</h2>
                    <p className="text-xs text-gray-500">When should the agent end the call? Leave empty to use the default. The agent will always ask if the ticket can be marked resolved and, if not, will inform about reassignment and 24–48h contact before ending.</p>
                    <textarea value={callEndPrompt} onChange={(e) => setCallEndPrompt(e.target.value)} rows={5} className={`${inputCls} resize-y`} placeholder="e.g. Use the closing flow when the task is complete, the user asks to end, or when the user is unresponsive." />
                    <p className="text-xs text-gray-500">Save and then Sync to EL for changes to take effect on live calls.</p>
                  </section>
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-medium text-gray-200">Closing Message</h2>
                      <select value={callEndMessageType} onChange={(e) => setCallEndMessageType(e.target.value)} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="dynamic">dynamic</option>
                        <option value="static">static</option>
                      </select>
                    </div>
                    <input value={callEndMessage} onChange={(e) => setCallEndMessage(e.target.value)} placeholder="e.g. Thank you for your time!" className={inputCls} />
                  </section>
                  <section className="space-y-3">
                    <h2 className="text-sm font-medium text-gray-200">Uninterruptible Reasons</h2>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700 min-h-[44px]">
                      {uninterruptibleReasons.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-700 text-sm text-gray-200">
                          {r}
                          <button onClick={() => setUninterruptibleReasons((prev) => prev.filter((x) => x !== r))} className="p-0.5 rounded hover:bg-gray-600">
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={uninterruptibleInput}
                        onChange={(e) => setUninterruptibleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const v = uninterruptibleInput.trim().toLowerCase();
                            if (v && !uninterruptibleReasons.includes(v)) {
                              setUninterruptibleReasons((prev) => [...prev, v]);
                              setUninterruptibleInput("");
                            }
                          }
                        }}
                        className="flex-1 min-w-[120px] px-2 py-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-500 focus:outline-none"
                        placeholder="Add reason..."
                      />
                    </div>
                  </section>
                </>
              )}
            </main>
          </>
        )}

        {/* Test tab */}
        {activeTab === "test" && (
          <div className="flex flex-1 min-h-0 overflow-hidden w-full">
            {/* Left panel: phone + context */}
            <aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-900/50 flex flex-col p-4 gap-4 overflow-auto">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Phone Number</label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91..."
                  className={inputCls}
                />
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <label className="block text-xs text-gray-500 mb-1.5">Context Variables (JSON)</label>
                <textarea
                  value={contextVars}
                  onChange={(e) => setContextVars(e.target.value)}
                  placeholder='{"customer_name": "John", "order_id": "123"}'
                  rows={6}
                  className={clsx(
                    `${inputCls} font-mono resize-y`,
                    ctxJsonError && "border-red-500/70! ring-red-500/50!"
                  )}
                />
                {ctxJsonError ? (
                  <p className="mt-1.5 text-xs text-red-400">{ctxJsonError}</p>
                ) : contextVars.trim() && (
                  <p className="mt-1.5 text-xs text-emerald-400">Valid JSON</p>
                )}
                <p className="mt-1.5 text-xs text-gray-500">
                  Replaces {"${placeholder}"} in the agent's prompt and first message.
                </p>
              </div>
              <button
                onClick={handlePhoneCall}
                disabled={!phoneNumber.trim() || phoneCallStatus === "calling"}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Phone className="w-4 h-4" />
                {phoneCallStatus === "calling" ? "Calling..." : phoneCallStatus === "success" ? "Call Started" : "Start Phone Call"}
              </button>
              {phoneCallError && <p className="text-xs text-red-400">{phoneCallError}</p>}
            </aside>

            {/* Center: voice mic */}
            <div className="flex-1 flex flex-col items-center justify-center min-w-0 bg-gray-950">
              <button
                onClick={handleVoiceToggle}
                disabled={voiceConnecting}
                className={clsx(
                  "w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all",
                  elStatus === "connected"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                    : "bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20",
                  "disabled:opacity-70"
                )}
              >
                <Mic className="w-12 h-12 text-white" />
              </button>
              <span className="text-sm text-gray-500 text-center mt-4">
                {voiceConnecting && "Connecting..."}
                {!voiceConnecting && elStatus !== "connected" && "Click to start voice test (ElevenLabs)"}
                {!voiceConnecting && elStatus === "connected" && !isSpeaking && "Listening... say something"}
                {!voiceConnecting && elStatus === "connected" && isSpeaking && "Agent speaking..."}
              </span>
              {chatError && (
                <p className="text-xs text-red-400 mt-3 max-w-sm text-center">{chatError}</p>
              )}
            </div>

            {/* Right panel: text chat */}
            <aside className="w-[380px] shrink-0 border-l border-gray-800 bg-gray-900/50 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="text-sm font-medium text-gray-300">Text Chat</h3>
              </div>
              <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
                {chatHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-12">Chat with your agent here.</p>
                ) : (
                  chatHistory.map((m, i) => (
                    <div
                      key={i}
                      className={clsx(
                        "rounded-lg px-3 py-2 text-sm",
                        m.role === "user"
                          ? "bg-indigo-500/20 text-gray-100 ml-auto max-w-[85%]"
                          : "bg-gray-800 text-gray-300 max-w-[85%]"
                      )}
                    >
                      {m.content}
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700">
                  <input
                    value={chatMsg}
                    onChange={(e) => setChatMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={chatLoading}
                    className="flex-1 min-w-0 bg-transparent text-gray-100 text-sm focus:outline-none placeholder:text-gray-500"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatMsg.trim() || chatLoading}
                    className="p-1.5 rounded text-gray-400 hover:text-indigo-400 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Router ────────────────────────────────────────────── */

export default function VoiceBot() {
  const { id } = useParams();
  return id ? <AgentEditor agentId={decodeURIComponent(id)} /> : <AgentList />;
}
