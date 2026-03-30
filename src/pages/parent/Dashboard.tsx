import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { parentApi, type ParentDashboard } from "@/lib/api";
import { User, AlertTriangle, CalendarDays, BookOpen, Loader2 } from "lucide-react";
import { RiskBadge } from "@/components/StatusBadges";
import type { RiskLevel } from "@/data/mockData";

export default function ParentDashboard() {
  const [stats, setStats] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi
      .getDashboard()
      .then((data) => setStats(data as ParentDashboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading...
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Parent Dashboard</h1>
        <p className="text-muted-foreground">Overview of your child's academic progress</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="My Child"
          value={stats?.studentName ?? "—"}
          icon={<User className="h-5 w-5 text-primary" />}
          gradient
        />
        <StatsCard
          title="Risk Level"
          value={stats?.riskLevel ?? "Safe"}
          icon={<AlertTriangle className="h-5 w-5 text-danger" />}
        />
        <StatsCard
          title="Leave Requests"
          value={stats?.pendingLeaves ?? 0}
          icon={<CalendarDays className="h-5 w-5 text-warning" />}
        />
        <StatsCard
          title="Completed Check-ins"
          value={stats?.completedCheckIns ?? 0}
          icon={<BookOpen className="h-5 w-5 text-muted-foreground" />}
        />
      </div>

      {stats?.student && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display">Student Snapshot</h2>
            <RiskBadge level={stats.student.risk_level as RiskLevel} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Name", value: stats.student.name },
              { label: "Department", value: stats.student.department },
              { label: "Semester", value: stats.student.semester },
              { label: "CGPA", value: stats.student.cgpa },
              { label: "Attendance", value: `${stats.student.attendance}%` },
              { label: "Mood", value: stats.student.mood },
              { label: "Placement", value: stats.student.placement_status },
              { label: "Last Check-in", value: stats.student.last_check_in ?? "Never" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground block">{label}</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(stats?.recentAlerts ?? []).length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold font-display mb-4">Recent Alerts</h2>
          <div className="space-y-2">
            {stats!.recentAlerts.map((alert, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-sm ${
                  alert.type === "danger"
                    ? "border-danger/30 bg-danger/5 text-danger"
                    : alert.type === "warning"
                    ? "border-warning/30 bg-warning/5 text-warning"
                    : "border-border bg-muted/50"
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}