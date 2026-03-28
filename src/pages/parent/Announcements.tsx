import { useEffect, useState } from "react";
import { parentApi } from "@/lib/api";
import { Pin, Loader2, Bell } from "lucide-react";

export default function ParentAnnouncements() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.getAnnouncements()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="animate-spin h-4 w-4" /> Loading...
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Announcements & Updates</h1>
        <p className="text-muted-foreground">Important messages from your child's mentor</p>
      </div>
      <div className="space-y-4">
        {threads.map(thread => (
          <div key={thread.id} className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-2">
              {thread.pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0 mt-1" />}
              <div className="flex-1">
                <h3 className="font-semibold">{thread.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Posted by {thread.author_name} • {new Date(thread.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm mt-3">{thread.content}</p>
                {thread.replies?.length > 0 && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-primary/20">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Mentor responses:</p>
                    {thread.replies.map((reply: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm">{reply.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          — {reply.author} • {new Date(reply.date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Bell className="h-3 w-3" />
                  <span>Read-only announcement. Contact the mentor directly for queries.</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {threads.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
      </div>
    </div>
  );
}