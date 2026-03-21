import { useState } from "react";
import { useParams } from "react-router-dom";
import { students, cgpaTrendData, moodTrendData, leaveRecords, skillEntries, otherDocuments } from "@/data/mockData";
import { RiskBadge, DocBadge, LeaveBadge } from "@/components/StatusBadges";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Lightbulb, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { LeaveRecord } from "@/data/mockData";

export default function MenteeProfile() {
  const { id } = useParams();
  const student = students.find(s => s.id === Number(id)) || students[0];
  const initialLeaves = leaveRecords.filter(l => l.studentId === student.id);
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialLeaves);

  const handleLeaveAction = (leaveId: number, action: "Approved" | "Rejected") => {
    setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: action } : l));
    toast({ title: `Leave ${action}`, description: `Leave request has been ${action.toLowerCase()}.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{student.name}</h1>
          <p className="text-muted-foreground">{student.department} • Semester {student.semester}</p>
        </div>
        <RiskBadge level={student.riskLevel} className="text-sm px-4 py-1.5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-warning" /> Risk Prediction</h3>
          <p className="text-3xl font-bold">{student.riskScore}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {student.riskLevel === "High" ? "Immediate intervention recommended" : student.riskLevel === "Moderate" ? "Monitor closely" : "Student is performing well"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-warning" /> Intervention Suggestion</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {student.riskLevel === "High" && <><li>• Schedule immediate one-on-one meeting</li><li>• Contact parents/guardians</li><li>• Assign peer buddy for support</li></>}
            {student.riskLevel === "Moderate" && <><li>• Schedule weekly check-in meetings</li><li>• Set achievable short-term goals</li></>}
            {student.riskLevel === "Safe" && <><li>• Continue regular monitoring</li><li>• Encourage extracurricular activities</li></>}
          </ul>
        </div>
      </div>

      <Tabs defaultValue="academic">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="mood">Mood</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">CGPA Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cgpaTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semester" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 10]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="cgpa" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground mt-2">Current CGPA: {student.cgpa}</p>
        </TabsContent>

        <TabsContent value="attendance" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Attendance</h3>
          <div className="w-full bg-muted rounded-full h-4">
            <div className={`h-4 rounded-full transition-all ${student.attendance >= 75 ? "bg-success" : student.attendance >= 60 ? "bg-warning" : "bg-danger"}`} style={{ width: `${student.attendance}%` }} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{student.attendance}% overall attendance</p>
        </TabsContent>

        <TabsContent value="mood" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Mood Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={moodTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[1, 5]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--secondary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground mt-2">Current mood: {student.mood}</p>
        </TabsContent>

        <TabsContent value="documents" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Documents</h3>
          <div className="space-y-3">
            {student.documentFiles.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <span>{doc.name}</span>
                  <DocBadge status={doc.status} />
                </div>
                <Button size="sm" variant="outline" onClick={() => window.open(doc.fileUrl, "_blank")}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Open
                </Button>
              </div>
            ))}
          </div>
          {otherDocuments.length > 0 && (
            <>
              <h4 className="font-semibold mt-6 mb-3">Other Documents</h4>
              <div className="space-y-3">
                {otherDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <span className="font-medium text-sm">{doc.title}</span>
                      <p className="text-xs text-muted-foreground">{doc.description} • {doc.uploadedAt}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.open(doc.fileUrl, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Open
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="leave" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Leave History</h3>
          {leaves.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">Date</th><th className="text-left py-2">Reason</th><th className="text-left py-2">Status</th><th className="text-left py-2">Actions</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">{l.fromDate} to {l.toDate}</td>
                    <td className="py-2">{l.reason}</td>
                    <td className="py-2"><LeaveBadge status={l.status} /></td>
                    <td className="py-2">
                      {l.status === "Pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground h-7 text-xs" onClick={() => handleLeaveAction(l.id, "Approved")}>Approve</Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleLeaveAction(l.id, "Rejected")}>Reject</Button>
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">No leave records</p>}
        </TabsContent>

        <TabsContent value="health" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Health Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground block">Blood Group</span><span className="font-medium">{student.bloodGroup}</span></div>
            <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground block">Conditions</span><span className="font-medium">{student.chronicConditions}</span></div>
            <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground block">Emergency Contact</span><span className="font-medium">{student.emergencyContact}</span></div>
            <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground block">Status</span><span className="font-medium">{student.hostelStatus}</span></div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="rounded-xl border bg-card p-6 mt-4">
          <h3 className="font-semibold mb-4">Skill Log</h3>
          {skillEntries.map(entry => (
            <div key={entry.id} className="p-3 rounded-lg bg-muted/50 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{entry.title}</span>
                <span className="text-xs text-primary">{entry.type}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
