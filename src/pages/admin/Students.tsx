import { students } from "@/data/mockData";
import { RiskBadge } from "@/components/StatusBadges";

export default function Students() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Students</h1>
        <p className="text-muted-foreground">All registered students</p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Semester</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">CGPA</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Attendance</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Risk</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium">{s.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{s.department}</td>
                  <td className="py-3 px-4">{s.semester}</td>
                  <td className="py-3 px-4">{s.cgpa}</td>
                  <td className="py-3 px-4">{s.attendance}%</td>
                  <td className="py-3 px-4"><RiskBadge level={s.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
