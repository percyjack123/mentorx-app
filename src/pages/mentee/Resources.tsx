import { resources } from "@/data/mockData";
import { BookOpen, ExternalLink, FileText } from "lucide-react";

export default function MenteeResources() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Resources</h1>
        <p className="text-muted-foreground">Learning materials shared by mentors</p>
      </div>

      <div className="grid gap-4">
        {resources.map(res => (
          <div key={res.id} className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent p-2 mt-0.5">
                {res.type === "file" ? <FileText className="h-5 w-5 text-accent-foreground" /> : <BookOpen className="h-5 w-5 text-accent-foreground" />}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{res.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{res.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground">By {res.uploadedBy}</span>
                  <span className="text-xs text-muted-foreground">{res.date}</span>
                </div>
              </div>
              <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
