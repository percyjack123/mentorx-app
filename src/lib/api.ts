// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ── Token helpers ──────────────────────────────────────────
export const getToken = () => localStorage.getItem('mentorx_token');
export const setToken = (t: string) => localStorage.setItem('mentorx_token', t);
export const clearToken = () => localStorage.removeItem('mentorx_token');

export const getUser = (): AuthUser | null => {
  const raw = localStorage.getItem('mentorx_user');
  return raw ? JSON.parse(raw) : null;
};
export const setUser = (u: AuthUser) => localStorage.setItem('mentorx_user', JSON.stringify(u));
export const clearUser = () => localStorage.removeItem('mentorx_user');

// ── Types ──────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'mentor' | 'mentee' | 'parent';
  roleId: number | null;
}

// ── Core fetch wrapper ─────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    clearUser();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

const get = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data;
  },
  logout: () => { clearToken(); clearUser(); },
  me: () => get<AuthUser>('/auth/me'),
};

// ══════════════════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════════════════
export const adminApi = {
  getDashboard: () => get<{
    totalStudents: number; totalMentors: number;
    studentsAtRisk: number; averageCGPA: number;
  }>('/admin/dashboard'),

  getMentors: () => get<{ id: number; name: string; email: string; department: string; student_ids: number[] }[]>('/admin/mentors'),

  getMentorStudents: (mentorId: number) => get<{ mentor: object; students: object[] }>(`/admin/mentors/${mentorId}/students`),

  getStudents: () => get<object[]>('/admin/students'),

  createUser: (data: { name: string; email: string; password: string; role: string; department?: string; studentId?: number }) =>
    post<{ message: string; userId: number }>('/admin/users', data),

  deleteUser: (userId: number) => del<{ message: string }>(`/admin/users/${userId}`),

  assignMentor: (studentId: number, mentorId: number) =>
    put<{ message: string }>(`/admin/students/${studentId}/assign-mentor`, { mentorId }),

  getAnalytics: () => get<{
    riskDistribution: object[]; cgpaTrends: object[];
    attendanceDistribution: object[]; feedbackStats: object;
  }>('/admin/analytics'),

  getFeedback: () => get<object[]>('/admin/feedback'),
};

// ══════════════════════════════════════════════════════════
//  MENTOR
// ══════════════════════════════════════════════════════════
export const mentorApi = {
  getDashboard: () => get<{
    totalMentees: number; highRiskStudents: number;
    pendingLeaves: number; unsubmittedCheckIns: number;
  }>('/mentor/dashboard'),

  getMentees: () => get<object[]>('/mentor/mentees'),

  getMentee: (id: number) => get<{
    student: object; checkIns: object[]; leaveRecords: object[];
    documents: object[]; goals: object[]; skillEntries: object[]; healthInfo: object | null;
  }>(`/mentor/mentees/${id}`),

  getAlerts: () => get<{
    highRisk: object[]; tamperedDocuments: object[];
    missedCheckins: object[]; sosAlerts: object[];
  }>('/mentor/alerts'),

  getMeetings: () => get<object[]>('/mentor/meetings'),
  createMeeting: (data: { title: string; date: string; time: string; meetingUrl?: string; actionItems?: string[]; studentIds?: number[] }) =>
    post<object>('/mentor/meetings', data),

  getResources: () => get<object[]>('/mentor/resources'),
  createResource: (data: { title: string; description?: string; type?: string; url?: string }) =>
    post<object>('/mentor/resources', data),

  getForumThreads: () => get<object[]>('/mentor/forum'),
  createThread: (data: { title: string; content: string; pinned?: boolean }) =>
    post<object>('/mentor/forum', data),
  replyToThread: (threadId: number, content: string) =>
    post<object>(`/mentor/forum/${threadId}/reply`, { content }),

  getAnalytics: () => get<object>('/mentor/analytics'),

  updateLeaveStatus: (leaveId: number, status: 'Approved' | 'Rejected') =>
    put<object>(`/mentor/leaves/${leaveId}`, { status }),

  createGoal: (studentId: number, data: {
    title: string; description?: string; deadline?: string;
    mentorNote?: string; tasks?: { title: string }[];
  }) => post<object>(`/mentor/mentees/${studentId}/goals`, data),

  getConcerns: () => get<object[]>('/mentor/concerns'),
};

// ══════════════════════════════════════════════════════════
//  MENTEE
// ══════════════════════════════════════════════════════════
export const menteeApi = {
  getDashboard: () => get<{ student: object; upcomingMeetings: object[]; moodTrend: object[] }>('/mentee/dashboard'),

  getProfile: () => get<object>('/mentee/profile'),

  submitCheckin: (data: { mood: number; update?: string; academicProgress?: string }) =>
    post<object>('/mentee/checkin', data),
  getTodayCheckin: () => get<{ submitted: boolean; checkin: object | null }>('/mentee/checkin/today'),

  getLeaves: () => get<object[]>('/mentee/leave'),
  applyLeave: (data: { fromDate: string; toDate: string; reason: string }) =>
    post<object>('/mentee/leave', data),

  getGoals: () => get<object[]>('/mentee/goals'),
  updateTask: (goalId: number, taskId: number, completed: boolean) =>
    put<object>(`/mentee/goals/${goalId}/tasks/${taskId}`, { completed }),

  getSkills: () => get<object[]>('/mentee/skills'),
  addSkill: (data: { type: string; title: string; description?: string; link?: string; entryDate?: string }) =>
    post<object>('/mentee/skills', data),

  getResources: () => get<object[]>('/mentee/resources'),

  submitConcern: (data: { content: string; anonymous: boolean }) =>
    post<object>('/mentee/concern', data),

  getHealth: () => get<object>('/mentee/health'),
  updateHealth: (data: {
    bloodGroup?: string; chronicConditions?: string;
    insuranceInfo?: string; emergencyContacts?: object[];
  }) => put<object>('/mentee/health', data),

  triggerSOS: () => post<{ message: string; alert: object }>('/mentee/sos', {}),

  getDocuments: () => get<object[]>('/mentee/documents'),
  uploadDocument: (data: { title: string; description?: string; fileUrl?: string; docType?: string }) =>
    post<object>('/mentee/documents', data),
  deleteDocument: (id: number) => del<{ message: string }>(`/mentee/documents/${id}`),

  submitFeedback: (data: { rating: number; comment?: string }) =>
    post<object>('/mentee/feedback', data),

  getNotifications: () => get<object[]>('/mentee/notifications'),
  markNotificationRead: (id: number) => put<{ message: string }>(`/mentee/notifications/${id}/read`, {}),
};

// ══════════════════════════════════════════════════════════
//  PARENT
// ══════════════════════════════════════════════════════════
export const parentApi = {
  getDashboard: () => get<{
    studentName: string; riskLevel: string; pendingLeaves: number;
    completedCheckIns: number; student: object | null; recentAlerts: object[];
  }>('/parent/dashboard'),

  getChildren: () => get<object[]>('/parent/children'),

  getChild: (id: number) => get<{
    student: object; checkIns: object[]; leaveRecords: object[];
    documents: object[]; skillEntries: object[]; healthInfo: object | null; mentorFeedback: object[];
  }>(`/parent/children/${id}`),

  getNotifications: () => get<{
    highRisk: object[]; lowAttendance: object[];
    missedCheckins: object[]; sosAlerts: object[];
  }>('/parent/notifications'),

  getMeetings: () => get<object[]>('/parent/meetings'),

  getResources: () => get<object[]>('/parent/resources'),

  getAnnouncements: () => get<object[]>('/parent/announcements'),

  getAnalytics: () => get<{
    riskDistribution: object[]; cgpaTrends: object[];
    attendanceDistribution: object[]; checkInFrequency: object[];
  }>('/parent/analytics'),
};

// ══════════════════════════════════════════════════════════
//  ML PREDICTION
// ══════════════════════════════════════════════════════════
export const mlApi = {
  predictRisk: (data: {
    cgpa: number;
    attendance: number;
    mood_score: number;
    backlog_count: number;
    placement_status: number;
  }) => fetch(`${BASE_URL.replace('/api', '')}/predict-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()),
};

export default { authApi, adminApi, mentorApi, menteeApi, parentApi, mlApi };