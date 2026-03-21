import { StatsCard } from "@/components/StatsCard";
import { adminDashboardStats } from "@/data/mockData";
import { Users, GraduationCap, TrendingUp, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
        <p className="text-muted-foreground">Institution overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Students" value={adminDashboardStats.totalStudents} icon={<GraduationCap className="h-5 w-5 text-primary" />} gradient />
        <StatsCard title="Total Mentors" value={adminDashboardStats.totalMentors} icon={<Users className="h-5 w-5 text-primary" />} />
        <StatsCard title="Average CGPA" value={adminDashboardStats.averageCGPA} icon={<TrendingUp className="h-5 w-5 text-success" />} />
        <StatsCard title="Students at Risk" value={adminDashboardStats.studentsAtRisk} icon={<AlertTriangle className="h-5 w-5 text-danger" />} />
      </div>
    </div>
  );
}
