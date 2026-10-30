import axios from 'axios';
import { useAuthStore } from '../store/useStore.js';

const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export const facilitiesAPI = {
  list: (params) => api.get('/facilities', { params }).then((r) => r.data),
  get: (id) => api.get(`/facilities/${id}`).then((r) => r.data),
  updateStatus: (id, data) => api.patch(`/facilities/${id}/status`, data).then((r) => r.data),
  verify: (id) => api.post(`/facilities/${id}/verify`).then((r) => r.data),
};

export const qrAPI = {
  resolve: (token) => api.get(`/qr/resolve/${token}`).then((r) => r.data),
  generateUrl: (facilityId) => `/api/qr/generate/${facilityId}`,
  list: () => api.get('/qr/list').then((r) => r.data),
};

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const inspectionsAPI = {
  list: (params) => api.get('/inspections', { params }).then((r) => r.data),
  get: (id) => api.get(`/inspections/${id}`).then((r) => r.data),
  submit: (data) => api.post('/inspections', data).then((r) => r.data),
  attentionQueue: () => api.get('/inspections/queue/attention').then((r) => r.data),
};

export default api;
