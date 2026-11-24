import type { QueueItem } from "../generated/actions.gen";

/**
 * Sample data lets every screen render fully before the robot side of this
 * app exists. It is a FALLBACK for "no answer yet", never a switch: every
 * button is wired to its real action, and these rows show only while the app
 * has never had a backend. Delete them when the flow is live.
 */
export const SAMPLE_QUEUE: QueueItem[] = [
  {
    id: "item-2107",
    title: "Invoice INV-2107 from Northwind Supply",
    requester: "Ayse Demir",
    amount: 1840.5,
    currency: "USD",
    summary:
      "Monthly stationery order. The amount is 12% above the usual range for this supplier.",
    submitted_at: "2026-08-28T09:14:00Z",
    status: "pending",
  },
  {
    id: "item-2110",
    title: "Refund for order #58122",
    requester: "Jonas Weber",
    amount: 129.99,
    currency: "USD",
    summary: "Customer returned a damaged item and asked for a full refund.",
    submitted_at: "2026-08-28T13:02:00Z",
    status: "pending",
  },
  {
    id: "item-2112",
    title: "New supplier: Aurora Print Co.",
    requester: "Maria Santos",
    summary: "Adding a print shop for the autumn campaign. Bank details verified.",
    submitted_at: "2026-08-29T08:45:00Z",
    status: "pending",
  },
  {
    id: "item-2115",
    title: "Invoice INV-2109 from Contoso Ltd",
    requester: "Ayse Demir",
    amount: 460,
    currency: "EUR",
    summary: "Quarterly software licenses, same amount as last quarter.",
    submitted_at: "2026-08-29T15:20:00Z",
    status: "pending",
  },
  {
    id: "item-2118",
    title: "Travel expenses for the Berlin trade fair",
    requester: "Jonas Weber",
    amount: 2310.4,
    currency: "EUR",
    summary: "Two nights, two people. Receipts are attached to the expense report.",
    submitted_at: "2026-08-30T07:55:00Z",
    status: "pending",
  },
];
