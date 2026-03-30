import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { mentorApi } from "@/lib/api";
import type { MentorDashboard, MentorRequest } from "@/lib/api";
import {
  Users,
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Loader2,
  UserPlus,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function MentorDashboardPage() {
  const [stats, setStats] = useState<MentorDashboard | null>(null);
  const [requests, setRequests] = useState<MentorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    mentorApi
      .getDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));

    mentorApi
      .getMentorRequests()
      .then((all) => setRequests(all.filter((r) => r.status === "Pending")))
      .catch(console.error)
      .finally(() => setRequestsLoading(false));
  }, []);

  const handleAccept = async (req: MentorRequest) => {
    setProcessingId(req.id);
    try {
      await mentorApi.acceptRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              totalMentees: prev.totalMentees + 1,
              pendingRequests: Math.max(0, prev.pendingRequests - 1),
            }
          : prev
      );
      toast({
        title: "Request accepted",
        description: `${req.student_name} is now your mentee.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to accept request";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: MentorRequest) => {
    setProcessingId(req.id);
    try {
      await mentorApi.rejectRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setStats((prev) =>
        prev
          ? { ...prev, pendingRequests: Math.max(0, prev.pendingRequests - 1) }
          : prev
      );
      toast({
        title: "Request rejected",
        description: `${req.student_name}'s request has been declined.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reject request";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading...
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Mentor Dashboard</h1>
        <p className="text-muted-foreground">Overview of your mentees</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Mentees"
          value={stats?.totalMentees ?? 0}
          icon={<Users className="h-5 w-5 text-primary" />}
          gradient
        />
        <StatsCard
          title="High Risk"
          value={stats?.highRiskStudents ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-danger" />}
        />
        <StatsCard
          title="Pending Leaves"
          value={stats?.pendingLeaves ?? 0}
          icon={<CalendarDays className="h-5 w-5 text-warning" />}
        />
        <StatsCard
          title="Missed Check-ins"
          value={stats?.unsubmittedCheckIns ?? 0}
          icon={<CheckCircle className="h-5 w-5 text-muted-foreground" />}
        />
        <StatsCard
          title="Pending Requests"
          value={stats?.pendingRequests ?? 0}
          icon={<UserPlus className="h-5 w-5 text-secondary" />}
        />
      </div>

      {/* Pending Mentor Requests */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold font-display">Pending Mentorship Requests</h2>
          {requests.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-secondary/15 text-secondary text-xs font-semibold px-2.5 py-0.5">
              {requests.length} new
            </span>
          )}
        </div>

        {requestsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="animate-spin h-4 w-4" /> Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending requests. New students who select you as their mentor will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-accent/30 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{req.student_name}</p>
                  <p className="text-xs text-muted-foreground">{req.student_email}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {req.department && <span>{req.department}</span>}
                    {req.semester && <span>Sem {req.semester}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground h-8 text-xs"
                    disabled={processingId === req.id}
                    onClick={() => handleAccept(req)}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Accept
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs"
                    disabled={processingId === req.id}
                    onClick={() => handleReject(req)}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}