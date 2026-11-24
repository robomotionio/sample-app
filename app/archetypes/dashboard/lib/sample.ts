import type { Activity, Metric, TrendSeries } from "../generated/actions.gen";

/**
 * Sample data lets every screen render fully before the robot side of this
 * app exists. It is a FALLBACK for "no answer yet", never a switch: every
 * button is wired to its real action, and these show only while the app has
 * never had a backend. Delete them when the flow is live.
 */
export const SAMPLE_METRICS: Metric[] = [
  {
    id: "processed",
    label: "Items processed",
    value: 1284,
    change_pct: 12.4,
    change_period: "vs last week",
  },
  {
    id: "waiting",
    label: "Waiting for review",
    value: 23,
    change_pct: -8.1,
    up_is_good: false,
    change_period: "vs last week",
  },
  {
    id: "attention",
    label: "Needs attention",
    value: 3,
    change_pct: 2.0,
    up_is_good: false,
    change_period: "vs last week",
  },
  {
    id: "saved",
    label: "Hours saved",
    value: 41.5,
    unit: "h",
    change_pct: 9.0,
    change_period: "vs last week",
  },
];

export const SAMPLE_ACTIVITY: Activity[] = [
  {
    id: "act-1017",
    title: "Processed invoice INV-2107 from Northwind Supply",
    status: "ok",
    actor: "The robot",
    at: "2026-08-30T08:41:00Z",
  },
  {
    id: "act-1016",
    title: "Filed the weekly sales report",
    status: "ok",
    actor: "The robot",
    at: "2026-08-30T07:05:00Z",
  },
  {
    id: "act-1015",
    title: "Invoice INV-2103 is missing a purchase order",
    status: "warn",
    actor: "The robot",
    at: "2026-08-29T16:22:00Z",
  },
  {
    id: "act-1014",
    title: "Could not reach the supplier portal",
    status: "error",
    actor: "The robot",
    at: "2026-08-29T14:48:00Z",
  },
  {
    id: "act-1013",
    title: "Refund for order #58122 sent for approval",
    status: "pending",
    actor: "Ayse Demir",
    at: "2026-08-29T11:30:00Z",
  },
  {
    id: "act-1012",
    title: "Processed invoice INV-2101 from Contoso Ltd",
    status: "ok",
    actor: "The robot",
    at: "2026-08-29T09:12:00Z",
  },
];

/**
 * Three lines over the same twelve weeks: "us against them" is the question a
 * dashboard is really asked, and one series cannot express it.
 */
export const SAMPLE_TRENDS: TrendSeries[] = [
  {
    name: "Us",
    points: [
      { x: "2026-06-01", y: 14 },
      { x: "2026-06-08", y: 12 },
      { x: "2026-06-15", y: 11 },
      { x: "2026-06-22", y: 9 },
      { x: "2026-06-29", y: 7 },
      { x: "2026-07-06", y: 6 },
    ],
  },
  {
    name: "Northwind",
    points: [
      { x: "2026-06-01", y: 8 },
      { x: "2026-06-08", y: 8 },
      { x: "2026-06-15", y: 9 },
      { x: "2026-06-22", y: 10 },
      { x: "2026-06-29", y: 11 },
      { x: "2026-07-06", y: 12 },
    ],
  },
  {
    name: "Contoso",
    points: [
      { x: "2026-06-01", y: 21 },
      { x: "2026-06-08", y: 19 },
      { x: "2026-06-15", y: 18 },
      { x: "2026-06-22", y: 18 },
      { x: "2026-06-29", y: 16 },
      { x: "2026-07-06", y: 15 },
    ],
  },
];

/** A short run of recent values per metric, for the sparkline on each Stat. */
export const SAMPLE_SPARKLINES: Record<string, number[]> = {
  processed: [980, 1020, 1105, 1090, 1180, 1284],
  waiting: [41, 38, 33, 29, 25, 23],
  attention: [1, 2, 1, 4, 3, 3],
  saved: [28, 31, 33, 36, 39, 41.5],
};
