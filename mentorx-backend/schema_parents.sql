-- MentorX Schema ADDITIONS — run these in Supabase SQL Editor
-- These add the parent role to the existing schema

-- =====================
-- PARENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  relationship VARCHAR(50) DEFAULT 'Parent',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update users role CHECK constraint to include 'parent'
-- NOTE: In Supabase you may need to drop and recreate the constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'mentor', 'mentee', 'parent'));

-- Index for fast parent lookups
CREATE INDEX IF NOT EXISTS idx_parents_user ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_student ON parents(student_id);

-- =====================
-- SEED EXAMPLE PARENT
-- =====================
-- To create a test parent account (run after seeding students):
-- INSERT INTO users (name, email, password_hash, role)
-- VALUES ('Parent User', 'parent@mentorx.edu', '$2a$10$...hash...', 'parent')
-- RETURNING id;
-- Then: INSERT INTO parents (user_id, student_id) VALUES (<user_id>, 1);