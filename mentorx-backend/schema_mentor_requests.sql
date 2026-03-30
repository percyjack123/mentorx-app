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
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)

-- 1. Ensure mentors.status column exists with proper default
ALTER TABLE mentors
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Active';

-- Add check constraint if not exists (Postgres doesn't have IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mentors_status_check'
  ) THEN
    ALTER TABLE mentors ADD CONSTRAINT mentors_status_check
      CHECK (status IN ('Pending', 'Active', 'Rejected'));
  END IF;
END$$;

-- Fix any NULL status rows from old seed
UPDATE mentors SET status = 'Active' WHERE status IS NULL;

-- 2. Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50),
  message    TEXT,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 3. Ensure password_reset_tokens table exists
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) UNIQUE NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Ensure mentor_requests table exists (with FK)
CREATE TABLE IF NOT EXISTS mentor_requests (
  id         SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  mentor_id  INTEGER REFERENCES mentors(id) ON DELETE CASCADE,
  status     VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, mentor_id)
);

-- 5. Ensure health_info has updated_at
ALTER TABLE health_info ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 6. Ensure leave_records has reviewed columns
ALTER TABLE leave_records ADD COLUMN IF NOT EXISTS reviewed_by  INTEGER REFERENCES mentors(id);
ALTER TABLE leave_records ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMP;
ALTER TABLE leave_records ADD COLUMN IF NOT EXISTS medical_doc_url TEXT;

-- 7. Ensure students has all needed fields
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch VARCHAR(255);

-- 8. Ensure parents table exists
CREATE TABLE IF NOT EXISTS parents (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  student_id   INTEGER REFERENCES students(id) ON DELETE CASCADE,
  relationship VARCHAR(50),
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parents_user    ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_student ON parents(student_id);

-- 9. Ensure users role check includes 'parent'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'mentor', 'mentee', 'parent'));

-- 10. Ensure concerns table exists
CREATE TABLE IF NOT EXISTS concerns (
  id         SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  anonymous  BOOLEAN DEFAULT FALSE,
  resolved   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);