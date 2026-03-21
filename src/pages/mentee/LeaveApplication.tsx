import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeaveBadge } from "@/components/StatusBadges";
import { menteeApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LeaveApplication() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    menteeApi.getLeaves()
      .then(setLeaves)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newLeave = await menteeApi.applyLeave({ fromDate, toDate, reason });
      setLeaves(prev => [newLeave as any, ...prev]);
      toast({ title: "Leave application submitted", description: "Your request is pending approval." });
      setFromDate(""); setToDate(""); setReason("");
    } catch {
      toast({ title: "Error", description: "Failed to submit leave", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Leave Application</h1>
        <p className="text-muted-foreground">Apply for leave and track your history</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from">From Date</Label>
            <Input id="from" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To Date</Label>
            <Input id="to" type="date" value={toDate} onChange={e => setToDate(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea id="reason" placeholder="Reason for leave" value={reason} onChange={e => setReason(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="medical">Upload Medical Document (Optional)</Label>
          <Input id="medical" type="file" />
        </div>
        <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Application"}
        </Button>
      </form>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold font-display mb-4">Leave History</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Reason</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-3 px-2">{l.from_date} to {l.to_date}</td>
                    <td className="py-3 px-2">{l.reason}</td>
                    <td className="py-3 px-2"><LeaveBadge status={l.status} /></td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No leave records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
