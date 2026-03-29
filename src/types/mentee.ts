// ✅ NEW: Shared interfaces — import these wherever you use mentee data

export interface Student {
  id: number;
  user_id: number;
  name: string;
  department: string;
  semester: number;
  cgpa: number;
  attendance: number;
  mood: number;
  risk_level: "Safe" | "Moderate" | "High";
  risk_score: number;
  blood_group?: string;
  chronic_conditions?: string;
  emergency_contact?: string;
  hostel_status?: string;
}

export interface CheckIn {
  id: number;
  mood: number;
  update?: string;
  academic_progress?: string;
  submitted_at: string;
}

export interface LeaveRecord {
  id: number;
  from_date: string;
  to_date: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface Document {
  id: number;
  title: string;
  file_url: string;
  status: string;
}

export interface Goal {
  id: number;
  title: string;
  description?: string;
  status: string;
}

export interface SkillEntry {
  id: number;
  title: string;
  type: string;
  description?: string;
}

export interface HealthInfo {
  id?: number;
  blood_group?: string;
  chronic_conditions?: string;
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