import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocBadge } from "@/components/StatusBadges";
import { Upload, FileText, ExternalLink, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DocumentStatus, OtherDocument } from "@/data/mockData";
import { otherDocuments as initialOtherDocs } from "@/data/mockData";

interface DocSection {
  title: string;
  key: string;
  uploaded: boolean;
  status: DocumentStatus;
  suspicionScore: number;
}

export default function UploadDocuments() {
  const [docs, setDocs] = useState<DocSection[]>([
    { title: "Grade Report PDF", key: "grade", uploaded: false, status: "Clean", suspicionScore: 2 },
    { title: "Attendance Screenshot", key: "attendance", uploaded: false, status: "Clean", suspicionScore: 5 },
    { title: "Placement Offer Letter", key: "placement", uploaded: false, status: "Clean", suspicionScore: 0 },
    { title: "Medical Certificate", key: "medical", uploaded: false, status: "Clean", suspicionScore: 8 },
  ]);

  const [otherDocs, setOtherDocs] = useState<OtherDocument[]>(initialOtherDocs);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDesc, setNewDocDesc] = useState("");

  const handleUpload = (index: number) => {
    const updated = [...docs];
    const scores = [2, 5, 0, 18];
    const score = scores[index] + Math.floor(Math.random() * 15);
    updated[index] = {
      ...updated[index],
      uploaded: true,
      suspicionScore: score,
      status: score < 10 ? "Clean" : score < 25 ? "Suspicious" : "Tampered",
    };
    setDocs(updated);
    toast({ title: "Document uploaded", description: `${updated[index].title} has been processed.` });
  };

  const handleOtherUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: OtherDocument = {
      id: Date.now(),
      title: newDocTitle,
      description: newDocDesc,
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      uploadedAt: new Date().toISOString().split("T")[0],
    };
    setOtherDocs(prev => [...prev, newDoc]);
    setShowUploadModal(false);
    setNewDocTitle("");
    setNewDocDesc("");
    toast({ title: "Document uploaded", description: `${newDoc.title} has been added.` });
  };

  const handleDeleteOtherDoc = (id: number) => {
    setOtherDocs(prev => prev.filter(d => d.id !== id));
    toast({ title: "Document removed" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Upload Documents</h1>
        <p className="text-muted-foreground">Upload your academic documents for verification</p>
      </div>

      <div className="grid gap-4">
        {docs.map((doc, i) => (
          <div key={doc.key} className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{doc.title}</h3>
                  {doc.uploaded && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Suspicion Score: {doc.suspicionScore}%</span>
                      <DocBadge status={doc.status} />
                    </div>
                  )}
                </div>
              </div>
              {!doc.uploaded ? (
                <div>
                  <Label htmlFor={`file-${doc.key}`} className="cursor-pointer">
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/50 px-4 py-2 text-sm text-primary hover:bg-accent transition-colors">
                      <Upload className="h-4 w-4" /> Upload
                    </div>
                  </Label>
                  <Input id={`file-${doc.key}`} type="file" className="hidden" onChange={() => handleUpload(i)} />
                </div>
              ) : (
                <span className="text-sm text-success font-medium">✓ Uploaded</span>
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

      {/* Other Documents Section */}
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
                  <p className="text-xs text-muted-foreground">{doc.description} • Uploaded on: {doc.uploadedAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(doc.fileUrl, "_blank")}>
                  <ExternalLink className="h-3 w-3 mr-1" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteOtherDoc(doc.id)} className="text-danger hover:text-danger">
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
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Submit</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
