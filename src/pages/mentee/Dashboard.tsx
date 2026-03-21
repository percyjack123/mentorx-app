import { StatsCard } from "@/components/StatsCard";
import { RiskBadge } from "@/components/StatusBadges";
import { students, moodTrendData, meetings } from "@/data/mockData";
import { BookOpen, TrendingUp, Award, Calendar, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

const student = students[0];

export default function MenteeDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Welcome back, {student.name}!</h1>
        <p className="text-muted-foreground">Here's your academic overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Current CGPA" value={student.cgpa} icon={<TrendingUp className="h-5 w-5 text-primary" />} gradient />
        <StatsCard title="Attendance" value={`${student.attendance}%`} icon={<Calendar className="h-5 w-5 text-primary" />} />
        <StatsCard title="Placement Status" value={student.placementStatus} icon={<Award className="h-5 w-5 text-primary" />} />
        <div className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
              <p className="mt-1 text-3xl font-bold font-display">{student.riskScore}</p>
            </div>
            <RiskBadge level={student.riskLevel} className="text-sm px-3 py-1" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-2">CGPA Progress</h3>
        <div className="w-full bg-muted rounded-full h-3">
          <div className="gradient-primary h-3 rounded-full transition-all duration-500" style={{ width: `${(student.cgpa / 10) * 100}%` }} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">{student.cgpa} / 10.0</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4">Mood Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={moodTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[1, 5]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Upcoming Meetings</h3>
        <div className="space-y-3">
          {meetings.filter(m => m.studentIds.includes(student.id)).map(m => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:shadow-md cursor-pointer transition-all"
              onClick={() => window.open(m.meetingUrl, "_blank")}
            >
              <div>
                <p className="font-medium text-sm">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.mentorName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{m.date}</p>
                  <p className="text-xs text-muted-foreground">{m.time}</p>
                </div>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); window.open(m.meetingUrl, "_blank"); }}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Join
                </Button>
              </div>
            </div>
          ))}
          {meetings.filter(m => m.studentIds.includes(student.id)).length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming meetings</p>
          )}
        </div>
      </div>
    </div>
  );
}
