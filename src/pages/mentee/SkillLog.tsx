import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { skillEntries } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { Award, ExternalLink } from "lucide-react";

export default function SkillLog() {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Skill entry added!", description: "Your entry has been logged." });
    setType(""); setTitle(""); setDescription(""); setLink("");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Skill Log</h1>
        <p className="text-muted-foreground">Track your skills and achievements</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Internship">Internship</SelectItem>
                <SelectItem value="Hackathon">Hackathon</SelectItem>
                <SelectItem value="Certification">Certification</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g., AWS Cloud Practitioner" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" placeholder="Brief description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">Link</Label>
          <Input id="link" placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
        </div>
        <Button type="submit" className="gradient-primary text-primary-foreground">Add Entry</Button>
      </form>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4">Timeline</h3>
        <div className="relative border-l-2 border-primary/20 ml-3 space-y-6">
          {skillEntries.map(entry => (
            <div key={entry.id} className="ml-6 relative">
              <div className="absolute -left-[1.9rem] top-1 w-3 h-3 rounded-full gradient-primary" />
              <div className="p-4 rounded-lg bg-accent/50">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">{entry.type}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{entry.date}</span>
                </div>
                <h4 className="font-medium">{entry.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                {entry.link && (
                  <a href={entry.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                    <ExternalLink className="h-3 w-3" /> View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
