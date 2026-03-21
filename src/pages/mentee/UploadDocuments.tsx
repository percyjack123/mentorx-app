import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocBadge } from "@/components/StatusBadges";
import { Upload, FileText, ExternalLink, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { menteeApi } from "@/lib/api";

const REQUIRED_DOCS = [
  { title: "Grade Report PDF", docType: "grade" },
  { title: "Attendance Screenshot", docType: "attendance" },
  { title: "Placement Offer Letter", docType: "placement" },
  { title: "Medical Certificate", docType: "medical" },
];

export default function UploadDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDesc, setNewDocDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    menteeApi.getDocuments()
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRequiredUpload = async (docType: string, title: string) => {
    setUploading(true);
    try {
      const doc = await menteeApi.uploadDocument({
        title,
        docType,
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      });
      setDocuments(prev => [...prev, doc as any]);
      toast({ title: "Document uploaded", description: `${title} has been processed.` });
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleOtherUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const doc = await menteeApi.uploadDocument({
        title: newDocTitle,
        description: newDocDesc,
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        docType: "other",
      });
      setDocuments(prev => [...prev, doc as any]);
      setShowUploadModal(false);
      setNewDocTitle(""); setNewDocDesc("");
      toast({ title: "Document uploaded", description: `${newDocTitle} has been added.` });
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await menteeApi.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const requiredDocs = REQUIRED_DOCS.map(rd => ({
    ...rd,
    uploaded: documents.find(d => d.doc_type === rd.docType),
  }));

  const otherDocs = documents.filter(d => !REQUIRED_DOCS.find(r => r.docType === d.doc_type));

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Upload Documents</h1>
        <p className="text-muted-foreground">Upload your academic documents for verification</p>
      </div>

      {/* Required Documents */}
      <div className="grid gap-4">
        {requiredDocs.map(doc => (
          <div key={doc.docType} className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{doc.title}</h3>
                  {doc.uploaded && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Score: {doc.uploaded.suspicion_score}%</span>
                      <DocBadge status={doc.uploaded.status} />
                    </div>
                  )}
                </div>
              </div>
              {!doc.uploaded ? (
                <div>
                  <Label htmlFor={`file-${doc.docType}`} className="cursor-pointer">
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/50 px-4 py-2 text-sm text-primary hover:bg-accent transition-colors">
                      <Upload className="h-4 w-4" /> Upload
                    </div>
                  </Label>
                  <Input id={`file-${doc.docType}`} type="file" className="hidden"
                    onChange={() => handleRequiredUpload(doc.docType, doc.title)} disabled={uploading} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-success font-medium">✓ Uploaded</span>
                  <Button size="sm" variant="outline" onClick={() => window.open(doc.uploaded.file_url, "_blank")}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {doc.uploaded && (
              <div className="mt-4 p-3 rounded-lg bg-muted">
                <p className="text-xs font-medium text-muted-foreground mb-1">OCR Extracted Data (Placeholder)</p>
                <p className="text-sm">Document text content would appear here after OCR processing...</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Other Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold font-display">Other Documents</h2>
            <p className="text-sm text-muted-foreground">Upload additional supporting documents</p>
          </div>
          <Button onClick={() => setShowUploadModal(true)} className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> Upload Document
          </Button>
        </div>

        <div className="grid gap-3">
          {otherDocs.map(doc => (
            <div key={doc.id} className="rounded-xl border bg-card p-4 flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2">
                  <FileText className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{doc.title}</h3>
                  <p className="text-xs text-muted-foreground">{doc.description} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url, "_blank")}>
                  <ExternalLink className="h-3 w-3 mr-1" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} className="text-danger hover:text-danger">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {otherDocs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No additional documents uploaded yet.</p>
          )}
        </div>
      </div>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOtherUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Document Title</Label>
              <Input id="doc-title" value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="e.g. Internship Certificate" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-desc">Description (optional)</Label>
              <Textarea id="doc-desc" value={newDocDesc} onChange={e => setNewDocDesc(e.target.value)} placeholder="Brief description..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-file">Upload File</Label>
              <Input id="doc-file" type="file" />
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={uploading}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : "Submit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
