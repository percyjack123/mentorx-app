export type RiskLevel = "Safe" | "Moderate" | "High";
export type DocumentStatus = "Clean" | "Suspicious" | "Tampered";
export type LeaveStatus = "Approved" | "Pending" | "Rejected";
export type Mood = "Happy" | "Neutral" | "Stressed" | "Sad" | "Anxious";
export type PlacementStatus = "Placed" | "Preparing" | "Not Started";
export type HostelStatus = "Hosteller" | "Day Scholar";

export interface StudentDocument {
  name: string;
  status: DocumentStatus;
  fileUrl: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  cgpa: number;
  attendance: number;
  riskLevel: RiskLevel;
  riskScore: number;
  lastCheckIn: string;
  mood: Mood;
  placementStatus: PlacementStatus;
  hostelStatus: HostelStatus;
  bloodGroup: string;
  chronicConditions: string;
  insuranceInfo: string;
  emergencyContact: string;
  documents: {
    gradeReport: DocumentStatus;
    attendanceReport: DocumentStatus;
  };
  documentFiles: StudentDocument[];
  semester: number;
  department: string;
  mentorId: number;
}

export interface LeaveRecord {
  id: number;
  studentId: number;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
}

export interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  mentorName: string;
  studentIds: number[];
  actionItems: string[];
  meetingUrl: string;
}

export interface Resource {
  id: number;
  title: string;
  description: string;
  type: "link" | "file";
  url: string;
  uploadedBy: string;
  date: string;
}

export interface ForumThread {
  id: number;
  title: string;
  author: string;
  content: string;
  date: string;
  pinned: boolean;
  replies: { author: string; content: string; date: string }[];
}

export interface GoalTask {
  id: number;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  progress: number;
  completed: boolean;
  deadline: string;
  mentorNote: string;
  tasks: GoalTask[];
}

export interface SkillEntry {
  id: number;
  type: "Internship" | "Hackathon" | "Certification";
  title: string;
  description: string;
  link: string;
  date: string;
}

export interface MentorInfo {
  id: number;
  name: string;
  email: string;
  department: string;
  studentIds: number[];
}

export interface Notification {
  id: number;
  role: "admin" | "mentor" | "mentee";
  type: string;
  message: string;
  time: string;
}

export interface OtherDocument {
  id: number;
  title: string;
  description: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface FeedbackEntry {
  id: number;
  mentorId: number;
  rating: number;
  comment: string;
  date: string;
}

const firstNames = ["Rahul", "Priya", "Arjun", "Sneha", "Vikram", "Ananya", "Karthik", "Divya", "Aditya", "Meera", "Rohan", "Ishita", "Siddharth", "Kavya", "Nikhil", "Pooja", "Amit", "Neha", "Varun", "Shruti", "Rajesh", "Lakshmi", "Gaurav", "Rina", "Tushar", "Pallavi", "Manish", "Swati", "Deepak", "Anjali", "Suresh", "Bhavna", "Ravi", "Tanvi", "Akash", "Sonal", "Vivek", "Nisha", "Harsh", "Jyoti"];
const lastNames = ["Sharma", "Patel", "Kumar", "Singh", "Gupta", "Reddy", "Joshi", "Verma", "Nair", "Iyer", "Mehta", "Das", "Chopra", "Saxena", "Agarwal", "Bhat", "Rao", "Malhotra", "Banerjee", "Pillai", "Desai", "Chatterjee", "Tiwari", "Kulkarni", "Menon", "Shah", "Pandey", "Mishra", "Sinha", "Kapoor", "Dutta", "Choudhury", "Ghosh", "Thakur", "Jain", "Sethi", "Bhatt", "Yadav", "Agnihotri", "Rajan"];
const departments = ["Computer Science", "Electronics", "Mechanical", "Civil", "Information Technology"];
const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const moods: Mood[] = ["Happy", "Neutral", "Stressed", "Sad", "Anxious"];
const placements: PlacementStatus[] = ["Placed", "Preparing", "Not Started"];
const dummyPdf = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

function generateStudents(): Student[] {
  const students: Student[] = [];
  const distribution = { Safe: 22, Moderate: 12, High: 6 };
  let id = 1;

  const createStudent = (riskLevel: RiskLevel): Student => {
    const riskScore = riskLevel === "Safe" ? Math.floor(Math.random() * 30) : riskLevel === "Moderate" ? 30 + Math.floor(Math.random() * 35) : 65 + Math.floor(Math.random() * 35);
    const cgpa = riskLevel === "Safe" ? +(7 + Math.random() * 3).toFixed(1) : riskLevel === "Moderate" ? +(5 + Math.random() * 3).toFixed(1) : +(2 + Math.random() * 4).toFixed(1);
    const attendance = riskLevel === "Safe" ? 80 + Math.floor(Math.random() * 20) : riskLevel === "Moderate" ? 60 + Math.floor(Math.random() * 25) : 30 + Math.floor(Math.random() * 35);
    const mood = riskLevel === "Safe" ? moods[Math.floor(Math.random() * 2)] : riskLevel === "Moderate" ? moods[1 + Math.floor(Math.random() * 2)] : moods[2 + Math.floor(Math.random() * 3)];
    const dayOffset = Math.floor(Math.random() * 10);
    const lastCheckIn = new Date(2026, 2, 15 - dayOffset).toISOString().split("T")[0];
    const docStatus: DocumentStatus = riskLevel === "High" && Math.random() > 0.6 ? (Math.random() > 0.5 ? "Suspicious" : "Tampered") : "Clean";
    const currentId = id++;
    const mentorId = currentId <= 10 ? 1 : currentId <= 20 ? 2 : currentId <= 30 ? 3 : 4;

    return {
      id: currentId,
      name: `${firstNames[currentId % firstNames.length]} ${lastNames[currentId % lastNames.length]}`,
      email: `student${currentId}@mentorx.edu`,
      cgpa: Math.min(cgpa, 10),
      attendance: Math.min(attendance, 100),
      riskLevel,
      riskScore,
      lastCheckIn,
      mood,
      placementStatus: placements[Math.floor(Math.random() * placements.length)],
      hostelStatus: Math.random() > 0.4 ? "Hosteller" : "Day Scholar",
      bloodGroup: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
      chronicConditions: Math.random() > 0.8 ? "Asthma" : Math.random() > 0.9 ? "Diabetes" : "None",
      insuranceInfo: Math.random() > 0.5 ? "Star Health Insurance" : "None",
      emergencyContact: `Father - 98${Math.floor(10000000 + Math.random() * 89999999)}`,
      documents: { gradeReport: docStatus, attendanceReport: docStatus === "Tampered" ? "Suspicious" : "Clean" },
      documentFiles: [
        { name: "Grade Report", status: docStatus, fileUrl: dummyPdf },
        { name: "Attendance Report", status: docStatus === "Tampered" ? "Suspicious" : "Clean", fileUrl: dummyPdf },
      ],
      semester: 3 + Math.floor(Math.random() * 5),
      department: departments[Math.floor(Math.random() * departments.length)],
      mentorId,
    };
  };

  for (let i = 0; i < distribution.Safe; i++) students.push(createStudent("Safe"));
  for (let i = 0; i < distribution.Moderate; i++) students.push(createStudent("Moderate"));
  for (let i = 0; i < distribution.High; i++) students.push(createStudent("High"));

  return students;
}

export const students: Student[] = generateStudents();

export const mentors: MentorInfo[] = [
  { id: 1, name: "Dr. Suresh Menon", email: "suresh.menon@mentorx.edu", department: "Computer Science", studentIds: students.filter(s => s.mentorId === 1).map(s => s.id) },
  { id: 2, name: "Dr. Kavitha Rao", email: "kavitha.rao@mentorx.edu", department: "Electronics", studentIds: students.filter(s => s.mentorId === 2).map(s => s.id) },
  { id: 3, name: "Dr. Rajan Pillai", email: "rajan.pillai@mentorx.edu", department: "Mechanical", studentIds: students.filter(s => s.mentorId === 3).map(s => s.id) },
  { id: 4, name: "Dr. Anjali Sharma", email: "anjali.sharma@mentorx.edu", department: "Information Technology", studentIds: students.filter(s => s.mentorId === 4).map(s => s.id) },
];

export const leaveRecords: LeaveRecord[] = [
  { id: 1, studentId: 1, fromDate: "2026-03-01", toDate: "2026-03-03", reason: "Family function", status: "Approved" },
  { id: 2, studentId: 2, fromDate: "2026-03-05", toDate: "2026-03-06", reason: "Medical", status: "Pending" },
  { id: 3, studentId: 5, fromDate: "2026-03-10", toDate: "2026-03-12", reason: "Personal", status: "Pending" },
  { id: 4, studentId: 8, fromDate: "2026-03-08", toDate: "2026-03-09", reason: "Fever", status: "Pending" },
  { id: 5, studentId: 35, fromDate: "2026-03-12", toDate: "2026-03-14", reason: "Unspecified", status: "Rejected" },
  { id: 6, studentId: 36, fromDate: "2026-03-11", toDate: "2026-03-15", reason: "Travel", status: "Pending" },
];

export const meetings: Meeting[] = [
  { id: 1, title: "Weekly Progress Review", date: "2026-03-16", time: "10:00 AM", mentorName: "Dr. Suresh Menon", studentIds: [1, 2, 3], actionItems: ["Review semester goals", "Discuss attendance"], meetingUrl: "https://meet.google.com/abc-defg-hij" },
  { id: 2, title: "Career Guidance Session", date: "2026-03-17", time: "2:00 PM", mentorName: "Dr. Kavitha Rao", studentIds: [11, 12], actionItems: ["Resume review", "Internship prep"], meetingUrl: "https://meet.google.com/klm-nopq-rst" },
  { id: 3, title: "Risk Intervention Meeting", date: "2026-03-18", time: "11:00 AM", mentorName: "Dr. Rajan Pillai", studentIds: [35, 36], actionItems: ["Address attendance issues", "Set improvement plan"], meetingUrl: "https://meet.google.com/uvw-xyz-123" },
];

export const resources: Resource[] = [
  { id: 1, title: "Data Structures Notes", description: "Comprehensive notes on DS & Algorithms", type: "file", url: "#", uploadedBy: "Dr. Suresh Menon", date: "2026-03-01" },
  { id: 2, title: "Placement Preparation Guide", description: "Step-by-step guide for campus placements", type: "link", url: "https://example.com/placement", uploadedBy: "Dr. Kavitha Rao", date: "2026-03-05" },
  { id: 3, title: "Mental Health Resources", description: "Guides for stress management and wellbeing", type: "link", url: "https://example.com/wellbeing", uploadedBy: "Admin", date: "2026-03-08" },
  { id: 4, title: "Resume Template", description: "Professional resume template for students", type: "file", url: "#", uploadedBy: "Dr. Anjali Sharma", date: "2026-03-10" },
];

export const forumThreads: ForumThread[] = [
  { id: 1, title: "How to improve student attendance?", author: "Dr. Suresh Menon", content: "I've noticed a trend of declining attendance in the 5th semester. What strategies have worked for others?", date: "2026-03-05", pinned: true, replies: [{ author: "Dr. Kavitha Rao", content: "We started a buddy system that helped a lot.", date: "2026-03-06" }, { author: "Dr. Rajan Pillai", content: "Regular check-ins with parents also made a difference.", date: "2026-03-07" }] },
  { id: 2, title: "Best practices for early intervention", author: "Dr. Anjali Sharma", content: "What early warning signs do you look for in at-risk students?", date: "2026-03-08", pinned: false, replies: [{ author: "Dr. Suresh Menon", content: "Sudden drops in CGPA and missed check-ins are key indicators.", date: "2026-03-09" }] },
  { id: 3, title: "Upcoming workshop on stress management", author: "Dr. Kavitha Rao", content: "We're organizing a workshop next week. Please encourage your mentees to attend.", date: "2026-03-12", pinned: true, replies: [] },
];

export const menteeGoals: Goal[] = [
  {
    id: 1, title: "Improve CGPA to 8.0+", description: "Focus on core subjects and complete all assignments",
    progress: 50, completed: false, deadline: "2026-06-30", mentorNote: "Prioritize Data Structures and Algorithms.",
    tasks: [
      { id: 1, title: "Assignments completed", completed: true },
      { id: 2, title: "Midterm preparation", completed: true },
      { id: 3, title: "Weekly study plan", completed: false },
      { id: 4, title: "Project submission", completed: false },
    ],
  },
  {
    id: 2, title: "Maintain 90% Attendance", description: "Attend all classes and labs regularly",
    progress: 75, completed: false, deadline: "2026-06-30", mentorNote: "Track daily and report weekly.",
    tasks: [
      { id: 1, title: "Attend all lectures this week", completed: true },
      { id: 2, title: "Attend all labs this week", completed: true },
      { id: 3, title: "Submit attendance report", completed: true },
      { id: 4, title: "Zero unexcused absences this month", completed: false },
    ],
  },
  {
    id: 3, title: "Complete One Internship", description: "Apply to at least 5 companies for summer internship",
    progress: 25, completed: false, deadline: "2026-05-15", mentorNote: "Focus on tech companies with good mentorship programs.",
    tasks: [
      { id: 1, title: "Update resume", completed: true },
      { id: 2, title: "Apply to 5 companies", completed: false },
      { id: 3, title: "Practice coding interviews", completed: false },
      { id: 4, title: "Complete mock interviews", completed: false },
    ],
  },
  {
    id: 4, title: "Learn React & TypeScript", description: "Complete online course and build a project",
    progress: 100, completed: true, deadline: "2026-03-01", mentorNote: "Great progress! Consider contributing to open source.",
    tasks: [
      { id: 1, title: "Complete React course", completed: true },
      { id: 2, title: "Complete TypeScript course", completed: true },
      { id: 3, title: "Build portfolio project", completed: true },
      { id: 4, title: "Deploy project", completed: true },
    ],
  },
];

export const skillEntries: SkillEntry[] = [
  { id: 1, type: "Hackathon", title: "CodeSprint 2026", description: "Built an AI chatbot in 24 hours", link: "https://devpost.com", date: "2026-02-15" },
  { id: 2, type: "Certification", title: "AWS Cloud Practitioner", description: "Completed AWS certification exam", link: "https://aws.amazon.com", date: "2026-01-20" },
  { id: 3, type: "Internship", title: "TechCorp Summer Intern", description: "Worked on backend microservices", link: "https://techcorp.com", date: "2025-06-01" },
];

export const moodTrendData = [
  { date: "Mar 1", score: 4 },
  { date: "Mar 3", score: 3 },
  { date: "Mar 5", score: 5 },
  { date: "Mar 7", score: 3 },
  { date: "Mar 9", score: 2 },
  { date: "Mar 11", score: 4 },
  { date: "Mar 13", score: 3 },
  { date: "Mar 15", score: 4 },
];

export const cgpaTrendData = [
  { semester: "Sem 1", cgpa: 7.2 },
  { semester: "Sem 2", cgpa: 7.5 },
  { semester: "Sem 3", cgpa: 7.8 },
  { semester: "Sem 4", cgpa: 8.1 },
  { semester: "Sem 5", cgpa: 7.9 },
  { semester: "Sem 6", cgpa: 8.2 },
];

export const riskDistributionData = [
  { name: "Safe", value: students.filter(s => s.riskLevel === "Safe").length, color: "hsl(142, 71%, 45%)" },
  { name: "Moderate", value: students.filter(s => s.riskLevel === "Moderate").length, color: "hsl(38, 92%, 50%)" },
  { name: "High", value: students.filter(s => s.riskLevel === "High").length, color: "hsl(0, 72%, 51%)" },
];

export const attendanceDistributionData = [
  { range: "90-100%", count: students.filter(s => s.attendance >= 90).length },
  { range: "80-89%", count: students.filter(s => s.attendance >= 80 && s.attendance < 90).length },
  { range: "70-79%", count: students.filter(s => s.attendance >= 70 && s.attendance < 80).length },
  { range: "60-69%", count: students.filter(s => s.attendance >= 60 && s.attendance < 70).length },
  { range: "<60%", count: students.filter(s => s.attendance < 60).length },
];

export const notifications: Notification[] = [
  { id: 1, role: "mentor", type: "alert", message: "High risk student detected: Akash Jain", time: "10 min ago" },
  { id: 2, role: "mentee", type: "reminder", message: "Don't forget to submit today's check-in", time: "1 hour ago" },
  { id: 3, role: "mentor", type: "leave", message: "Priya Patel submitted a leave request", time: "30 min ago" },
  { id: 4, role: "admin", type: "system", message: "Weekly risk analytics report generated", time: "Today" },
  { id: 5, role: "mentor", type: "sos", message: "SOS alert from Vivek Bhatt", time: "5 min ago" },
  { id: 6, role: "mentee", type: "meeting", message: "Weekly Progress Review tomorrow at 10 AM", time: "2 hours ago" },
  { id: 7, role: "mentee", type: "goal", message: "Goal deadline approaching: Complete One Internship", time: "Today" },
  { id: 8, role: "admin", type: "feedback", message: "New mentor feedback received", time: "1 hour ago" },
  { id: 9, role: "admin", type: "risk", message: "3 students moved to High risk category", time: "3 hours ago" },
  { id: 10, role: "mentor", type: "checkin", message: "4 mentees missed today's check-in", time: "45 min ago" },
];

export const otherDocuments: OtherDocument[] = [
  { id: 1, title: "Internship Certificate", description: "Summer internship at TechCorp", fileUrl: dummyPdf, uploadedAt: "2026-03-10" },
  { id: 2, title: "Medical Certificate", description: "Fitness certificate", fileUrl: dummyPdf, uploadedAt: "2026-03-05" },
];

export const feedbackEntries: FeedbackEntry[] = [
  { id: 1, mentorId: 1, rating: 5, comment: "Very supportive and helpful mentor. Always available for guidance.", date: "2026-03-01" },
  { id: 2, mentorId: 1, rating: 4, comment: "Great mentor, could improve on response time.", date: "2026-02-25" },
  { id: 3, mentorId: 2, rating: 5, comment: "Excellent career guidance and support.", date: "2026-03-05" },
  { id: 4, mentorId: 2, rating: 3, comment: "Good mentor but meetings could be more structured.", date: "2026-02-20" },
  { id: 5, mentorId: 3, rating: 4, comment: "Very knowledgeable and patient.", date: "2026-03-08" },
  { id: 6, mentorId: 3, rating: 5, comment: "Best mentor I've had. Very caring.", date: "2026-03-02" },
  { id: 7, mentorId: 4, rating: 4, comment: "Helpful with placement preparation.", date: "2026-03-10" },
  { id: 8, mentorId: 4, rating: 5, comment: "Amazing mentor, very approachable.", date: "2026-03-06" },
];

// Derived stats
export const mentorDashboardStats = {
  totalMentees: students.length,
  highRiskStudents: students.filter(s => s.riskLevel === "High").length,
  pendingLeaves: leaveRecords.filter(l => l.status === "Pending").length,
  unsubmittedCheckIns: students.filter(s => s.lastCheckIn < "2026-03-14").length,
};

export const adminDashboardStats = {
  totalStudents: students.length,
  totalMentors: mentors.length,
  averageCGPA: +(students.reduce((sum, s) => sum + s.cgpa, 0) / students.length).toFixed(2),
  studentsAtRisk: students.filter(s => s.riskLevel !== "Safe").length,
};
