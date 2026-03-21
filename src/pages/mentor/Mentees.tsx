import { useEffect, useState } from "react";
import { mentorApi } from "@/lib/api";
import { RiskBadge } from "@/components/StatusBadges";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";

export default function Mentees() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    mentorApi.getMentees()
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">My Mentees</h1>
        <p className="text-muted-foreground">All assigned students</p>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">CGPA</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Attendance</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Risk Score</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Check-in</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium">{s.name}</td>
                  <td className="py-3 px-4">{s.cgpa}</td>
                  <td className="py-3 px-4">{s.attendance}%</td>
                  <td className="py-3 px-4"><RiskBadge level={s.risk_level} /></td>
                  <td className="py-3 px-4 text-muted-foreground">{s.last_check_in || "Never"}</td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/mentor/mentees/${s.id}`)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
