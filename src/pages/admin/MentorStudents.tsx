import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi, type MentorStudentsData, type Student } from "@/lib/api";
import { StatsCard } from "@/components/StatsCard";
import { RiskBadge } from "@/components/StatusBadges";
import { Users, ShieldCheck, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MentorStudents() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<MentorStudentsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminApi
      .getMentorStudents(Number(id))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading...
      </div>
    );
  if (!data) return <p className="text-muted-foreground">Mentor not found.</p>;

  const { mentor, students } = data;
  const safe = students.filter((s: Student) => s.risk_level === "Safe").length;
  const moderate = students.filter((s: Student) => s.risk_level === "Moderate").length;
  const high = students.filter((s: Student) => s.risk_level === "High").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/mentors")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display">{mentor.name}</h1>
          <p className="text-muted-foreground">
            {mentor.department} • {mentor.email}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={students.length}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title="Safe"
          value={safe}
          icon={<ShieldCheck className="h-5 w-5 text-success" />}
        />
        <StatsCard
          title="Moderate Risk"
          value={moderate}
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
        />
        <StatsCard
          title="High Risk"
          value={high}
          icon={<AlertTriangle className="h-5 w-5 text-danger" />}
        />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-3 px-4 font-medium">Name</th>
              <th className="text-left py-3 px-4 font-medium">CGPA</th>
              <th className="text-left py-3 px-4 font-medium">Attendance</th>
              <th className="text-left py-3 px-4 font-medium">Risk</th>
              <th className="text-left py-3 px-4 font-medium">Placement</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: Student) => (
              <tr
                key={s.id}
                className="border-b last:border-0 hover:bg-accent/30 transition-colors"
              >
                <td className="py-3 px-4 font-medium">{s.name}</td>
                <td className="py-3 px-4">{s.cgpa}</td>
                <td className="py-3 px-4">{s.attendance}%</td>
                <td className="py-3 px-4">
                  <RiskBadge level={s.risk_level} />
                </td>
                <td className="py-3 px-4">{s.placement_status}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No students assigned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}