import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Axios instance
const api = axios.create({ baseURL: API });

// Auto-attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('campusflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authAPI = {
  login:    (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  me:       ()     => api.get('/api/auth/me'),
};

// Events
export const eventsAPI = {
  getAll:  ()       => api.get('/api/events'),
  getOne:  (id)     => api.get(`/api/events/${id}`),
  create:  (data)   => api.post('/api/events', data),
  update:  (id, data) => api.put(`/api/events/${id}`, data),
  delete:  (id)     => api.delete(`/api/events/${id}`),
};

// Registrations
export const registrationsAPI = {
  register:               (data) => api.post('/api/registrations', data),
  getUserRegistrations:   (userId) => api.get(`/api/registrations/user/${userId}`),
  getEventRegistrations:  (eventId) => api.get(`/api/registrations/event/${eventId}`),
  generateQR: (data) => api.post('/api/registrations/generate-qr', data),
  scanQR:                 (data) => api.post('/api/registrations/scan', data),
};

// Crowd
export const crowdAPI = {
  getCurrent: (eventId) => api.get(`/api/crowd/current${eventId ? `?event_id=${eventId}` : ''}`),
  update:     (data)    => api.post('/api/crowd/update', data),
  getHistory: (zone)    => api.get(`/api/crowd/history${zone ? `?zone=${zone}` : ''}`),
};

// Budget
// Budget
export const budgetAPI = {
    getExpenses:   (eventId) => api.get(`/api/budget/expenses/${eventId}`),
    addExpense:    (data)    => api.post('/api/budget/expense', data),
    deleteExpense: (id)      => api.delete(`/api/budget/expense/${id}`),
    getSummary:    (eventId) => api.get(`/api/budget/summary/${eventId}`),
  };

// Emergency
export const emergencyAPI = {
    triggerPanic:   (data) => api.post('/api/emergency/panic/trigger', data),
    resolvePanic:   (data) => api.post('/api/emergency/panic/resolve', data),
    getPanicStatus: ()     => api.get('/api/emergency/panic/status'),
    getRoutes:      (zone) => api.get(`/api/emergency/evacuation/${zone}`),
  };

export default api;