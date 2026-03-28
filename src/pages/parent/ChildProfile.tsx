import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { parentApi } from "@/lib/api";
import { RiskBadge, DocBadge, LeaveBadge } from "@/components/StatusBadges";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Lightbulb, ExternalLink, Loader2, MessageSquare } from "lucide-react";

export default function ChildProfile() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.getChild(Number(id))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="animate-spin h-4 w-4" /> Loading...
    </div>
  );
  if (!data) return <p className="text-muted-foreground">Student not found.</p>;

  const { student, checkIns, leaveRecords, documents, skillEntries, healthInfo, mentorFeedback } = data;

  const moodTrendData = (checkIns || []).slice().reverse().map((c: any) => ({
    date: new Date(c.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: c.mood,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{student.name}</h1>
          <p className="text-muted-foreground">{student.department} • Semester {student.semester}</p>
        </div>
        <RiskBadge level={student.risk_level} className="text-sm px-4 py-1.5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Risk Level
          </h3>
          <p className="text-3xl font-bold">{student.risk_score}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {student.risk_level === "High"
              ? "Your child needs immediate attention. Please contact the mentor."
              : student.risk_level === "Moderate"
              ? "Your child needs closer monitoring."
              : "Your child is performing well."}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-warning" /> Mentor Recommendation
          </h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {student.risk_level === "High" && (
              <>
                <li>• Immediate one-on-one meeting with mentor scheduled</li>
                <li>• Parent involvement strongly encouraged</li>
                <li>• Peer support being arranged</li>
              </>
            )}
            {student.risk_level === "Moderate" && (
              <>
                <li>• Weekly check-in meetings ongoing</li>
                <li>• Short-term academic goals have been set</li>
              </>
            )}
            {student.risk_level === "Safe" && (
              <>
                <li>• Regular monitoring in place</li>
                <li>• Extracurricular activities encouraged</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {mentorFeedback?.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-primary" /> Mentor Feedback
          </h3>
          <div className="space-y-3">
            {mentorFeedback.map((fb: any, i: number) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50 border-l-4 border-primary/30">
                <p className="text-sm">{fb.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  — {fb.mentor_name} • {new Date(fb.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="academic">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="mood">Mood</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Current CGPA</h3>
          <p className="text-3xl font-bold font-display">{student.cgpa}</p>
          <div className="w-full bg-muted rounded-full h-3 mt-3">
            <div className="gradient-primary h-3 rounded-full" style={{ width: `${(student.cgpa / 10) * 100}%` }} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{student.cgpa} / 10.0</p>
        </TabsContent>

        <TabsContent value="attendance" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Attendance</h3>
          <div className="w-full bg-muted rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                student.attendance >= 75 ? "bg-success" : student.attendance >= 60 ? "bg-warning" : "bg-danger"
              }`}
              style={{ width: `${student.attendance}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{student.attendance}% overall attendance</p>
          {student.attendance < 75 && (
            <p className="text-sm text-danger mt-2 font-medium">
              ⚠ Attendance below required 75%. Please contact the mentor.
            </p>
          )}
        </TabsContent>

        <TabsContent value="mood" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Mood Trend</h3>
          {moodTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={moodTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[1, 5]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--secondary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No check-in data yet</p>}
          <p className="text-sm text-muted-foreground mt-2">Current mood: {student.mood}</p>
        </TabsContent>

        <TabsContent value="documents" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Documents</h3>
          <div className="space-y-3">
            {(documents || []).map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <span>{doc.title}</span>
                  <DocBadge status={doc.status} />
                </div>
                <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url, "_blank")}>
                  <ExternalLink className="h-3 w-3 mr-1" /> View
                </Button>
              </div>
            ))}
            {(!documents || documents.length === 0) && <p className="text-sm text-muted-foreground">No documents uploaded</p>}
          </div>
        </TabsContent>

        <TabsContent value="leave" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Leave History</h3>
          {leaveRecords?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Reason</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRecords.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">{l.from_date} to {l.to_date}</td>
                    <td className="py-2">{l.reason}</td>
                    <td className="py-2"><LeaveBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">No leave records</p>}
        </TabsContent>

        <TabsContent value="health" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Health Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Blood Group</span>
              <span className="font-medium">{healthInfo?.blood_group || student.blood_group || "N/A"}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Conditions</span>
              <span className="font-medium">{healthInfo?.chronic_conditions || student.chronic_conditions || "None"}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Emergency Contact</span>
              <span className="font-medium">{student.emergency_contact || "N/A"}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Hostel Status</span>
              <span className="font-medium">{student.hostel_status}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}