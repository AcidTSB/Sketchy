import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// AUTH
export const authApi = {
  login: (e: string, p: string) => api.post('/login', { email: e, password: p }),
  register: (e: string, p: string, n: string) =>
    api.post('/register', { email: e, password: p, name: n }),
  getProfile: () => api.get('/me'),
}

// PROJECT
export const projectApi = {
  getAll: () => api.get('/projects'),
  getOne: (id: string | number) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: number, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
}

// FOLDER
export const folderApi = {
  getAll: (projectId: number) => api.get(`/projects/${projectId}/folders`),
  create: (data: { projectId: number; name: string }) => api.post('/folders', data), // Cần thêm route này ở server nếu muốn tách
}

// TRACK
export const trackApi = {
  getAll: (projectId: number) => api.get(`/projects/${projectId}/tracks`),
  create: (data: any) => api.post('/tracks', data),
}

// ANALYTICS
export const analyticsApi = {
  startSession: () => api.post('/analytics/session/start'),
  endSession: () => api.post('/analytics/session/end'),
  trackActivity: (data: any) => api.post('/analytics/activity', data),
  getSummary: (period: string) => api.get('/analytics/summary', { params: { period } }),
  getTimeline: (days: number) => api.get('/analytics/timeline', { params: { days } }),
  getPopular: (period: string) => api.get('/analytics/popular', { params: { period } }),
}

// SHARE
export const shareApi = {
  create: (data: any) => api.post('/share', data),
  get: (token: string) => api.get(`/share/${token}`),
}
