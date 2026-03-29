// src/lib/api.ts

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ── Token helpers ──────────────────────────────────────────
export const getToken = () => localStorage.getItem('mentorx_token');
export const setToken = (t: string) => localStorage.setItem('mentorx_token', t);
export const clearToken = () => localStorage.removeItem('mentorx_token');

export const getUser = (): AuthUser | null => {
  try {
    return JSON.parse(localStorage.getItem('mentorx_user') || 'null');
  } catch {
    return null;
  }
};

export const setUser = (u: AuthUser) =>
  localStorage.setItem('mentorx_user', JSON.stringify(u));

export const clearUser = () =>
  localStorage.removeItem('mentorx_user');

// ── Types ──────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'mentor' | 'mentee' | 'parent';
  roleId: number | null;
}

// ── Core request ───────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    clearToken();
    clearUser();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data;
}

const get = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(path: string) =>
  request<T>(path, { method: 'DELETE' });

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
    return res;
  },

  logout: () => {
    clearToken();
    clearUser();
  },

  me: () => get<AuthUser>('/auth/me'),
};

// ══════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════
export const adminApi = {
  getDashboard: () => get('/admin/dashboard'),
  getMentors: () => get('/admin/mentors'),
  getStudents: () => get('/admin/students'),
  getMentorStudents: (id: number) => get(`/admin/mentors/${id}/students`),
  getAnalytics: () => get('/admin/analytics'),
  getFeedback: () => get('/admin/feedback'),
};

// ══════════════════════════════════════════════════════════
// MENTEE
// ══════════════════════════════════════════════════════════
export const menteeApi = {
  getDashboard: () => get('/mentee/dashboard'),
  getProfile: () => get('/mentee/profile'),

  getTodayCheckin: () => get('/mentee/checkin/today'),
  submitCheckin: (data: any) => post('/mentee/checkin', data),

  getResources: () => get('/mentee/resources'),
  getSkills: () => get('/mentee/skills'),
  addSkill: (data: any) => post('/mentee/skills', data),

  submitFeedback: (data: any) => post('/mentee/feedback', data),
  submitConcern: (data: any) => post('/mentee/concern', data),

  getHealth: () => get('/mentee/health'),
  triggerSOS: () => post('/mentee/sos', {}),

  getDocuments: () => get('/mentee/documents'),
  uploadDocument: (data: any) => post('/mentee/documents', data),
  deleteDocument: (id: number) => del(`/mentee/documents/${id}`),

  getNotifications: () => get('/mentee/notifications'),
};

// ══════════════════════════════════════════════════════════
// MENTOR
// ══════════════════════════════════════════════════════════
export const mentorApi = {
  // Dashboard
  getDashboard: () => get('/mentor/dashboard'),

  // Mentees
  getMentees: () => get('/mentor/mentees'),
  getMentee: (id: number) => get(`/mentor/mentees/${id}`),

  // Alerts
  getAlerts: () => get('/mentor/alerts'),

  // Analytics
  getAnalytics: () => get('/mentor/analytics'),

  // Forum
  getForumThreads: () => get('/mentor/forum'),
  replyToThread: (threadId: number, message: string) =>
    post(`/mentor/forum/${threadId}/reply`, { message }),

  // Meetings
  getMeetings: () => get('/mentor/meetings'),
  createMeeting: (data: any) => post('/mentor/meetings', data),

  // Leave approvals / actions
  updateLeaveStatus: (id: number, status: string) =>
    put(`/mentor/leave/${id}`, { status }),

  // Resources
  getResources: () => get('/mentor/resources'),
  createResource: (data: any) => post('/mentor/resources', data),
};

// ══════════════════════════════════════════════════════════
// PARENT
// ══════════════════════════════════════════════════════════
export const parentApi = {
  getDashboard: () => get('/parent/dashboard'),
  getChildren: () => get('/parent/children'),
  getChild: (id: number) => get(`/parent/children/${id}`),

  getAnalytics: () => get('/parent/analytics'),
  getAnnouncements: () => get('/parent/announcements'),
  getMeetings: () => get('/parent/meetings'),
  getResources: () => get('/parent/resources'),

  getNotifications: () => get('/parent/notifications'),
};

// ══════════════════════════════════════════════════════════
// ML
// ══════════════════════════════════════════════════════════
export const mlApi = {
  predictRisk: (data: any) => post('/ml/predict', data),
};