````markdown
# MentorX – AI-Powered Student Mentorship Platform

## Overview

MentorX is a full-stack mentorship and student wellness platform designed to help educational institutions connect students with mentors, track progress, monitor well-being, and provide timely intervention when students require support.

The platform enables administrators, mentors, and students to collaborate through a centralized system featuring mentorship management, goal tracking, analytics, health monitoring, resource sharing, and SOS escalation workflows.

---

## Problem Statement

Educational institutions often struggle to provide personalized mentorship at scale. Student concerns, academic challenges, mental health issues, and career guidance requests are frequently scattered across multiple systems.

MentorX addresses this challenge by providing a unified platform that:

- Connects students with assigned mentors
- Tracks student progress and goals
- Monitors wellness through daily check-ins
- Provides analytics and risk alerts
- Enables resource sharing and collaboration
- Facilitates rapid escalation through SOS workflows

---

## Key Features

### Student (Mentee) Portal

- Daily wellness check-ins
- Goal and task tracking
- Leave application management
- Skill development logs
- Document management
- Resource access
- Concern reporting
- Health information management
- Emergency SOS support
- Feedback submission

### Mentor Dashboard

- Assigned mentee management
- Student performance monitoring
- High-risk student alerts
- Meeting scheduling
- Goal assignment and tracking
- Resource publishing
- Discussion forums
- Leave approval workflow
- Analytics dashboard
- Concern management

### Admin Dashboard

- User management
- Mentor assignment system
- Student allocation
- Institutional analytics
- Feedback monitoring
- Platform administration

---

## System Architecture

```text
Frontend (React + TypeScript)
            │
            ▼
REST API Layer (Node.js + Express)
            │
            ▼
Authentication Layer (JWT)
            │
            ▼
PostgreSQL Database (Supabase)
````

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite

### Backend

* Node.js
* Express.js
* JWT Authentication

### Database

* PostgreSQL
* Supabase

### Additional Tools

* REST APIs
* Role-Based Access Control (RBAC)

---

## Database Design

The system supports:

* Students
* Mentors
* Administrators
* Goals & Tasks
* Leave Requests
* Resources
* Forums
* Feedback
* Notifications
* SOS Events
* Health Records

---

## API Highlights

### Authentication

* Secure JWT login
* Protected routes
* Role-based authorization

### Admin Services

* User lifecycle management
* Mentor assignment workflows
* Analytics and reporting

### Mentor Services

* Student monitoring
* Goal management
* Resource publishing
* Forum participation

### Student Services

* Wellness tracking
* Skill logging
* Leave applications
* Feedback submission

---

## Future Enhancements

* AI-powered mentor recommendation engine
* Sentiment analysis for student wellness
* Attendance prediction models
* Career pathway recommendations
* Real-time chat and video mentoring
* Mobile application support

---

## Contributors

* Sahithi Jalaparti
* Saumya
* Snigdha
* Supriya
* Aryan
* Keshav

---

## License

MIT License

```
```
