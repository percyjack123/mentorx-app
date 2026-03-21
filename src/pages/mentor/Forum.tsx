import { useState } from "react";
import { forumThreads } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pin, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Forum() {
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  const handleReply = (threadId: number) => {
    toast({ title: "Reply posted" });
    setReplyText(prev => ({ ...prev, [threadId]: "" }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Discussion Forum</h1>
        <p className="text-muted-foreground">Collaborate with fellow mentors</p>
      </div>

      <div className="space-y-4">
        {forumThreads.map(thread => (
          <div key={thread.id} className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-2">
              {thread.pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0 mt-1" />}
              <div className="flex-1">
                <h3 className="font-semibold">{thread.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">By {thread.author} • {thread.date}</p>
                <p className="text-sm mt-3">{thread.content}</p>

                {thread.replies.length > 0 && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-primary/20">
                    {thread.replies.map((reply, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm">{reply.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">— {reply.author} • {reply.date}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText[thread.id] || ""}
                    onChange={e => setReplyText(prev => ({ ...prev, [thread.id]: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={() => handleReply(thread.id)} className="self-end">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
