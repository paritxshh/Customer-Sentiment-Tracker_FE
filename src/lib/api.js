import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const fetchStats = () => api.get('/stats').then(r => r.data.data);
export const fetchFeedback = (params) => api.get('/sentiment', { params }).then(r => r.data.data);
export const fetchPriorityQueue = (params) => api.get('/sentiment/priority', { params }).then(r => r.data.data);
export const fetchFeedbackById = (id) => api.get(`/sentiment/${id}`).then(r => r.data.data);
export const fetchCustomers = (params) => api.get('/customers', { params }).then(r => r.data.data);
export const fetchCustomerById = (id) => api.get(`/customers/${id}`).then(r => r.data.data);
export const triggerMailScan = (limit) => api.post('/mail/scan', {}, { params: { limit } }).then(r => r.data);
export const analyzeSentiment = (text) => api.post('/sentiment/analyze', { text }).then(r => r.data);

export default api;
