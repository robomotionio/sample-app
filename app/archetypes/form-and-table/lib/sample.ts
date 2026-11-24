import type { WorkRequest } from "../generated/actions.gen";

/**
 * Sample data lets every screen render fully before the robot side of this
 * app exists. It is a FALLBACK for "no answer yet", never a switch: Send
 * request is wired to its real action, and these rows show only while the
 * app has never had a backend. Delete them when the flow is live.
 */
export const SAMPLE_REQUESTS: WorkRequest[] = [
  {
    id: "req-1041",
    title: "August sales report for the leadership call",
    category: "report",
    details: "Same layout as July, split by region.",
    needed_by: "2026-09-02",
    lines: [
      { description: "Sales by region, one page", quantity: 1 },
      { description: "Printed copies for the room", quantity: 12 },
    ],
    labels: ["leadership", "monthly"],
    status: "in_progress",
    submitted_at: "2026-08-29T10:15:00Z",
  },
  {
    id: "req-1040",
    title: "Update supplier phone numbers from the shared sheet",
    category: "data_update",
    status: "done",
    submitted_at: "2026-08-28T14:40:00Z",
    outcome: "Updated 37 supplier records.",
  },
  {
    id: "req-1039",
    title: "Warehouse dashboard access for the new hire",
    category: "access",
    details: "Starts Monday, read-only is enough.",
    status: "received",
    submitted_at: "2026-08-28T09:05:00Z",
  },
  {
    id: "req-1038",
    title: "Pull last quarter's refund totals",
    category: "report",
    status: "failed",
    submitted_at: "2026-08-27T16:20:00Z",
    outcome: "The finance system was unreachable. Sending it in again usually helps.",
  },
];
