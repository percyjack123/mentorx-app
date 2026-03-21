import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { menteeApi } from "@/lib/api";

const emojis = [
  { emoji: "😊", label: "Happy", value: 5 },
  { emoji: "😐", label: "Neutral", value: 4 },
  { emoji: "😟", label: "Stressed", value: 3 },
  { emoji: "😢", label: "Sad", value: 2 },
  { emoji: "😰", label: "Anxious", value: 1 },
];

export default function DailyCheckin() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [update, setUpdate] = useState("");
  const [academicProgress, setAcademicProgress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    menteeApi.getTodayCheckin()
      .then(({ submitted }) => setSubmitted(submitted))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) return;
    setLoading(true);
    try {
      await menteeApi.submitCheckin({ mood: selectedMood, update, academicProgress });
      setSubmitted(true);
      toast({ title: "Check-in submitted!", description: "Your daily check-in has been recorded." });
    } catch {
      toast({ title: "Error", description: "Failed to submit check-in", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Daily Check-in</h1>
        <p className="text-muted-foreground">How are you doing today?</p>
      </div>

      {!submitted && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm font-medium">Check-in pending. Please update before 8 PM.</p>
        </div>
      )}

      {!submitted ? (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">How are you feeling?</Label>
            <div className="flex gap-3">
              {emojis.map(e => (
                <button key={e.value} type="button" onClick={() => setSelectedMood(e.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${selectedMood === e.value ? "border-primary bg-accent" : "border-transparent bg-muted"}`}>
                  <span className="text-3xl">{e.emoji}</span>
                  <span className="text-xs text-muted-foreground">{e.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="update">Short Update</Label>
            <Textarea id="update" placeholder="How's your day going?" value={update} onChange={e => setUpdate(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="academic">Academic Progress</Label>
            <Textarea id="academic" placeholder="Any academic updates or achievements?" value={academicProgress} onChange={e => setAcademicProgress(e.target.value)} rows={3} />
          </div>
          <Button type="submit" className="gradient-primary text-primary-foreground" disabled={selectedMood === null || loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Check-in"}
          </Button>
        </form>
      ) : (
        <div className="rounded-xl border border-success/50 bg-success/10 p-4">
          <p className="text-sm font-medium text-success">✓ Today's check-in has been submitted successfully!</p>
        </div>
      )}
    </div>
  );
}
