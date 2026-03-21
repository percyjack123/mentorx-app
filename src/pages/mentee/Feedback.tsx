import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MenteeFeedback() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Feedback submitted", description: "Thank you for your anonymous feedback." });
    setRating(0);
    setFeedback("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Feedback</h1>
        <p className="text-muted-foreground">Rate your mentor anonymously</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Rate your experience</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
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
          <Textarea id="feedback" placeholder="Share your thoughts anonymously..." value={feedback} onChange={e => setFeedback(e.target.value)} rows={5} required />
        </div>

        <p className="text-xs text-muted-foreground">🔒 All feedback is submitted anonymously</p>

        <Button type="submit" className="gradient-primary text-primary-foreground" disabled={rating === 0}>Submit Feedback</Button>
      </form>
    </div>
  );
}
