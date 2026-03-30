import { useEffect, useState } from "react";
import { adminApi, type AnalyticsData } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Loader2 } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  Safe: "hsl(142, 71%, 45%)",
  Moderate: "hsl(38, 92%, 50%)",
  High: "hsl(0, 72%, 51%)",
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading...
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Analytics</h1>
        <p className="text-muted-foreground">Institution-wide insights</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data?.riskDistribution ?? []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {(data?.riskDistribution ?? []).map((entry, index) => (
                  <Cell key={index} fill={RISK_COLORS[entry.name] ?? "#8884d8"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold font-display mb-4">CGPA Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data?.cgpaTrends ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semester" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 10]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="cgpa"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-6 lg:col-span-2">
          <h3 className="font-semibold font-display mb-4">Attendance Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.attendanceDistribution ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}