import type { ReviewedDocument } from "../generated/actions.gen";

/**
 * Sample data lets every screen render fully before the robot side of this
 * app exists. It is a FALLBACK for "no answer yet", never a switch: the
 * upload and Confirm are wired to their real actions, and these rows show
 * only while the app has never had a backend. Delete them when the flow is
 * live.
 */
export const SAMPLE_DOCUMENTS: ReviewedDocument[] = [
  {
    id: "doc-3021",
    file: {
      artifact_id: "doc-3021",
      name: "northwind-invoice-2101.pdf",
      size: 182_400,
      mime: "application/pdf",
    },
    fields: {
      number: "INV-2101",
      issued_by: "Northwind Supply",
      issued_on: "2026-08-12",
      total: 1620,
      currency: "USD",
    },
    status: "confirmed",
    uploaded_at: "2026-08-27T10:20:00Z",
    history: [
      { at: "2026-08-27T10:20:00Z", title: "Uploaded", status: "ok" },
      { at: "2026-08-27T10:20:40Z", title: "Read by the robot", status: "ok" },
      {
        at: "2026-08-27T10:24:00Z",
        title: "Checked and confirmed",
        note: "The total matched the purchase order.",
        status: "ok",
      },
    ],
  },
  {
    id: "doc-3022",
    file: {
      artifact_id: "doc-3022",
      name: "contoso-receipt-august.pdf",
      size: 96_512,
      mime: "application/pdf",
    },
    fields: {
      number: "R-88410",
      issued_by: "Contoso Ltd",
      issued_on: "2026-08-21",
      total: 460,
      currency: "EUR",
    },
    status: "confirmed",
    uploaded_at: "2026-08-28T15:47:00Z",
    history: [
      { at: "2026-08-28T15:47:00Z", title: "Uploaded", status: "ok" },
      {
        at: "2026-08-28T15:47:30Z",
        title: "The date was hard to read",
        note: "Two dates on the page; the robot took the later one.",
        status: "warn",
      },
      { at: "2026-08-28T15:52:00Z", title: "Checked and confirmed", status: "ok" },
    ],
  },
];
