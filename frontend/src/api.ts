import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { getIdToken, signOutUser } from './firebase';
import type {
  CareerRecord,
  ResumeDraft,
  ResumeTemplateType,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  getDNA: (id: string) => api.post(`/records/${id}/dna`),
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
  create: (data: { recordId: string; matchId: string; jobDescription: string; style?: 'modern' | 'executive' | 'tech' }) =>
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

// Interview Intelligence Coach
export const interviewAPI = {
  generate: (data: { recordId: string; matchId: string; jobDescription: string }) =>
    api.post('/interview', data),
  get: (id: string) => api.get(`/interview/${id}`),
  listByRecord: (recordId: string, limit?: number) =>
    api.get(`/interview/record/${recordId}`, { params: { limit } }),
};

// Export
export const exportAPI = {
  approve: (draftId: string) => api.post('/export/approve', { draftId }),
  pdf: (draftId: string, template: ResumeTemplateType = 'modern') =>
    api.post('/export/pdf', { draftId, template }, { responseType: 'blob' }),
  coverLetter: (draftId: string) =>
    api.post('/export/cover-letter', { draftId }, { responseType: 'blob' }),
  json: (recordId: string) => api.get(`/export/json/${recordId}`),
};

// Conversational Agentic Copilot (Chatbase / Gemini AI)
export const chatAPI = {
  sendMessage: (data: {
    messages: { role: 'user' | 'assistant'; content: string }[];
    recordId?: string;
    context?: any;
  }) => api.post('/chat', data),
};

// Resume upload & smart parse
export const resumeAPI = {
  parse: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// SaaS User Profile & Quotas
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateTier: (tier: 'free' | 'pro' | 'enterprise') =>
    api.post('/user/tier', { tier }),
};

export default api;
