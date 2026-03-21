import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";

export default function RaiseConcern() {
  const [anonymous, setAnonymous] = useState(false);
  const [concern, setConcern] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Concern submitted", description: anonymous ? "Your concern has been submitted anonymously." : "Your concern has been submitted." });
    setConcern("");
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
          <Textarea id="concern" placeholder="Describe your concern in detail..." value={concern} onChange={e => setConcern(e.target.value)} rows={6} required />
        </div>

        <Button type="submit" className="gradient-primary text-primary-foreground">Submit Concern</Button>
      </form>
    </div>
  );
}
