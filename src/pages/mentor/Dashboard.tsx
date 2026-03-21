import { StatsCard } from "@/components/StatsCard";
import { mentorDashboardStats } from "@/data/mockData";
import { Users, AlertTriangle, CalendarDays, CheckCircle } from "lucide-react";

export default function MentorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Mentor Dashboard</h1>
        <p className="text-muted-foreground">Overview of your mentees</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Mentees" value={mentorDashboardStats.totalMentees} icon={<Users className="h-5 w-5 text-primary" />} gradient />
        <StatsCard title="High Risk Students" value={mentorDashboardStats.highRiskStudents} icon={<AlertTriangle className="h-5 w-5 text-danger" />} />
        <StatsCard title="Pending Leaves" value={mentorDashboardStats.pendingLeaves} icon={<CalendarDays className="h-5 w-5 text-warning" />} />
        <StatsCard title="Unsubmitted Check-ins" value={mentorDashboardStats.unsubmittedCheckIns} icon={<CheckCircle className="h-5 w-5 text-muted-foreground" />} />
      </div>
    </div>
  );
}
