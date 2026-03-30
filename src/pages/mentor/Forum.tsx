import { useEffect, useState } from "react";
import { mentorApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pin, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Forum() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  // Create thread form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    mentorApi.getForumThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      await mentorApi.createForumThread({ title: newTitle, content: newContent });
      toast({ title: "Thread created successfully" });
      setNewTitle("");
      setNewContent("");
      // Refresh list
      const updated = await mentorApi.getForumThreads();
      setThreads(updated);
    } catch {
      toast({ title: "Error", description: "Failed to create thread", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (threadId: number) => {
    const content = replyText[threadId];
    if (!content?.trim()) return;
    try {
      await mentorApi.replyToThread(threadId, content);
      toast({ title: "Reply posted" });
      setReplyText(prev => ({ ...prev, [threadId]: "" }));
      // Refresh threads
      mentorApi.getForumThreads().then(setThreads);
    } catch {
      toast({ title: "Error", description: "Failed to post reply", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Discussion Forum</h1>
        <p className="text-muted-foreground">Collaborate with fellow mentors</p>
      </div>

      {/* Create Thread Form */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Create New Thread</h2>
        <form onSubmit={handleCreateThread} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              rows={1}
              className="font-semibold"
              required
            />
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="What's on your mind?"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={3}
              required
            />
          </div>
          <Button type="submit" disabled={creating} className="gradient-primary text-primary-foreground">
            {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting...</> : "Post Thread"}
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        {threads.map(thread => (
          <div key={thread.id} className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-2">
              {thread.pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0 mt-1" />}
              <div className="flex-1">
                <h3 className="font-semibold">{thread.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">By {thread.author_name} • {new Date(thread.created_at).toLocaleDateString()}</p>
                <p className="text-sm mt-3">{thread.content}</p>
                {thread.replies?.length > 0 && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-primary/20">
                    {thread.replies.map((reply: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm">{reply.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">— {reply.author} • {new Date(reply.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText[thread.id] || ""}
                    onChange={e => setReplyText(prev => ({ ...prev, [thread.id]: e.target.value }))}
                    rows={2} className="text-sm"
                  />
                  <Button size="sm" onClick={() => handleReply(thread.id)} className="self-end">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {threads.length === 0 && <p className="text-sm text-muted-foreground">No threads yet.</p>}
      </div>
    </div>
  );
}
