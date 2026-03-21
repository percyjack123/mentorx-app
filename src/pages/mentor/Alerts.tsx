import { useEffect, useState } from "react";
import { mentorApi } from "@/lib/api";
import { AlertTriangle, FileWarning, Clock, AlertOctagon, Loader2 } from "lucide-react";

export default function Alerts() {
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mentorApi.getAlerts()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  const alertSections = [
    {
      title: "High Risk Students", icon: <AlertTriangle className="h-5 w-5 text-danger" />,
      items: alerts?.highRisk?.map((s: any) => ({ label: s.name, detail: `Risk Score: ${s.risk_score}`, color: "border-danger/30 bg-danger/5" })) || [],
    },
    {
      title: "Tampered Documents", icon: <FileWarning className="h-5 w-5 text-warning" />,
      items: alerts?.tamperedDocuments?.map((s: any) => ({ label: s.name, detail: `${s.title}: ${s.status}`, color: "border-warning/30 bg-warning/5" })) || [],
    },
    {
      title: "Missed Check-ins", icon: <Clock className="h-5 w-5 text-muted-foreground" />,
      items: alerts?.missedCheckins?.slice(0, 8).map((s: any) => ({ label: s.name, detail: `Last: ${s.last_check_in || "Never"}`, color: "border-border bg-muted/50" })) || [],
    },
    {
      title: "SOS Alerts", icon: <AlertOctagon className="h-5 w-5 text-danger" />,
      items: alerts?.sosAlerts?.length
        ? alerts.sosAlerts.map((s: any) => ({ label: s.name, detail: `Alert sent`, color: "border-danger/30 bg-danger/5" }))
        : [{ label: "No active SOS alerts", detail: "All clear", color: "border-success/30 bg-success/5" }],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Alerts</h1>
        <p className="text-muted-foreground">Important notifications requiring attention</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alertSections.map(section => (
          <div key={section.title} className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold font-display flex items-center gap-2 mb-4">{section.icon} {section.title}</h3>
            <div className="space-y-2">
              {section.items.length > 0 ? section.items.map((item: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${item.color}`}>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">None</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
