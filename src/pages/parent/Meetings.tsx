import { useEffect, useState } from "react";
import { parentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ExternalLink, Loader2 } from "lucide-react";

export default function ParentMeetings() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.getMeetings()
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Meetings</h1>
        <p className="text-muted-foreground">View scheduled meetings for your child</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Calendar
        </h3>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
            <div key={d} className="py-2 font-medium text-muted-foreground">{d}</div>
          ))}
          {Array.from({ length: 31 }, (_, i) => (
            <div
              key={i}
              className={`py-2 rounded-lg ${
                i + 1 === new Date().getDate() ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Upcoming Meetings
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>
        ) : (
          <div className="space-y-3">
            {meetings.map(m => (
              <div key={m.id} className="p-4 rounded-lg bg-accent/50 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{m.title}</h4>
                    <span className="text-sm text-muted-foreground">{m.date} at {m.time}</span>
                  </div>
                  {m.meeting_url && (
                    <Button size="sm" variant="outline" onClick={() => window.open(m.meeting_url, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Join
                    </Button>
                  )}
                </div>
                {m.action_items?.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">Action items:</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {m.action_items.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </>
                )}
              </div>
            ))}
            {meetings.length === 0 && <p className="text-sm text-muted-foreground">No meetings scheduled</p>}
          </div>
        )}
      </div>
    </div>
  );
}