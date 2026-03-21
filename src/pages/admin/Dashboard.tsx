import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { adminApi } from "@/lib/api";
import { Users, GraduationCap, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
        <p className="text-muted-foreground">Institution overview</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Students" value={stats?.totalStudents ?? 0} icon={<GraduationCap className="h-5 w-5 text-primary" />} gradient />
        <StatsCard title="Total Mentors" value={stats?.totalMentors ?? 0} icon={<Users className="h-5 w-5 text-primary" />} />
        <StatsCard title="Average CGPA" value={stats?.averageCGPA ?? 0} icon={<TrendingUp className="h-5 w-5 text-success" />} />
        <StatsCard title="Students at Risk" value={stats?.studentsAtRisk ?? 0} icon={<AlertTriangle className="h-5 w-5 text-danger" />} />
      </div>
    </div>
  );
}
