import { useEffect, useState } from "react";
import { parentApi } from "@/lib/api";
import { BookOpen, ExternalLink, FileText, Loader2 } from "lucide-react";

export default function ParentResources() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.getResources()
      .then(setResources)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Resources</h1>
        <p className="text-muted-foreground">Learning materials shared by your child's mentor</p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          These resources have been shared by your child's mentor. You can view or open any material below.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>
      ) : (
        <div className="space-y-3">
          {resources.map(res => (
            <div key={res.id} className="rounded-xl border bg-card p-5 flex items-start gap-3 hover:shadow-md transition-all">
              <div className="rounded-lg bg-accent p-2">
                {res.type === "file" ? <FileText className="h-5 w-5 text-accent-foreground" /> : <BookOpen className="h-5 w-5 text-accent-foreground" />}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{res.title}</h4>
                <p className="text-sm text-muted-foreground">{res.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Shared by {res.uploaded_by_name} • {new Date(res.created_at).toLocaleDateString()}
                </p>
              </div>
              {res.url && res.url !== "#" && (
                <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
          {resources.length === 0 && <p className="text-sm text-muted-foreground">No resources shared yet.</p>}
        </div>
      )}
    </div>
  );
}