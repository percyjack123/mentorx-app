import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { menteeApi } from "@/lib/api";

export default function MenteeFeedback() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      await menteeApi.submitFeedback({ rating, comment: feedback });
      setSubmitted(true);
      toast({ title: "Feedback submitted", description: "Thank you for your anonymous feedback." });
      setRating(0);
      setFeedback("");
    } catch {
      toast({ title: "Error", description: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Feedback</h1>
        <p className="text-muted-foreground">Rate your mentor anonymously</p>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-success/50 bg-success/10 p-6 text-center">
          <p className="text-lg font-semibold text-success">✓ Thank you for your feedback!</p>
          <p className="text-sm text-muted-foreground mt-2">Your response has been submitted anonymously.</p>
          <Button className="mt-4" variant="outline" onClick={() => setSubmitted(false)}>Submit Another</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Rate your experience</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`h-8 w-8 ${(hoveredStar || rating) >= star ? "fill-warning text-warning" : "text-muted-foreground/30"} transition-colors`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Share your thoughts anonymously..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={5}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground">🔒 All feedback is submitted anonymously</p>

          <Button type="submit" className="gradient-primary text-primary-foreground" disabled={rating === 0 || submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Feedback"}
          </Button>
        </form>
      )}
    </div>
  );
}
