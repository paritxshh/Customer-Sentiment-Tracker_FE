import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('sentinel_auth');
    if (raw) {
      const { token } = JSON.parse(raw);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const fetchStats = () => api.get('/stats').then(r => r.data.data);
export const fetchFeedback = (params) => api.get('/sentiment', { params }).then(r => r.data.data);
export const fetchPriorityQueue = (params) => api.get('/sentiment/priority', { params }).then(r => r.data.data);
export const fetchFeedbackById = (id) => api.get(`/sentiment/${id}`).then(r => r.data.data);
export const fetchCustomers = (params) => api.get('/customers', { params }).then(r => r.data.data);
export const fetchCustomerById = (id) => api.get(`/customers/${id}`).then(r => r.data.data);
export const triggerMailScan = (limit) => api.post('/mail/scan', {}, { params: { limit } }).then(r => r.data);
export const analyzeSentiment = (text) => api.post('/sentiment/analyze', { text }).then(r => r.data);
export const fetchUsers = () => api.get('/users').then(r => r.data.data);
export const updateFeedback = (id, body) => api.patch(`/sentiment/${id}`, body).then(r => r.data.data);
export const updateCustomer = (id, body) => api.patch(`/customers/${id}`, body).then(r => r.data.data);

export const fetchVoiceAgents = () => api.get('/voice-agents').then(r => r.data);
export const fetchVoiceAgent = (id) => api.get(`/voice-agents/${id}`).then(r => r.data);
export const updateVoiceAgent = (id, body) => api.post(`/voice-agents/${id}`, body).then(r => r.data);
export const voiceAgentChat = (id, body) => api.post(`/voice-agents/${id}/chat`, body).then(r => r.data);
export const syncVoiceAgent = (id) => api.post(`/voice-agents/${id}/sync-elevenlabs`).then(r => r.data);
export const unlinkVoiceAgent = (id) => api.post(`/voice-agents/${id}/unlink-elevenlabs`).then(r => r.data);
export const getVoiceAgentSignedUrl = (id) => api.get(`/voice-agents/${id}/elevenlabs-signed-url`).then(r => r.data);
export const startVoiceAgentPhoneCall = (id, body) => api.post(`/voice-agents/${id}/start-phone-call`, body).then(r => r.data);
export const setDefaultVoiceAgent = (id) => api.post(`/voice-agents/${id}/set-default`).then(r => r.data);
export const getDefaultVoiceAgent = () => api.get('/voice-agents/default').then(r => r.data);
export const callCustomerWithDefault = (body) => api.post('/voice-agents/call-customer', body).then(r => r.data);

export default api;
