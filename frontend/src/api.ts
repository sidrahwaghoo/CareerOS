import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { getIdToken, signOutUser } from './firebase';
import type {
  CareerRecord,
  ResumeDraft,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the signed-in user's real Firebase ID token to every API request.
// The backend uses the token's uid to scope all records, matches and drafts.
api.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired, revoked or invalid session is a real 401 — end the Firebase
// session so the UI returns to the sign-in screen instead of showing stale data.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOutUser().catch(() => undefined);
    }
    return Promise.reject(error);
  },
);

// Career Records
export const careerRecordAPI = {
  create: (data: Omit<CareerRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'>) =>
    api.post('/records', data),
  get: (id: string) => api.get(`/records/${id}`),
  update: (id: string, data: Partial<CareerRecord>) =>
    api.put(`/records/${id}`, data),
  delete: (id: string) => api.delete(`/records/${id}`),
  list: (limit?: number) => api.get('/records', { params: { limit } }),
};

// Match
export const matchAPI = {
  create: (data: { recordId: string; jobDescription: string }) =>
    api.post('/match', data),
  get: (id: string) => api.get(`/match/${id}`),
  listByRecord: (recordId: string, limit?: number) =>
    api.get(`/match/record/${recordId}`, { params: { limit } }),
};

// Draft
export const draftAPI = {
  create: (data: { recordId: string; matchId: string; jobDescription: string }) =>
    api.post('/draft', data),
  get: (id: string) => api.get(`/draft/${id}`),
  update: (id: string, data: Partial<ResumeDraft>) =>
    api.put(`/draft/${id}`, data),
  listByRecord: (recordId: string, limit?: number) =>
    api.get(`/draft/record/${recordId}`, { params: { limit } }),
};

// Review
export const reviewAPI = {
  create: (data: { draftId: string; jobDescription: string }) =>
    api.post('/review', data),
  get: (id: string) => api.get(`/review/${id}`),
};

// Export
export const exportAPI = {
  approve: (draftId: string) => api.post('/export/approve', { draftId }),
  pdf: (draftId: string) =>
    api.post('/export/pdf', { draftId }, { responseType: 'blob' }),
  json: (recordId: string) => api.get(`/export/json/${recordId}`),
};

export default api;
