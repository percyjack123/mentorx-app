import { cn } from "@/lib/utils";
import { RiskLevel, DocumentStatus, LeaveStatus } from "@/data/mockData";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      level === "Safe" && "bg-success/15 text-success",
      level === "Moderate" && "bg-warning/15 text-warning",
      level === "High" && "bg-danger/15 text-danger",
      className
    )}>
      {level === "Safe" && "●"} {level === "Moderate" && "●"} {level === "High" && "●"} {level}
    </span>
  );
}

interface DocBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export function DocBadge({ status, className }: DocBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      status === "Clean" && "bg-success/15 text-success",
      status === "Suspicious" && "bg-warning/15 text-warning",
      status === "Tampered" && "bg-danger/15 text-danger",
      className
    )}>
      {status}
    </span>
  );
}

interface LeaveBadgeProps {
  status: LeaveStatus;
  className?: string;
}

export function LeaveBadge({ status, className }: LeaveBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      status === "Approved" && "bg-success/15 text-success",
      status === "Pending" && "bg-warning/15 text-warning",
      status === "Rejected" && "bg-danger/15 text-danger",
      className
    )}>
      {status}
    </span>
  );
}
