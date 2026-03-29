-- MentorX: Mentor Request System Migration
-- Run this in your Supabase SQL Editor AFTER the existing schema

-- =====================
-- MENTOR REQUESTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS mentor_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  mentor_id INTEGER REFERENCES mentors(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate pending requests from the same student to the same mentor
  UNIQUE (student_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor ON mentor_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_student ON mentor_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status ON mentor_requests(status);

-- =====================
-- RESET TOKENS TABLE (for optional forgot-password flow)
-- =====================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);