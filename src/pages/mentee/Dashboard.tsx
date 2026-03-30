
import React, { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { RiskBadge } from "@/components/StatusBadges";
import { menteeApi, documentsApi, feedbackApi } from "@/lib/api";
import { BookOpen, TrendingUp, Award, Calendar, ExternalLink, Loader2, User, Trash2, MessageSquare, Star, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function MenteeDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mlRisk, setMlRisk] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);

  // Feedback form state
  const [rating, setRating] = useState<string>("");
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    Promise.all([
      menteeApi.getDashboard(),
      documentsApi.getMyDocuments()
    ])
      .then(([res, docRes]: [any, any[]]) => {
        setData(res);
        setDocs(docRes.slice(0, 3)); // Show only latest 3
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteDoc = async (id: number) => {
    try {
      await documentsApi.deleteDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSubmittingFeedback(true);
    try {
      await feedbackApi.submitFeedback({ rating: parseInt(rating), comment });
      toast({ title: "Feedback submitted", description: "Your feedback helps improve mentorship." });
      setRating("");
      setComment("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;
  if (error) return <div className="text-destructive text-sm p-4 rounded-lg border border-destructive/30 bg-destructive/5">Failed to load dashboard: {error}</div>;
  if (!data) return null;

  const { student, upcomingMeetings, moodTrend } = data;

  const moodData = (moodTrend || []).slice().reverse().map((c: any) => ({
    date: new Date(c.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: c.mood,
  }));

  const riskLevel = student?.risk_level || 'Safe';

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold font-display">Welcome back, {student?.name}!</h1>
        <p className="text-muted-foreground">Here's your academic overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Current CGPA"
          value={student?.cgpa ?? "—"}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          gradient
        />
        <StatsCard
          title="Attendance"
          value={student?.attendance != null ? `${student.attendance}%` : "—"}
          icon={<Calendar className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title="Placement Status"
          value={student?.placement_status ?? "—"}
          icon={<Award className="h-5 w-5 text-primary" />}
        />
        <div className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
              <p className="mt-1 text-3xl font-bold font-display">{student?.risk_score ?? 0}</p>
            </div>
            <RiskBadge level={riskLevel} className="text-sm px-3 py-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Mood Trend */}
          {moodData.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold font-display mb-4">Mood Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={moodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[1, 5]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Feedback Form */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold font-display">Mentor Feedback</h3>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <Select value={rating} onValueChange={setRating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} Stars</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea 
                  placeholder="Share your thoughts about your mentor..." 
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <Button type="submit" disabled={submittingFeedback || !rating} className="w-full sm:w-auto">
                {submittingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Feedback"}
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold font-display mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Upcoming Meetings
            </h3>
            <div className="space-y-3">
              {(upcomingMeetings || []).map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => m.meeting_url && window.open(m.meeting_url, "_blank")}
                >
                  <div>
                    <p className="font-medium text-xs">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground">{m.mentor_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium">{m.date}</p>
                    <p className="text-[10px] text-muted-foreground">{m.time}</p>
                  </div>
                </div>
              ))}
              {(!upcomingMeetings || upcomingMeetings.length === 0) && (
                <p className="text-sm text-muted-foreground">No upcoming meetings</p>
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold font-display mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Recent Documents
            </h3>
            <div className="space-y-3">
              {docs.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 group">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 rounded bg-background border">
                      <FileText className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs font-medium truncate">{doc.title}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(doc.file_url, "_blank")}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-danger hover:text-danger hover:bg-danger/10" onClick={() => handleDeleteDoc(doc.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {docs.length === 0 && (
                <p className="text-xs text-muted-foreground">No documents uploaded</p>
              )}
              <Button variant="link" className="w-full text-xs h-auto p-0 mt-2" onClick={() => window.location.href='/mentee/documents'}>
                View All Documents
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}