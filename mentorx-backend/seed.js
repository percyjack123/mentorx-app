// seed.js — Run with: node seed.js
// Requires: npm install pg bcryptjs dotenv
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const firstNames = ["Rahul","Priya","Arjun","Sneha","Vikram","Ananya","Karthik","Divya","Aditya","Meera","Rohan","Ishita","Siddharth","Kavya","Nikhil","Pooja","Amit","Neha","Varun","Shruti","Rajesh","Lakshmi","Gaurav","Rina","Tushar","Pallavi","Manish","Swati","Deepak","Anjali","Suresh","Bhavna","Ravi","Tanvi","Akash","Sonal","Vivek","Nisha","Harsh","Jyoti"];
const lastNames = ["Sharma","Patel","Kumar","Singh","Gupta","Reddy","Joshi","Verma","Nair","Iyer","Mehta","Das","Chopra","Saxena","Agarwal","Bhat","Rao","Malhotra","Banerjee","Pillai","Desai","Chatterjee","Tiwari","Kulkarni","Menon","Shah","Pandey","Mishra","Sinha","Kapoor","Dutta","Choudhury","Ghosh","Thakur","Jain","Sethi","Bhatt","Yadav","Agnihotri","Rajan"];
const departments = ["Computer Science","Electronics","Mechanical","Civil","Information Technology"];
const bloodGroups = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const moods = ["Happy","Neutral","Stressed","Sad","Anxious"];
const placements = ["Placed","Preparing","Not Started"];
const dummyPdf = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec=1) { return parseFloat((Math.random()*(max-min)+min).toFixed(dec)); }

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data (order matters for FK constraints)
    await client.query(`
      TRUNCATE notifications, sos_alerts, feedback_entries, documents, health_info,
        concerns, skill_entries, goal_tasks, goals, forum_replies, forum_threads,
        resources, meeting_students, meetings, leave_records, check_ins,
        students, mentors, users RESTART IDENTITY CASCADE
    `);

    const hash = await bcrypt.hash('password123', 10);

    // ── ADMIN ──
    const adminRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Admin User', 'admin@mentorx.edu', hash, 'admin']
    );

    // ── MENTORS (4) ──
    const mentorData = [
      { name: 'Dr. Suresh Menon',  email: 'suresh.menon@mentorx.edu',   dept: 'Computer Science' },
      { name: 'Dr. Kavitha Rao',   email: 'kavitha.rao@mentorx.edu',    dept: 'Electronics' },
      { name: 'Dr. Rajan Pillai',  email: 'rajan.pillai@mentorx.edu',   dept: 'Mechanical' },
      { name: 'Dr. Anjali Sharma', email: 'anjali.sharma@mentorx.edu',  dept: 'Information Technology' },
    ];
    const mentorIds = [];
    for (const m of mentorData) {
      const ur = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'mentor') RETURNING id`,
        [m.name, m.email, hash]
      );
      const mr = await client.query(
        `INSERT INTO mentors (user_id, department) VALUES ($1,$2) RETURNING id`,
        [ur.rows[0].id, m.dept]
      );
      mentorIds.push(mr.rows[0].id);
    }

    // ── STUDENTS (40) ──
    const distribution = [
      ...Array(22).fill('Safe'),
      ...Array(12).fill('Moderate'),
      ...Array(6).fill('High'),
    ];

    const studentIds = [];
    for (let i = 0; i < 40; i++) {
      const riskLevel = distribution[i];
      const name = `${firstNames[i]} ${lastNames[i]}`;
      const email = `student${i+1}@mentorx.edu`;

      const riskScore = riskLevel === 'Safe' ? randInt(0,29) : riskLevel === 'Moderate' ? randInt(30,64) : randInt(65,100);
      const cgpa = riskLevel === 'Safe' ? randFloat(7,10) : riskLevel === 'Moderate' ? randFloat(5,7.9) : randFloat(2,5.9);
      const attendance = riskLevel === 'Safe' ? randInt(80,100) : riskLevel === 'Moderate' ? randInt(60,84) : randInt(30,64);
      const mood = riskLevel === 'Safe' ? rand(['Happy','Neutral']) : riskLevel === 'Moderate' ? rand(['Neutral','Stressed']) : rand(['Stressed','Sad','Anxious']);
      const mentorId = mentorIds[Math.floor(i / 10)]; // 10 students per mentor
      const lastCheckIn = new Date(2026, 2, randInt(10, 20)).toISOString().split('T')[0];

      const ur = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'mentee') RETURNING id`,
        [name, email, hash]
      );

      const sr = await client.query(
        `INSERT INTO students (
          user_id, mentor_id, department, semester, cgpa, attendance,
          risk_level, risk_score, mood, placement_status, hostel_status,
          blood_group, chronic_conditions, insurance_info, emergency_contact, last_check_in
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [
          ur.rows[0].id, mentorId, rand(departments), randInt(3,7),
          Math.min(cgpa, 10), Math.min(attendance, 100),
          riskLevel, riskScore, mood, rand(placements),
          Math.random() > 0.4 ? 'Hosteller' : 'Day Scholar',
          rand(bloodGroups),
          Math.random() > 0.8 ? 'Asthma' : Math.random() > 0.9 ? 'Diabetes' : 'None',
          Math.random() > 0.5 ? 'Star Health Insurance' : 'None',
          `Father - 98${randInt(10000000, 99999999)}`,
          lastCheckIn
        ]
      );
      studentIds.push(sr.rows[0].id);

      // Health info
      await client.query(
        `INSERT INTO health_info (student_id, blood_group, chronic_conditions, insurance_info, emergency_contacts)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          sr.rows[0].id,
          rand(bloodGroups),
          Math.random() > 0.8 ? 'Asthma' : 'None',
          Math.random() > 0.5 ? 'Star Health Insurance' : 'None',
          JSON.stringify([{ label: 'Parent', value: `Father - 98${randInt(10000000,99999999)}` }])
        ]
      );

      // Documents
      await client.query(
        `INSERT INTO documents (student_id, title, description, file_url, doc_type, status)
         VALUES ($1,'Grade Report','Semester grade report',$2,'grade','Clean'),
                ($1,'Attendance Report','Attendance screenshot',$2,'attendance','Clean')`,
        [sr.rows[0].id, dummyPdf]
      );

      // Sample check-in
      await client.query(
        `INSERT INTO check_ins (student_id, mood, update_text, submitted_at)
         VALUES ($1,$2,'Everything is going well',$3)`,
        [sr.rows[0].id, randInt(1,5), lastCheckIn]
      );
    }

    // ── LEAVE RECORDS (sample) ──
    const leaveData = [
      { idx: 0, from: '2026-03-01', to: '2026-03-03', reason: 'Family function', status: 'Approved' },
      { idx: 1, from: '2026-03-05', to: '2026-03-06', reason: 'Medical', status: 'Pending' },
      { idx: 4, from: '2026-03-10', to: '2026-03-12', reason: 'Personal', status: 'Pending' },
      { idx: 7, from: '2026-03-08', to: '2026-03-09', reason: 'Fever', status: 'Pending' },
      { idx: 34, from: '2026-03-12', to: '2026-03-14', reason: 'Unspecified', status: 'Rejected' },
      { idx: 35, from: '2026-03-11', to: '2026-03-15', reason: 'Travel', status: 'Pending' },
    ];
    for (const l of leaveData) {
      await client.query(
        `INSERT INTO leave_records (student_id, from_date, to_date, reason, status)
         VALUES ($1,$2,$3,$4,$5)`,
        [studentIds[l.idx], l.from, l.to, l.reason, l.status]
      );
    }

    // ── MEETINGS ──
    const meetRes1 = await client.query(
      `INSERT INTO meetings (title, date, time, mentor_id, meeting_url, action_items)
       VALUES ('Weekly Progress Review','2026-03-16','10:00 AM',$1,'https://meet.google.com/abc-defg-hij',ARRAY['Review semester goals','Discuss attendance']) RETURNING id`,
      [mentorIds[0]]
    );
    for (const sid of studentIds.slice(0, 3)) {
      await client.query(`INSERT INTO meeting_students VALUES ($1,$2)`, [meetRes1.rows[0].id, sid]);
    }

    const meetRes2 = await client.query(
      `INSERT INTO meetings (title, date, time, mentor_id, meeting_url, action_items)
       VALUES ('Career Guidance Session','2026-03-17','2:00 PM',$1,'https://meet.google.com/klm-nopq-rst',ARRAY['Resume review','Internship prep']) RETURNING id`,
      [mentorIds[1]]
    );
    for (const sid of studentIds.slice(10, 12)) {
      await client.query(`INSERT INTO meeting_students VALUES ($1,$2)`, [meetRes2.rows[0].id, sid]);
    }

    // ── RESOURCES ──
    const adminUserId = adminRes.rows[0].id;
    await client.query(
      `INSERT INTO resources (title, description, type, url, uploaded_by) VALUES
       ('Data Structures Notes','Comprehensive notes on DS & Algorithms','file','#',$1),
       ('Placement Preparation Guide','Step-by-step guide for campus placements','link','https://example.com/placement',$1),
       ('Mental Health Resources','Guides for stress management and wellbeing','link','https://example.com/wellbeing',$1),
       ('Resume Template','Professional resume template for students','file','#',$1)`,
      [adminUserId]
    );

    // ── FORUM THREADS ──
    const mentorUserIds = [];
    for (const mid of mentorIds) {
      const res = await client.query(`SELECT user_id FROM mentors WHERE id = $1`, [mid]);
      mentorUserIds.push(res.rows[0].user_id);
    }

    const t1 = await client.query(
      `INSERT INTO forum_threads (title, content, author_id, pinned)
       VALUES ('How to improve student attendance?','I''ve noticed a trend of declining attendance in the 5th semester. What strategies have worked for others?',$1,true) RETURNING id`,
      [mentorUserIds[0]]
    );
    await client.query(
      `INSERT INTO forum_replies (thread_id, author_id, content) VALUES ($1,$2,'We started a buddy system that helped a lot.')`,
      [t1.rows[0].id, mentorUserIds[1]]
    );

    await client.query(
      `INSERT INTO forum_threads (title, content, author_id, pinned)
       VALUES ('Best practices for early intervention','What early warning signs do you look for in at-risk students?',$1,false)`,
      [mentorUserIds[3]]
    );

    // ── GOALS (for first student) ──
    const g1 = await client.query(
      `INSERT INTO goals (student_id, mentor_id, title, description, deadline, mentor_note, progress, completed)
       VALUES ($1,$2,'Improve CGPA to 8.0+','Focus on core subjects and complete all assignments','2026-06-30','Prioritize Data Structures and Algorithms.',50,false) RETURNING id`,
      [studentIds[0], mentorIds[0]]
    );
    await client.query(
      `INSERT INTO goal_tasks (goal_id, title, completed) VALUES
       ($1,'Assignments completed',true), ($1,'Midterm preparation',true),
       ($1,'Weekly study plan',false), ($1,'Project submission',false)`,
      [g1.rows[0].id]
    );

    const g2 = await client.query(
      `INSERT INTO goals (student_id, mentor_id, title, description, deadline, mentor_note, progress, completed)
       VALUES ($1,$2,'Learn React & TypeScript','Complete online course and build a project','2026-03-01','Great progress! Consider contributing to open source.',100,true) RETURNING id`,
      [studentIds[0], mentorIds[0]]
    );
    await client.query(
      `INSERT INTO goal_tasks (goal_id, title, completed) VALUES
       ($1,'Complete React course',true), ($1,'Complete TypeScript course',true),
       ($1,'Build portfolio project',true), ($1,'Deploy project',true)`,
      [g2.rows[0].id]
    );

    // ── SKILL ENTRIES (for first student) ──
    await client.query(
      `INSERT INTO skill_entries (student_id, type, title, description, link, entry_date) VALUES
       ($1,'Hackathon','CodeSprint 2026','Built an AI chatbot in 24 hours','https://devpost.com','2026-02-15'),
       ($1,'Certification','AWS Cloud Practitioner','Completed AWS certification exam','https://aws.amazon.com','2026-01-20'),
       ($1,'Internship','TechCorp Summer Intern','Worked on backend microservices','https://techcorp.com','2025-06-01')`,
      [studentIds[0]]
    );

    // ── FEEDBACK ENTRIES ──
    const feedbackData = [
      { mIdx: 0, rating: 5, comment: 'Very supportive and helpful mentor.' },
      { mIdx: 0, rating: 4, comment: 'Great mentor, could improve on response time.' },
      { mIdx: 1, rating: 5, comment: 'Excellent career guidance and support.' },
      { mIdx: 1, rating: 3, comment: 'Good mentor but meetings could be more structured.' },
      { mIdx: 2, rating: 4, comment: 'Very knowledgeable and patient.' },
      { mIdx: 2, rating: 5, comment: 'Best mentor I\'ve had. Very caring.' },
      { mIdx: 3, rating: 4, comment: 'Helpful with placement preparation.' },
      { mIdx: 3, rating: 5, comment: 'Amazing mentor, very approachable.' },
    ];
    for (let i = 0; i < feedbackData.length; i++) {
      const f = feedbackData[i];
      await client.query(
        `INSERT INTO feedback_entries (student_id, mentor_id, rating, comment)
         VALUES ($1,$2,$3,$4)`,
        [studentIds[i % 40], mentorIds[f.mIdx], f.rating, f.comment]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    console.log('\nTest credentials (all use password: password123)');
    console.log('  Admin:  admin@mentorx.edu');
    console.log('  Mentor: suresh.menon@mentorx.edu');
    console.log('  Mentee: student1@mentorx.edu');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();