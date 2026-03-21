import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Star, Loader2 } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";

export default function Feedback() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getFeedback()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  const avgRating = entries.length ? +(entries.reduce((s, f) => s + f.rating, 0) / entries.length).toFixed(1) : 0;
  const mentorsReviewed = new Set(entries.map(f => f.mentor_id)).size;

  // Group by mentor
  const byMentor = entries.reduce((acc: any, f) => {
    if (!acc[f.mentor_id]) acc[f.mentor_id] = { name: f.mentor_name, department: f.department, entries: [] };
    acc[f.mentor_id].entries.push(f);
    return acc;
  }, {});

  const mentorRatings = Object.values(byMentor).map((m: any) => ({
    ...m,
    avgRating: +(m.entries.reduce((s: number, e: any) => s + e.rating, 0) / m.entries.length).toFixed(1),
    reviewCount: m.entries.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Feedback Analytics</h1>
        <p className="text-muted-foreground">Anonymous mentor feedback overview</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Average Rating" value={`${avgRating} / 5`} icon={<Star className="h-5 w-5 text-warning" />} gradient />
        <StatsCard title="Total Feedback" value={entries.length} icon={<Star className="h-5 w-5 text-primary" />} />
        <StatsCard title="Mentors Reviewed" value={mentorsReviewed} icon={<Star className="h-5 w-5 text-secondary" />} />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold font-display">Mentor Ratings</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left py-3 px-4 font-medium">Mentor</th>
            <th className="text-left py-3 px-4 font-medium">Department</th>
            <th className="text-left py-3 px-4 font-medium">Avg Rating</th>
            <th className="text-left py-3 px-4 font-medium">Reviews</th>
          </tr></thead>
          <tbody>
            {mentorRatings.map((m: any, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                <td className="py-3 px-4 font-medium">{m.name}</td>
                <td className="py-3 px-4">{m.department}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= Math.round(m.avgRating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />)}
                    <span className="ml-1">{m.avgRating}</span>
                  </div>
                </td>
                <td className="py-3 px-4">{m.reviewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4">Anonymous Comments</h3>
        <div className="space-y-4">
          {entries.map(f => (
            <div key={f.id} className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{f.mentor_name}</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= f.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />)}
                </div>
              </div>
              <p className="text-sm">{f.comment}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(f.created_at).toLocaleDateString()} • Anonymous</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
