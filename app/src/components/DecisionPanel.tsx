import { useState } from "react";
import {
  Alert, Button, Card, CardBody, CardHeader, Field, RadioGroup, Row, SegmentedControl, Stack, TextArea,
} from "@robomotion/app-kit";
import { useDecideRequest, type RequestDetail } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { roleInfo } from "../lib/session";

type Choice = "approve" | "reject" | "info";

/** The executive's decision: approve, reject with a reason, or ask someone for more. */
export function DecisionPanel({
  request, role,
}: { request: RequestDetail; role: "ceo" | "cpo" | "cfo" }) {
  const me = useMe();
  const decide = useDecideRequest();
  const [choice, setChoice] = useState<Choice>("approve");
  const [comment, setComment] = useState("");
  // Budget and package questions belong to the People partner; the role itself to the hiring manager.
  const [target, setTarget] = useState<"hiring_manager" | "people_partner">(role === "cfo" ? "people_partner" : "hiring_manager");

  const needsText = choice !== "approve" && !comment.trim();
  const label = { approve: "Approve request", reject: "Reject request", info: "Send the question" }[choice];
  const icon = { approve: "circle-check", reject: "circle-x", info: "circle-help" }[choice] as "circle-check";
  const others = request.approvals.filter((a) => a.role !== role && a.decision === "approved").length;

  return (
    <Card>
      <CardHeader
        title={`Your decision as ${roleInfo(role).short}`}
        icon="shield-check"
        description={
          others === 2
            ? "The other two executives have approved. Yours is the last sign-off."
            : `${others} of the other two executives ${others === 1 ? "has" : "have"} approved so far.`
        }
      />
      <CardBody>
        <Stack gap={4}>
          <SegmentedControl
            label="Decision"
            value={choice}
            onChange={(v) => setChoice(v as Choice)}
            options={[
              { value: "approve", label: "Approve", icon: "check" },
              { value: "reject", label: "Reject", icon: "x" },
              { value: "info", label: "Ask for info", icon: "circle-help" },
            ]}
          />
          {choice === "info" && (
            <Field name="target" label="Who should answer?">
              <RadioGroup
                value={target}
                onChange={(v) => setTarget(v as "hiring_manager")}
                options={[
                  { value: "hiring_manager", label: `Hiring manager (${request.hiring_manager ?? "who raised it"}): the role, the need, the timing` },
                  { value: "people_partner", label: `People partner (${request.pbp ?? "HR"}): salary, package, budget` },
                ]}
              />
            </Field>
          )}
          <Field
            name="comment"
            label={choice === "approve" ? "Comment (optional)" : choice === "reject" ? "Why are you rejecting it?" : "What do you need to know?"}
            required={choice !== "approve"}
          >
            <TextArea rows={3} value={comment} onChange={setComment} />
          </Field>
          {choice === "reject" && (
            <Alert variant="warning" title="One rejection rejects the request">
              The hiring manager is told straight away, with your reason.
            </Alert>
          )}
          {decide.error && <Alert variant="error" title="Not recorded">{decide.error.message}</Alert>}
          <Row gap={2}>
            <Button
              variant={choice === "reject" ? "danger" : "primary"}
              icon={icon}
              action={decide}
              params={() => ({ token: me.token, id: request.id, decision: choice, comment, info_target: target })}
              disabled={needsText}
            >
              {label}
            </Button>
          </Row>
        </Stack>
      </CardBody>
    </Card>
  );
}
