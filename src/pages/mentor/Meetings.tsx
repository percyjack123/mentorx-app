import { useEffect, useState } from "react";
import { mentorApi, type Meeting } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  useEffect(() => {
    mentorApi
      .getMeetings()
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newMeeting = await mentorApi.createMeeting({ title, date, time, meetingUrl });
      setMeetings((prev) => [newMeeting, ...prev]);
      toast({ title: "Meeting scheduled", description: `${title} on ${date}` });
      setTitle("");
      setDate("");
      setTime("");
      setMeetingUrl("");
    } catch {
      toast({
        title: "Error",
        description: "Failed to schedule meeting",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Meetings</h1>
        <p className="text-muted-foreground">Schedule and manage meetings</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Calendar
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="py-2 font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className={`py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  i + 1 === new Date().getDate() ? "gradient-primary text-primary-foreground" : ""
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={handleSchedule} className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold font-display flex items-center gap-2">
            <Plus className="h-4 w-4" /> Schedule Meeting
          </h3>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Meeting URL</Label>
            <Input
              id="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
          <Button type="submit" className="gradient-primary text-primary-foreground">
            Schedule
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Upcoming Meetings
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin h-4 w-4" /> Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-lg bg-accent/50 hover:shadow-md transition-all cursor-pointer"
                onClick={() => m.meeting_url && window.open(m.meeting_url, "_blank")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{m.title}</h4>
                    <span className="text-sm text-muted-foreground">
                      {m.date} at {m.time}
                    </span>
                  </div>
                  {m.meeting_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(m.meeting_url, "_blank");
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Join
                    </Button>
                  )}
                </div>
                {(m.action_items ?? []).length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">Action items:</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {m.action_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
            {meetings.length === 0 && (
              <p className="text-sm text-muted-foreground">No meetings scheduled</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}