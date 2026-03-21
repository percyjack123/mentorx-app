import { useState } from "react";
import { meetings } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Meetings() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Meeting scheduled", description: `${title} on ${date}` });
    setTitle(""); setDate(""); setTime("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Meetings</h1>
        <p className="text-muted-foreground">Schedule and manage meetings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display mb-4 flex items-center gap-2"><Calendar className="h-4 w-4" /> Calendar</h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d} className="py-2 font-medium text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <div key={i} className={`py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors ${i + 1 === 15 ? "gradient-primary text-primary-foreground" : i + 1 === 16 || i + 1 === 17 || i + 1 === 18 ? "bg-primary/10 text-primary" : ""}`}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleSchedule} className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold font-display flex items-center gap-2"><Plus className="h-4 w-4" /> Schedule Meeting</h3>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="gradient-primary text-primary-foreground">Schedule</Button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> Upcoming Meetings</h3>
        <div className="space-y-3">
          {meetings.map(m => (
            <div
              key={m.id}
              className="p-4 rounded-lg bg-accent/50 hover:shadow-md transition-all cursor-pointer"
              onClick={() => window.open(m.meetingUrl, "_blank")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{m.title}</h4>
                  <span className="text-sm text-muted-foreground">{m.date} at {m.time}</span>
                </div>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); window.open(m.meetingUrl, "_blank"); }}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Join Meeting
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Action items:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside">
                {m.actionItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
