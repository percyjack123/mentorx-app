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

// ── Shared Types ───────────────────────────────────────────
export type UserRole = 'admin' | 'mentor' | 'mentee' | 'parent';
export type RiskLevel = 'Safe' | 'Moderate' | 'High';
export type DocumentStatus = 'Clean' | 'Suspicious' | 'Tampered';
export type LeaveStatus = 'Approved' | 'Pending' | 'Rejected';
export type PlacementStatus = 'Placed' | 'Preparing' | 'Not Started';
export type HostelStatus = 'Hosteller' | 'Day Scholar';
export type SkillType = 'Internship' | 'Hackathon' | 'Certification';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  roleId: number | null;
}

// ── Domain Types ───────────────────────────────────────────
export interface Student {
  id: number;
  user_id: number;
  mentor_id: number;
  name: string;
  email: string;
  department: string;
  semester: number;
  cgpa: number;
  attendance: number;
  risk_level: RiskLevel;
  risk_score: number;
  mood: string;
  placement_status: PlacementStatus;
  hostel_status: HostelStatus;
  blood_group: string;
  chronic_conditions: string;
  insurance_info: string;
  emergency_contact: string;
  last_check_in: string | null;
}

export interface Mentor {
  id: number;
  user_id: number;
  name: string;
  email: string;
  department: string;
  student_ids?: number[];
}

export interface CheckIn {
  id: number;
  student_id: number;
  mood: number;
  update_text: string;
  academic_progress: string;
  submitted_at: string;
}

export interface LeaveRecord {
  id: number;
  student_id: number;
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  medical_doc_url?: string;
}

export interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  mentor_id: number;
  mentor_name?: string;
  meeting_url: string;
  action_items: string[];
  student_ids?: number[];
}

export interface Resource {
  id: number;
  title: string;
  description: string;
  type: 'link' | 'file';
  url: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  created_at: string;
}

export interface Document {
  id: number;
  student_id: number;
  title: string;
  description?: string;
  file_url: string;
  doc_type: string;
  status: DocumentStatus;
  suspicion_score: number;
  uploaded_at: string;
}

export interface Goal {
  id: number;
  student_id: number;
  mentor_id: number;
  title: string;
  description: string;
  deadline: string;
  mentor_note: string;
  progress: number;
  completed: boolean;
  tasks?: GoalTask[];
}

export interface GoalTask {
  id: number;
  goal_id: number;
  title: string;
  completed: boolean;
}

export interface SkillEntry {
  id: number;
  student_id: number;
  type: SkillType;
  title: string;
  description: string;
  link: string;
  entry_date: string;
}

export interface HealthInfo {
  id?: number;
  student_id?: number;
  blood_group: string;
  chronic_conditions: string;
  insurance_info: string;
  emergency_contacts: Array<{ label: string; value: string }>;
}

export interface ForumThread {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name?: string;
  pinned: boolean;
  created_at: string;
  replies?: ForumReply[];
}

export interface ForumReply {
  id: number;
  thread_id: number;
  author_id: number;
  author: string;
  content: string;
  date: string;
}

export interface FeedbackEntry {
  id: number;
  student_id: number;
  mentor_id: number;
  mentor_name?: string;
  department?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface SosAlert {
  id: number;
  student_id: number;
  name?: string;
  resolved: boolean;
  created_at: string;
}

// Dashboard response types
export interface AdminDashboard {
  totalStudents: number;
  totalMentors: number;
  studentsAtRisk: number;
  averageCGPA: number;
}

export interface MentorDashboard {
  totalMentees: number;
  highRiskStudents: number;
  pendingLeaves: number;
  unsubmittedCheckIns: number;
}

export interface MenteeDashboard {
  student: Student;
  upcomingMeetings: Meeting[];
  moodTrend: CheckIn[];
}

export interface ParentDashboard {
  student: Student | null;
  studentName: string;
  riskLevel: RiskLevel;
  pendingLeaves: number;
  completedCheckIns: number;
  recentAlerts: Array<{ type: string; message: string }>;
}

export interface AnalyticsData {
  riskDistribution: Array<{ name: string; value: number }>;
  cgpaTrends: Array<{ semester: string; cgpa: number }>;
  attendanceDistribution: Array<{ range: string; count: number }>;
}

export interface MentorAlerts {
  highRisk: Student[];
  tamperedDocuments: Array<Document & { name: string }>;
  missedCheckins: Student[];
  sosAlerts: SosAlert[];
}

export interface ParentAlerts {
  highRisk: Student[];
  lowAttendance: Student[];
  missedCheckins: Student[];
  sosAlerts: SosAlert[];
}

export interface MenteeProfileData {
  student: Student;
  checkIns: CheckIn[];
  leaveRecords: LeaveRecord[];
  documents: Document[];
  goals: Goal[];
  skillEntries: SkillEntry[];
  healthInfo?: HealthInfo;
}

export interface ChildProfileData {
  student: Student;
  checkIns: CheckIn[];
  leaveRecords: LeaveRecord[];
  documents: Document[];
  skillEntries: SkillEntry[];
  healthInfo?: HealthInfo;
  mentorFeedback?: Array<{ comment: string; mentor_name: string; date: string }>;
}

export interface MentorStudentsData {
  mentor: Mentor;
  students: Student[];
}

export interface TodayCheckinResponse {
  submitted: boolean;
  checkin?: CheckIn;
}

export interface MlPredictRequest {
  cgpa: number;
  attendance: number;
  mood_score: number;
  backlog_count: number;
  placement_status?: PlacementStatus;
}

export interface MlPredictResponse {
  risk: 'Green' | 'Yellow' | 'Red';
  risk_probability: number;
  predicted_cgpa: number;
  suggestion: string;
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
    throw new Error((data as { error?: string })?.error || 'Request failed');
  }

  return data as T;
}

const get = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(path: string) =>
  request<T>(path, { method: 'DELETE' });

// ══════════════════════════════════════════════════════════
// AUTH  →  /api/auth/*
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
// ADMIN  →  /api/admin/*
// ══════════════════════════════════════════════════════════
export const adminApi = {
  getDashboard: () => get<AdminDashboard>('/admin/dashboard'),

  getMentors: () => get<Mentor[]>('/admin/mentors'),

  getStudents: () => get<Student[]>('/admin/students'),

  getMentorStudents: (id: number) =>
    get<MentorStudentsData>(`/admin/mentors/${id}/students`),

  getAnalytics: () => get<AnalyticsData>('/admin/analytics'),

  getFeedback: () => get<FeedbackEntry[]>('/admin/feedback'),

  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => post<{ userId: number }>('/admin/users', data),

  deleteUser: (id: number) => del<{ message: string }>(`/admin/users/${id}`),
};

// ══════════════════════════════════════════════════════════
// MENTOR  →  /api/mentor/*
// ══════════════════════════════════════════════════════════
export const mentorApi = {
  getDashboard: () => get<MentorDashboard>('/mentor/dashboard'),

  getMentees: () => get<Student[]>('/mentor/mentees'),

  getMentee: (id: number) => get<MenteeProfileData>(`/mentor/mentees/${id}`),

  getAlerts: () => get<MentorAlerts>('/mentor/alerts'),

  getAnalytics: () => get<AnalyticsData>('/mentor/analytics'),

  getForumThreads: () => get<ForumThread[]>('/mentor/forum'),

  replyToThread: (threadId: number, message: string) =>
    post<ForumReply>(`/mentor/forum/${threadId}/reply`, { message }),

  getMeetings: () => get<Meeting[]>('/mentor/meetings'),

  createMeeting: (data: {
    title: string;
    date: string;
    time: string;
    meetingUrl?: string;
    studentIds?: number[];
    actionItems?: string[];
  }) => post<Meeting>('/mentor/meetings', data),

  updateLeaveStatus: (id: number, status: LeaveStatus) =>
    put<LeaveRecord>(`/mentor/leave/${id}`, { status }),

  getResources: () => get<Resource[]>('/mentor/resources'),

  createResource: (data: {
    title: string;
    description?: string;
    type: 'link' | 'file';
    url?: string;
  }) => post<Resource>('/mentor/resources', data),
};

// ══════════════════════════════════════════════════════════
// MENTEE  →  /api/mentee/*
// ══════════════════════════════════════════════════════════
export const menteeApi = {
  getDashboard: () => get<MenteeDashboard>('/mentee/dashboard'),

  getProfile: () => get<Student>('/mentee/profile'),

  getTodayCheckin: () => get<TodayCheckinResponse>('/mentee/checkin/today'),

  submitCheckin: (data: {
    mood: number;
    update?: string;
    academicProgress?: string;
  }) => post<CheckIn>('/mentee/checkin', data),

  getLeaves: () => get<LeaveRecord[]>('/mentee/leaves'),

  applyLeave: (data: {
    fromDate: string;
    toDate: string;
    reason: string;
    medicalDocUrl?: string;
  }) => post<LeaveRecord>('/mentee/leaves', data),

  getGoals: () => get<Goal[]>('/mentee/goals'),

  updateTask: (goalId: number, taskId: number, completed: boolean) =>
    put<Goal>(`/mentee/goals/${goalId}/tasks/${taskId}`, { completed }),

  getResources: () => get<Resource[]>('/mentee/resources'),

  getSkills: () => get<SkillEntry[]>('/mentee/skills'),

  addSkill: (data: {
    type: SkillType;
    title: string;
    description?: string;
    link?: string;
    entryDate?: string;
  }) => post<SkillEntry>('/mentee/skills', data),

  submitFeedback: (data: {
    rating: number;
    comment: string;
  }) => post<FeedbackEntry>('/mentee/feedback', data),

  submitConcern: (data: {
    content: string;
    anonymous?: boolean;
  }) => post<{ id: number }>('/mentee/concern', data),

  getHealth: () => get<HealthInfo>('/mentee/health'),

  updateHealth: (data: {
    bloodGroup?: string;
    chronicConditions?: string;
    insuranceInfo?: string;
    emergencyContacts?: Array<{ label: string; value: string }>;
  }) => put<HealthInfo>('/mentee/health', data),

  triggerSOS: () => post<{ id: number }>('/mentee/sos', {}),

  getDocuments: () => get<Document[]>('/mentee/documents'),

  uploadDocument: (data: {
    title: string;
    description?: string;
    fileUrl: string;
    docType?: string;
  }) => post<Document>('/mentee/documents', data),

  deleteDocument: (id: number) => del<{ message: string }>(`/mentee/documents/${id}`),

  getNotifications: () => get<Notification[]>('/mentee/notifications'),
};

// ══════════════════════════════════════════════════════════
// PARENT  →  /api/parent/*
// ══════════════════════════════════════════════════════════
export const parentApi = {
  getDashboard: () => get<ParentDashboard>('/parent/dashboard'),

  getChildren: () => get<Student[]>('/parent/children'),

  getChild: (id: number) => get<ChildProfileData>(`/parent/children/${id}`),

  getAnalytics: () =>
    get<AnalyticsData & { checkInFrequency?: Array<{ month: string; count: number }> }>(
      '/parent/analytics'
    ),

  getAnnouncements: () => get<ForumThread[]>('/parent/announcements'),

  getMeetings: () => get<Meeting[]>('/parent/meetings'),

  getResources: () => get<Resource[]>('/parent/resources'),

  getNotifications: () => get<ParentAlerts>('/parent/notifications'),
};

// ══════════════════════════════════════════════════════════
// ML  →  /api/ml/*
// ══════════════════════════════════════════════════════════
export const mlApi = {
  predictRisk: (data: MlPredictRequest) =>
    post<MlPredictResponse>('/ml/predict', data),
};