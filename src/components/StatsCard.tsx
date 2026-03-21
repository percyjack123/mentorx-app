import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
  gradient?: boolean;
}

export function StatsCard({ title, value, icon, trend, className, gradient }: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md",
      gradient && "gradient-primary text-primary-foreground border-none",
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn("text-sm font-medium", gradient ? "text-primary-foreground/80" : "text-muted-foreground")}>{title}</p>
          <p className="mt-1 text-3xl font-bold font-display">{value}</p>
          {trend && <p className={cn("mt-1 text-xs", gradient ? "text-primary-foreground/70" : "text-muted-foreground")}>{trend}</p>}
        </div>
        <div className={cn("rounded-xl p-3", gradient ? "bg-primary-foreground/20" : "bg-accent")}>
          {icon}
        </div>
      </div>
    </div>
  );
}
