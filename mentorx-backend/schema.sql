-- MentorX Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'mentor', 'mentee')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- MENTORS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS mentors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  department VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- STUDENTS (MENTEES) TABLE
-- =====================
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  mentor_id INTEGER REFERENCES mentors(id) ON DELETE SET NULL,
  department VARCHAR(255),
  semester INTEGER DEFAULT 1,
  cgpa DECIMAL(4,2) DEFAULT 0.0,
  attendance INTEGER DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'Safe' CHECK (risk_level IN ('Safe', 'Moderate', 'High')),
  risk_score INTEGER DEFAULT 0,
  mood VARCHAR(20) DEFAULT 'Neutral' CHECK (mood IN ('Happy', 'Neutral', 'Stressed', 'Sad', 'Anxious')),
  placement_status VARCHAR(20) DEFAULT 'Not Started' CHECK (placement_status IN ('Placed', 'Preparing', 'Not Started')),
  hostel_status VARCHAR(20) DEFAULT 'Day Scholar' CHECK (hostel_status IN ('Hosteller', 'Day Scholar')),
  blood_group VARCHAR(5),
  chronic_conditions TEXT DEFAULT 'None',
  insurance_info TEXT DEFAULT 'None',
  emergency_contact TEXT,
  last_check_in DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- DAILY CHECK-INS
-- =====================
CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  update_text TEXT,
  academic_progress TEXT,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- LEAVE APPLICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS leave_records (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Approved', 'Pending', 'Rejected')),
  medical_doc_url TEXT,
  reviewed_by INTEGER REFERENCES mentors(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- MEETINGS
-- =====================
CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  mentor_id INTEGER REFERENCES mentors(id) ON DELETE CASCADE,
  meeting_url TEXT,
  action_items TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_students (
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, student_id)
);

-- =====================
-- RESOURCES
-- =====================
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'link' CHECK (type IN ('link', 'file')),
  url TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- FORUM THREADS
-- =====================
CREATE TABLE IF NOT EXISTS forum_threads (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- GOALS
-- =====================
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  mentor_id INTEGER REFERENCES mentors(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline DATE,
  mentor_note TEXT,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_tasks (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE
);

-- =====================
-- SKILL LOG
-- =====================
CREATE TABLE IF NOT EXISTS skill_entries (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('Internship', 'Hackathon', 'Certification')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  link TEXT,
  entry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- CONCERNS
-- =====================
CREATE TABLE IF NOT EXISTS concerns (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- HEALTH INFO
-- =====================
CREATE TABLE IF NOT EXISTS health_info (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  blood_group VARCHAR(5),
  chronic_conditions TEXT DEFAULT 'None',
  insurance_info TEXT,
  emergency_contacts JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- SOS ALERTS
-- =====================
CREATE TABLE IF NOT EXISTS sos_alerts (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- DOCUMENTS
-- =====================
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  doc_type VARCHAR(50) DEFAULT 'other',
  status VARCHAR(20) DEFAULT 'Clean' CHECK (status IN ('Clean', 'Suspicious', 'Tampered')),
  suspicion_score INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- FEEDBACK
-- =====================
CREATE TABLE IF NOT EXISTS feedback_entries (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  mentor_id INTEGER REFERENCES mentors(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- NOTIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_students_mentor ON students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_student ON check_ins(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_student ON leave_records(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_goals_student ON goals(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);