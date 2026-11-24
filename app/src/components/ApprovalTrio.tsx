import { Row, Stack, Tooltip } from "@robomotion/app-kit";
import type { Approval } from "../generated/actions.gen";
import { decisionOf } from "../lib/status";
import { roleInfo } from "../lib/session";

/** CPO and CFO side by side, the CEO on top. */
const ORDER = ["cpo", "cfo", "ceo"];

function flavour(decision: string | undefined) {
  if (decision === "approved" || decision === "rejected" || decision === "info") return decision;
  return "pending";
}

/** The three executive sign-offs as three scoops on a cone. Pistachio is
 * approved, strawberry rejected, lemon a question, cream still waiting. */
export function ApprovalTrio({ approvals, size = "sm" }: { approvals: Approval[] | undefined; size?: "sm" | "lg" }) {
  const byRole = new Map((approvals ?? []).map((a) => [a.role, a]));
  const summary = ORDER.map((role) => `${roleInfo(role).short}: ${decisionOf(byRole.get(role)?.decision).label}`).join(" · ");

  const cone = (
    <span className={size === "lg" ? "g-cone g-cone-lg" : "g-cone"} role="img" aria-label={summary}>
      {ORDER.map((role) => (
        <span key={role} className={`g-scoop g-scoop-${role} g-flavour-${flavour(byRole.get(role)?.decision)}`} />
      ))}
    </span>
  );

  if (size === "sm") {
    return (
      <Tooltip content={summary}>
        <span>{cone}</span>
      </Tooltip>
    );
  }

  return (
    <Row gap={4} align="end">
      {cone}
      <Stack gap={1}>
        {[...ORDER].reverse().map((role) => {
          const d = decisionOf(byRole.get(role)?.decision);
          return (
            <Row key={role} gap={2}>
              <span className={`g-swatch g-flavour-${flavour(byRole.get(role)?.decision)}`} />
              <span className="text-sm font-bold text-foreground w-10">{roleInfo(role).short}</span>
              <span className="text-sm text-muted-foreground">{d.label}</span>
            </Row>
          );
        })}
      </Stack>
    </Row>
  );
}
