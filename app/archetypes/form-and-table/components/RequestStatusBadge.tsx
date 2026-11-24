import { StatusBadge } from "@robomotion/app-kit";
import type { WorkRequest } from "../generated/actions.gen";

type WorkRequestStatus = WorkRequest["status"];

const badges: Record<
  WorkRequestStatus,
  { status: "ok" | "warn" | "error" | "pending"; label: string }
> = {
  received: { status: "pending", label: "Received" },
  in_progress: { status: "pending", label: "In progress" },
  done: { status: "ok", label: "Done" },
  failed: { status: "error", label: "Failed" },
};

export function RequestStatusBadge({ status }: { status: WorkRequestStatus }) {
  const badge = badges[status];
  return <StatusBadge status={badge.status}>{badge.label}</StatusBadge>;
}
