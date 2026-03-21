import { useState } from "react";
import { resources } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, ExternalLink, FileText, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MentorResources() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Resource shared", description: "Resource has been added." });
    setTitle(""); setDescription(""); setLink("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Resources</h1>
        <p className="text-muted-foreground">Share learning materials with mentees</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-semibold font-display flex items-center gap-2"><Plus className="h-4 w-4" /> Share Resource</h3>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">File Upload or Link</Label>
          <Input id="link" value={link} onChange={e => setLink(e.target.value)} placeholder="https://... or upload a file" />
        </div>
        <Button type="submit" className="gradient-primary text-primary-foreground">Share</Button>
      </form>

      <div className="space-y-3">
        {resources.map(res => (
          <div key={res.id} className="rounded-xl border bg-card p-5 flex items-start gap-3 hover:shadow-md transition-all">
            <div className="rounded-lg bg-accent p-2">
              {res.type === "file" ? <FileText className="h-5 w-5 text-accent-foreground" /> : <BookOpen className="h-5 w-5 text-accent-foreground" />}
            </div>
            <div className="flex-1">
              <h4 className="font-medium">{res.title}</h4>
              <p className="text-sm text-muted-foreground">{res.description}</p>
              <p className="text-xs text-muted-foreground mt-1">By {res.uploadedBy} • {res.date}</p>
            </div>
            <a href={res.url} className="text-primary hover:text-primary/80"><ExternalLink className="h-4 w-4" /></a>
          </div>
        ))}
      </div>
    </div>
  );
}
