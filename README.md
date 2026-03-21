# MentorX Backend — Setup Guide

## Project Structure
```
mentorx-backend/
├── src/
│   ├── index.js              # Express app entry point
│   ├── db/index.js           # PostgreSQL (Supabase) connection
│   ├── middleware/auth.js    # JWT auth middleware
│   └── routes/
│       ├── auth.js           # Login, /me
│       ├── admin.js          # Admin-only routes
│       ├── mentor.js         # Mentor routes
│       └── mentee.js         # Mentee (student) routes
├── schema.sql                # Run in Supabase SQL Editor
├── seed.js                   # Seed 40 students + 4 mentors + admin
├── api.ts                    # Copy to frontend: src/lib/api.ts
├── .env.example
└── package.json
```

---

## Step 1 — Supabase Setup

1. Go to [https://supabase.com](https://supabase.com) → New Project
2. In the **SQL Editor**, paste the contents of `schema.sql` and run it
3. Get your connection string from:
   **Project Settings → Database → Connection string → URI**
   It looks like: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

---

## Step 2 — Backend Setup

```bash
cd mentorx-backend
npm install

# Create your .env file
cp .env.example .env
# Edit .env and paste your Supabase connection string as DATABASE_URL
# Also set a strong JWT_SECRET

# Seed the database
node seed.js

# Start the server
npm run dev       # development (with nodemon)
npm start         # production
```

---

## Step 3 — Frontend Setup

1. Copy `api.ts` to your frontend at `src/lib/api.ts`
2. Create `src/.env` (or `.env.local`) in your Vite frontend:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```
3. Update your Login page to use the real API:
   ```tsx
   import { authApi } from "@/lib/api";

   const handleLogin = async (e) => {
     e.preventDefault();
     const { user } = await authApi.login(email, password);
     if (user.role === 'admin') navigate('/admin');
     else if (user.role === 'mentor') navigate('/mentor');
     else navigate('/mentee');
   };
   ```

---

## Test Credentials
All accounts use password: `password123`

| Role   | Email                          |
|--------|-------------------------------|
| Admin  | admin@mentorx.edu             |
| Mentor | suresh.menon@mentorx.edu      |
| Mentee | student1@mentorx.edu          |

---

## API Endpoints Summary

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login (returns JWT) |
| GET | /api/auth/me | Get current user |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/dashboard | Dashboard stats |
| GET | /api/admin/mentors | All mentors |
| GET | /api/admin/mentors/:id/students | Mentor's students |
| GET | /api/admin/students | All students |
| POST | /api/admin/users | Create user |
| DELETE | /api/admin/users/:id | Delete user |
| PUT | /api/admin/students/:id/assign-mentor | Assign mentor |
| GET | /api/admin/analytics | Analytics |
| GET | /api/admin/feedback | All feedback |

### Mentor
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/mentor/dashboard | Dashboard stats |
| GET | /api/mentor/mentees | List mentees |
| GET | /api/mentor/mentees/:id | Full mentee profile |
| GET | /api/mentor/alerts | High-risk / tampered / SOS alerts |
| GET/POST | /api/mentor/meetings | Meetings |
| GET/POST | /api/mentor/resources | Resources |
| GET/POST | /api/mentor/forum | Forum threads |
| POST | /api/mentor/forum/:id/reply | Reply to thread |
| GET | /api/mentor/analytics | Analytics for mentees |
| PUT | /api/mentor/leaves/:id | Approve/Reject leave |
| POST | /api/mentor/mentees/:id/goals | Set goal for student |
| GET | /api/mentor/concerns | View concerns |

### Mentee
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/mentee/dashboard | Dashboard |
| GET | /api/mentee/profile | Student profile |
| POST | /api/mentee/checkin | Submit daily check-in |
| GET | /api/mentee/checkin/today | Check today's status |
| GET/POST | /api/mentee/leave | Leave history & apply |
| GET | /api/mentee/goals | Goals list |
| PUT | /api/mentee/goals/:goalId/tasks/:taskId | Toggle task |
| GET/POST | /api/mentee/skills | Skill log |
| GET | /api/mentee/resources | View resources |
| POST | /api/mentee/concern | Raise concern |
| GET/PUT | /api/mentee/health | Health info |
| POST | /api/mentee/sos | Trigger SOS |
| GET/POST/DELETE | /api/mentee/documents | Documents |
| POST | /api/mentee/feedback | Submit feedback |
| GET | /api/mentee/notifications | Notifications |
| PUT | /api/mentee/notifications/:id/read | Mark read |