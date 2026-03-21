import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Loader2 } from "lucide-react";
import { menteeApi } from "@/lib/api";

export default function RaiseConcern() {
  const [anonymous, setAnonymous] = useState(false);
  const [concern, setConcern] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await menteeApi.submitConcern({ content: concern, anonymous });
      toast({
        title: "Concern submitted",
        description: anonymous ? "Your concern has been submitted anonymously." : "Your concern has been submitted.",
      });
      setConcern("");
      setAnonymous(false);
    } catch {
      toast({ title: "Error", description: "Failed to submit concern", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Raise a Concern</h1>
        <p className="text-muted-foreground">Share your concerns with your mentor</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-accent-foreground" />
            <div>
              <Label htmlFor="anonymous" className="text-sm font-medium">Submit Anonymously</Label>
              <p className="text-xs text-muted-foreground">Your identity will be hidden from the mentor</p>
            </div>
          </div>
          <Switch id="anonymous" checked={anonymous} onCheckedChange={setAnonymous} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="concern">Your Concern</Label>
          <Textarea
            id="concern"
            placeholder="Describe your concern in detail..."
            value={concern}
            onChange={e => setConcern(e.target.value)}
            rows={6}
            required
          />
        </div>

        <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Concern"}
        </Button>
      </form>
    </div>
  );
}
