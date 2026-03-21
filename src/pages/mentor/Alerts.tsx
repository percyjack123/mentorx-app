import { students } from "@/data/mockData";
import { AlertTriangle, FileWarning, Clock, AlertOctagon } from "lucide-react";

export default function Alerts() {
  const highRisk = students.filter(s => s.riskLevel === "High");
  const tampered = students.filter(s => s.documents.gradeReport !== "Clean" || s.documents.attendanceReport !== "Clean");
  const missedCheckins = students.filter(s => s.lastCheckIn < "2026-03-14");

  const alertSections = [
    { title: "High Risk Students", icon: <AlertTriangle className="h-5 w-5 text-danger" />, items: highRisk.map(s => ({ label: s.name, detail: `Risk Score: ${s.riskScore}`, color: "border-danger/30 bg-danger/5" })) },
    { title: "Tampered Documents", icon: <FileWarning className="h-5 w-5 text-warning" />, items: tampered.map(s => ({ label: s.name, detail: `Grade: ${s.documents.gradeReport}, Attendance: ${s.documents.attendanceReport}`, color: "border-warning/30 bg-warning/5" })) },
    { title: "Missed Check-ins", icon: <Clock className="h-5 w-5 text-muted-foreground" />, items: missedCheckins.slice(0, 8).map(s => ({ label: s.name, detail: `Last: ${s.lastCheckIn}`, color: "border-border bg-muted/50" })) },
    { title: "SOS Alerts", icon: <AlertOctagon className="h-5 w-5 text-danger" />, items: [{ label: "No active SOS alerts", detail: "All clear", color: "border-success/30 bg-success/5" }] },
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
              {section.items.map((item, i) => (
                <div key={i} className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${item.color}`}>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
