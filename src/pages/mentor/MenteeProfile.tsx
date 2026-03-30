import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { mentorApi } from "@/lib/api";
import type { MenteeProfileData, LeaveRecord, CheckIn, Document, SkillEntry, FeedbackEntry } from "@/lib/api";
import { RiskBadge, DocBadge, LeaveBadge } from "@/components/StatusBadges";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Lightbulb, ExternalLink, Loader2, Star, MessageSquare, Award } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DocumentStatus, LeaveStatus } from "@/data/mockData";

export default function MenteeProfile() {
  const { id } = useParams();
  const [data, setData] = useState<MenteeProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    mentorApi
      .getMentee(Number(id))
      .then((res) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleLeaveAction = async (leaveId: number, status: "Approved" | "Rejected") => {
    try {
      await mentorApi.updateLeaveStatus(leaveId, status as LeaveStatus);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          leaveRecords: prev.leaveRecords.map((l: LeaveRecord) =>
            l.id === leaveId ? { ...l, status } : l
          ),
        };
      });
      toast({ title: `Leave ${status}` });
    } catch {
      toast({ title: "Error", description: "Failed to update leave", variant: "destructive" });
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading...
      </div>
    );
  if (!data) return <p className="text-muted-foreground">Student not found.</p>;

  const { student, checkIns, leaveRecords, documents, skillEntries, healthInfo, feedback } = data;

  const moodTrendData = (checkIns ?? [])
    .slice()
    .reverse()
    .map((c: CheckIn) => ({
      date: new Date(c.submitted_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      score: c.mood,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{student.name}</h1>
          <p className="text-muted-foreground">
            {student.department} • Semester {student.semester}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Placement</p>
            <p className={`text-sm font-bold ${student.placement_status === 'Placed' ? 'text-success' : 'text-warning'}`}>
              {student.placement_status}
            </p>
          </div>
          <RiskBadge level={student.risk_level} className="text-sm px-4 py-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Risk Prediction
          </h3>
          <p className="text-3xl font-bold">{student.risk_score}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {student.risk_level === "High"
              ? "Immediate intervention recommended"
              : student.risk_level === "Moderate"
              ? "Monitor closely"
              : "Student is performing well"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-warning" /> Intervention Suggestion
          </h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {student.risk_level === "High" && (
              <>
                <li>• Schedule immediate one-on-one meeting</li>
                <li>• Contact parents/guardians</li>
                <li>• Assign peer buddy</li>
              </>
            )}
            {student.risk_level === "Moderate" && (
              <>
                <li>• Schedule weekly check-in meetings</li>
                <li>• Set achievable short-term goals</li>
              </>
            )}
            {student.risk_level === "Safe" && (
              <>
                <li>• Continue regular monitoring</li>
                <li>• Encourage extracurricular activities</li>
              </>
            )}
          </ul>
        </div>
      </div>

      <Tabs defaultValue="academic">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="mood">Mood</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="rounded-xl border bg-card p-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Current CGPA</h3>
              <p className="text-3xl font-bold font-display">{student.cgpa}</p>
              <div className="w-full bg-muted rounded-full h-3 mt-3">
                <div
                  className="gradient-primary h-3 rounded-full"
                  style={{ width: `${(student.cgpa / 10) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{student.cgpa} / 10.0</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Placement Status
              </h3>
              <p className="text-2xl font-bold">{student.placement_status}</p>
              <p className="text-xs text-muted-foreground mt-1">Updated via academic records</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Attendance</h3>
          <div className="w-full bg-muted rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                student.attendance >= 75
                  ? "bg-success"
                  : student.attendance >= 60
                  ? "bg-warning"
                  : "bg-danger"
              }`}
              style={{ width: `${student.attendance}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {student.attendance}% overall attendance
          </p>
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
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No check-in data yet</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">Current mood: {student.mood}</p>
        </TabsContent>

        <TabsContent value="documents" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Documents</h3>
          <div className="space-y-3">
            {(documents ?? []).map((doc: Document) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span>{doc.title}</span>
                  <DocBadge status={doc.status as DocumentStatus} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(doc.file_url, "_blank")}
                >
                  <ExternalLink className="h-3 w-3 mr-1" /> Open
                </Button>
              </div>
            ))}
            {(!documents || documents.length === 0) && (
              <p className="text-sm text-muted-foreground">No documents uploaded</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leave" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Leave History</h3>
          {(leaveRecords ?? []).length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Reason</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRecords.map((l: LeaveRecord) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">
                      {l.from_date} to {l.to_date}
                    </td>
                    <td className="py-2">{l.reason}</td>
                    <td className="py-2">
                      <LeaveBadge status={l.status} />
                    </td>
                    <td className="py-2">
                      {l.status === "Pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90 text-success-foreground h-7 text-xs"
                            onClick={() => handleLeaveAction(l.id, "Approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => handleLeaveAction(l.id, "Rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No leave records</p>
          )}
        </TabsContent>

        <TabsContent value="health" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Health Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Blood Group</span>
              <span className="font-medium">
                {healthInfo?.blood_group ?? student.blood_group ?? "N/A"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Conditions</span>
              <span className="font-medium">
                {healthInfo?.chronic_conditions ?? student.chronic_conditions ?? "None"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Emergency Contact</span>
              <span className="font-medium">{student.emergency_contact ?? "N/A"}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block">Status</span>
              <span className="font-medium">{student.hostel_status ?? "N/A"}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Skill Log</h3>
          {(skillEntries ?? []).map((entry: SkillEntry) => (
            <div key={entry.id} className="p-3 rounded-lg bg-muted/50 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{entry.title}</span>
                <span className="text-xs text-primary">{entry.type}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
            </div>
          ))}
          {(!skillEntries || skillEntries.length === 0) && (
            <p className="text-sm text-muted-foreground">No skill entries</p>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="rounded-xl border bg-card p-6 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-warning fill-warning" />
            <h3 className="font-semibold font-display">Feedback Received</h3>
          </div>
          <div className="space-y-4">
            {(feedback ?? []).map((f: FeedbackEntry) => (
              <div key={f.id} className="p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${
                        s <= f.rating ? "fill-warning text-warning" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                  <span className="text-xs font-semibold ml-2">{f.rating}/5</span>
                </div>
                <p className="text-sm italic">"{f.comment}"</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {(!feedback || feedback.length === 0) && (
              <p className="text-sm text-muted-foreground">No feedback received from this student yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}