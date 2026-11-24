import { ProgressSteps } from "@robomotion/app-kit";
import type { Approval } from "../generated/actions.gen";

type StepStatus = "pending" | "active" | "done" | "failed" | "skipped";

/** Where a request is on its way: Request, HR validation, Executive approval, Recruitment. */
export function RequestJourney({
  status,
  approvals,
  infoTarget,
  orientation = "horizontal",
}: {
  status: string;
  approvals?: Approval[];
  infoTarget?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const approvedCount = (approvals ?? []).filter((a) => a.decision === "approved").length;
  const at = (s: string) => status === s;

  let request: StepStatus = "done";
  let hr: StepStatus = "pending";
  let exec: StepStatus = "pending";
  let recruit: StepStatus = "pending";
  let hrDetail: string | undefined;
  let execDetail: string | undefined = `${approvedCount} of 3 approved`;

  if (at("draft")) {
    request = "active";
    execDetail = undefined;
  } else if (at("pending_hr")) {
    hr = "active";
    execDetail = undefined;
  } else if (at("info_requested") && infoTarget === "hiring_manager" && approvedCount === 0 &&
             !(approvals ?? []).some((a) => a.decision !== "pending")) {
    request = "active";
    hr = "pending";
    hrDetail = "sent back for more detail";
    execDetail = undefined;
  } else if (at("pending_approval") || at("info_requested")) {
    hr = "done";
    exec = "active";
    if (at("info_requested")) execDetail = "waiting on more information";
  } else if (at("approved")) {
    hr = "done";
    exec = "done";
    recruit = "active";
  } else if (at("closed")) {
    hr = "done";
    exec = "done";
    recruit = "done";
  } else if (at("rejected")) {
    hr = "done";
    exec = "failed";
    recruit = "skipped";
    execDetail = "rejected";
  }

  return (
    <ProgressSteps
      label="Where this request is"
      orientation={orientation}
      steps={[
        { key: "request", label: "Request", status: request, detail: request === "active" ? "hiring manager" : undefined },
        { key: "hr", label: "HR validation", status: hr, detail: hrDetail },
        { key: "exec", label: "Executive approval", status: exec, detail: execDetail },
        { key: "recruit", label: "Recruitment", status: recruit, detail: recruit === "active" ? "Talent Partner" : undefined },
      ]}
    />
  );
}
