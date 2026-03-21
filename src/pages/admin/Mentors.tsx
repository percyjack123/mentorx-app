import { mentors, students } from "@/data/mockData";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Mentors() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Mentors</h1>
        <p className="text-muted-foreground">Manage institution mentors</p>
      </div>

      <div className="grid gap-4">
        {mentors.map(m => {
          const mentorStudents = students.filter(s => m.studentIds.includes(s.id));
          const highRisk = mentorStudents.filter(s => s.riskLevel === "High").length;
          return (
            <div
              key={m.id}
              onClick={() => navigate(`/admin/mentor/${m.id}`)}
              className="rounded-xl border bg-card p-6 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{m.name}</h3>
                    <p className="text-sm text-muted-foreground">{m.department}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-display">{m.studentIds.length}</p>
                  <p className="text-xs text-muted-foreground">mentees</p>
                  {highRisk > 0 && <p className="text-xs text-danger font-medium mt-1">{highRisk} high risk</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
