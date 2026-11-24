import { useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Field, Row, Stack, TextArea } from "@robomotion/app-kit";
import { useAnswerInfo, type RequestDetail } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { roleInfo } from "../lib/session";
import { navigate } from "../lib/router";
import { formatDateTime } from "../lib/format";

/** A question someone asked about the request, and the place to answer it. */
export function AnswerPanel({
  request, role,
}: { request: RequestDetail; role: "hiring_manager" | "people_partner" }) {
  const me = useMe();
  const answer = useAnswerInfo();
  const [text, setText] = useState("");
  const info = request.info ?? {};
  const asker = info.from_role === "people_partner" ? `${info.from_name ?? "Your People partner"}` : roleInfo(info.from_role).title;

  return (
    <Card>
      <CardHeader title={`${asker} needs more information`} icon="circle-help" description={`Asked ${formatDateTime(info.asked_at)}`} />
      <CardBody>
        <Stack gap={4}>
          <Alert variant="warning" title="The question">{info.question || "No question was written."}</Alert>
          <Field name="answer" label="Your answer" required>
            <TextArea rows={4} value={text} onChange={setText} />
          </Field>
          {answer.error && <Alert variant="error" title="Not sent">{answer.error.message}</Alert>}
          <Row gap={2} wrap>
            <Button variant="primary" icon="reply" action={answer} params={() => ({ token: me.token, id: request.id, answer: text })} disabled={!text.trim()}>
              Send answer
            </Button>
            {role === "hiring_manager" && (
              <Button variant="secondary" icon="pencil" onClick={() => navigate(`/new?id=${request.id}`)}>
                Edit the request first
              </Button>
            )}
          </Row>
          <p className="text-xs text-muted-foreground">
            Your answer goes back to {asker} and the request returns to {info.from_role === "people_partner" ? "HR validation" : "executive approval"}.
          </p>
        </Stack>
      </CardBody>
    </Card>
  );
}
