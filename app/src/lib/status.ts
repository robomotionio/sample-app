import type { IconName } from "@robomotion/app-kit";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "outline";
type Tone = "ok" | "warn" | "error" | "pending";

/** The app's words for each status, and the kit's colour for each, in one place. */
export const STATUS: Record<string, { label: string; variant: Variant; icon: IconName }> = {
  draft: { label: "Draft", variant: "outline", icon: "pencil" },
  pending_hr: { label: "Pending HR validation", variant: "info", icon: "handshake" },
  pending_approval: { label: "Pending approval", variant: "accent", icon: "hourglass" },
  info_requested: { label: "Info requested", variant: "warning", icon: "circle-help" },
  approved: { label: "Approved", variant: "success", icon: "circle-check" },
  rejected: { label: "Rejected", variant: "danger", icon: "circle-x" },
  closed: { label: "Recruiting", variant: "neutral", icon: "megaphone" },
};

export function statusOf(s: string | undefined) {
  return STATUS[s ?? ""] ?? { label: s ?? "Unknown", variant: "neutral" as Variant, icon: "circle" as IconName };
}

export const DECISION: Record<string, { label: string; variant: Variant; tone: Tone; icon: IconName }> = {
  pending: { label: "Waiting", variant: "neutral", tone: "pending", icon: "hourglass" },
  approved: { label: "Approved", variant: "success", tone: "ok", icon: "circle-check" },
  rejected: { label: "Rejected", variant: "danger", tone: "error", icon: "circle-x" },
  info: { label: "Asked for info", variant: "warning", tone: "warn", icon: "circle-help" },
};

export function decisionOf(d: string | undefined) {
  return DECISION[d ?? "pending"] ?? DECISION.pending;
}

export function toneOf(t: string | undefined): Tone {
  return t === "ok" || t === "warn" || t === "error" ? t : "pending";
}

export const RECOMMENDATION: Record<string, string> = {
  support: "Supported",
  support_with_changes: "Supported with changes",
  not_supported: "Not supported",
};
