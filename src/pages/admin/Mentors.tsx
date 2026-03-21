import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Mentors() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.getMentors()
      .then(setMentors)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Mentors</h1>
        <p className="text-muted-foreground">Manage institution mentors</p>
      </div>
      <div className="grid gap-4">
        {mentors.map(m => (
          <div key={m.id} onClick={() => navigate(`/admin/mentor/${m.id}`)}
            className="rounded-xl border bg-card p-6 hover:shadow-lg transition-all cursor-pointer">
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
                <p className="text-2xl font-bold font-display">{m.student_ids?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">mentees</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
