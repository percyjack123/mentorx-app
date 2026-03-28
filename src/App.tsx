import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Layouts
import AdminLayout from "./layouts/AdminLayout";
import MentorLayout from "./layouts/MentorLayout";
import MenteeLayout from "./layouts/MenteeLayout";
import ParentLayout from "./layouts/ParentLayout";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminMentors from "./pages/admin/Mentors";
import MentorStudents from "./pages/admin/MentorStudents";
import AdminStudents from "./pages/admin/Students";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminFeedback from "./pages/admin/Feedback";

// Mentor pages
import MentorDashboard from "./pages/mentor/Dashboard";
import MentorMentees from "./pages/mentor/Mentees";
import MenteeProfile from "./pages/mentor/MenteeProfile";
import MentorAlerts from "./pages/mentor/Alerts";
import MentorMeetings from "./pages/mentor/Meetings";
import MentorResources from "./pages/mentor/Resources";
import MentorForum from "./pages/mentor/Forum";
import MentorAnalytics from "./pages/mentor/Analytics";

// Mentee pages
import MenteeDashboard from "./pages/mentee/Dashboard";
import DailyCheckin from "./pages/mentee/DailyCheckin";
import UploadDocuments from "./pages/mentee/UploadDocuments";
import LeaveApplication from "./pages/mentee/LeaveApplication";
import Goals from "./pages/mentee/Goals";
import SkillLog from "./pages/mentee/SkillLog";
import MenteeResources from "./pages/mentee/Resources";
import RaiseConcern from "./pages/mentee/RaiseConcern";
import HealthInfo from "./pages/mentee/HealthInfo";
import SOS from "./pages/mentee/SOS";
import MenteeFeedback from "./pages/mentee/Feedback";

// Parent pages
import ParentDashboard from "./pages/parent/Dashboard";
import MyChildren from "./pages/parent/Children";
import ChildProfile from "./pages/parent/ChildProfile";
import ParentNotifications from "./pages/parent/Notifications";
import ParentMeetings from "./pages/parent/Meetings";
import ParentResources from "./pages/parent/Resources";
import ParentAnnouncements from "./pages/parent/Announcements";
import ParentAnalytics from "./pages/parent/Analytics";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="mentors" element={<AdminMentors />} />
            <Route path="mentor/:id" element={<MentorStudents />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="feedback" element={<AdminFeedback />} />
          </Route>

          {/* Mentor Routes */}
          <Route path="/mentor" element={<MentorLayout />}>
            <Route index element={<MentorDashboard />} />
            <Route path="mentees" element={<MentorMentees />} />
            <Route path="mentees/:id" element={<MenteeProfile />} />
            <Route path="alerts" element={<MentorAlerts />} />
            <Route path="meetings" element={<MentorMeetings />} />
            <Route path="resources" element={<MentorResources />} />
            <Route path="forum" element={<MentorForum />} />
            <Route path="analytics" element={<MentorAnalytics />} />
          </Route>

          {/* Mentee Routes */}
          <Route path="/mentee" element={<MenteeLayout />}>
            <Route index element={<MenteeDashboard />} />
            <Route path="checkin" element={<DailyCheckin />} />
            <Route path="documents" element={<UploadDocuments />} />
            <Route path="leave" element={<LeaveApplication />} />
            <Route path="goals" element={<Goals />} />
            <Route path="skills" element={<SkillLog />} />
            <Route path="resources" element={<MenteeResources />} />
            <Route path="concern" element={<RaiseConcern />} />
            <Route path="health" element={<HealthInfo />} />
            <Route path="sos" element={<SOS />} />
            <Route path="feedback" element={<MenteeFeedback />} />
          </Route>

          {/* Parent Routes */}
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<ParentDashboard />} />
            <Route path="children" element={<MyChildren />} />
            <Route path="children/:id" element={<ChildProfile />} />
            <Route path="notifications" element={<ParentNotifications />} />
            <Route path="meetings" element={<ParentMeetings />} />
            <Route path="resources" element={<ParentResources />} />
            <Route path="announcements" element={<ParentAnnouncements />} />
            <Route path="analytics" element={<ParentAnalytics />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;