import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { mentorApi } from "@/lib/api";
import { Users, AlertTriangle, CalendarDays, CheckCircle, Loader2 } from "lucide-react";

export default function MentorDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mentorApi.getDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Mentor Dashboard</h1>
        <p className="text-muted-foreground">Overview of your mentees</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Mentees" value={stats?.totalMentees ?? 0} icon={<Users className="h-5 w-5 text-primary" />} gradient />
        <StatsCard title="High Risk Students" value={stats?.highRiskStudents ?? 0} icon={<AlertTriangle className="h-5 w-5 text-danger" />} />
        <StatsCard title="Pending Leaves" value={stats?.pendingLeaves ?? 0} icon={<CalendarDays className="h-5 w-5 text-warning" />} />
        <StatsCard title="Unsubmitted Check-ins" value={stats?.unsubmittedCheckIns ?? 0} icon={<CheckCircle className="h-5 w-5 text-muted-foreground" />} />
      </div>
    </div>
  );
}
