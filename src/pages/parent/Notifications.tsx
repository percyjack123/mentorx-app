import { useEffect, useState } from "react";
import { parentApi, type ParentAlerts, type Student, type SosAlert } from "@/lib/api";
import { AlertTriangle, Clock, AlertOctagon, Loader2, TrendingDown } from "lucide-react";

type AlertItem = {
  label: string;
  detail: string;
  color: string;
};

export default function ParentNotifications() {
  const [alerts, setAlerts] = useState<ParentAlerts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi
      .getNotifications()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading...
      </div>
    );

  const alertSections = [
    {
      title: "Academic Risk Alert",
      icon: <AlertTriangle className="h-5 w-5 text-danger" />,
      items: (alerts?.highRisk ?? []).map(
        (s: Student): AlertItem => ({
          label: s.name,
          detail: `Risk Score: ${s.risk_score} — Please contact the mentor`,
          color: "border-danger/30 bg-danger/5",
        })
      ),
      emptyMessage: "No academic risk alerts.",
    },
    {
      title: "Attendance Alert",
      icon: <TrendingDown className="h-5 w-5 text-warning" />,
      items: (alerts?.lowAttendance ?? []).map(
        (s: Student): AlertItem => ({
          label: s.name,
          detail: `Attendance: ${s.attendance}% — Below 75% threshold`,
          color: "border-warning/30 bg-warning/5",
        })
      ),
      emptyMessage: "Attendance is satisfactory.",
    },
    {
      title: "Missed Check-ins",
      icon: <Clock className="h-5 w-5 text-muted-foreground" />,
      items: (alerts?.missedCheckins ?? []).map(
        (s: Student): AlertItem => ({
          label: s.name,
          detail: `Last check-in: ${s.last_check_in ?? "Never"}`,
          color: "border-border bg-muted/50",
        })
      ),
      emptyMessage: "All check-ins are up to date.",
    },
    {
      title: "SOS Alerts",
      icon: <AlertOctagon className="h-5 w-5 text-danger" />,
      items:
        (alerts?.sosAlerts ?? []).length > 0
          ? (alerts!.sosAlerts).map(
              (s: SosAlert): AlertItem => ({
                label: s.name ?? "Unknown Student",
                detail: "SOS alert raised — Contact mentor immediately",
                color: "border-danger/30 bg-danger/5",
              })
            )
          : [
              {
                label: "No active SOS alerts",
                detail: "All clear",
                color: "border-success/30 bg-success/5",
              },
            ],
      emptyMessage: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Notifications</h1>
        <p className="text-muted-foreground">Important updates about your child's progress</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alertSections.map((section) => (
          <div key={section.title} className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold font-display flex items-center gap-2 mb-4">
              {section.icon} {section.title}
            </h3>
            <div className="space-y-2">
              {section.items.length > 0 ? (
                section.items.map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${item.color}`}>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {section.emptyMessage ?? "None"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}