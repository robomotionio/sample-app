import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, ConfirmDialog, Row } from "@robomotion/app-kit";
import { useDeleteDraft, useSaveRequest, type RequestDetail } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { navigate } from "../lib/router";

const NEEDED = [
  "hiring_manager", "department", "request_date", "job_title", "location", "role_type",
  "business_justification", "desired_start_date", "reporting_manager",
] as const;

/** A draft: finish it, send it, or throw it away. */
export function DraftPanel({ request }: { request: RequestDetail }) {
  const me = useMe();
  const send = useSaveRequest();
  const remove = useDeleteDraft();
  const [confirming, setConfirming] = useState(false);
  const f = request.form1;
  const missing = NEEDED.filter((k) => !String(f[k] ?? "").trim());

  useEffect(() => {
    if (remove.data?.removed) navigate("/my");
  }, [remove.data]);

  return (
    <Card>
      <CardHeader title="This request is still a draft" icon="pencil" description="Nobody else can see it until you send it to the People team." />
      <CardBody>
        {missing.length > 0 && (
          <div className="mb-4">
            <Alert variant="info" title={`${missing.length} field${missing.length === 1 ? "" : "s"} to complete before sending`} />
          </div>
        )}
        {send.error && <div className="mb-4"><Alert variant="error" title="Not sent">{send.error.message}</Alert></div>}
        <Row gap={2} wrap>
          <Button variant="primary" icon="send" action={send} disabled={missing.length > 0}
            params={() => ({ department: f.department, request_date: f.request_date, location: f.location, role_type: f.role_type, business_justification: f.business_justification, desired_start_date: f.desired_start_date, reporting_manager: f.reporting_manager, token: me.token, id: request.id, job_title: f.job_title ?? "", submit: true })}>
            Send to People team
          </Button>
          <Button variant="secondary" icon="pencil" onClick={() => navigate(`/new?id=${request.id}`)}>Edit</Button>
          <Button variant="ghost" icon="trash-2" onClick={() => setConfirming(true)}>Delete draft</Button>
        </Row>
      </CardBody>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this draft?"
        description="It was never sent, so nobody else has seen it. You cannot undo this."
        confirmLabel="Delete draft"
        danger
        action={remove}
        params={() => ({ token: me.token, id: request.id })}
      />
    </Card>
  );
}
