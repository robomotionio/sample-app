import { useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, CopyButton, Field, Row, Stack, TextArea } from "@robomotion/app-kit";
import { useCloseRequest, type RequestDetail } from "../generated/actions.gen";
import { useMe } from "../lib/session";

/** The Talent Partner's hand-over: the approved details, and marking recruitment as started. */
export function RecruitPanel({ request }: { request: RequestDetail }) {
  const me = useMe();
  const close = useCloseRequest();
  const [note, setNote] = useState("");
  const f1 = request.form1;
  const f2 = request.form2 ?? {};
  const summary = [
    `${f1.job_title} (${request.ref})`,
    `${f1.department} · ${f1.location} · ${f1.role_type}`,
    `Reports to: ${f1.reporting_manager}`,
    `Start: ${f1.desired_start_date}`,
    `Salary: ${f2.salary_range ?? "-"}`,
    `Job family / Hay: ${f2.job_family ?? "-"}`,
    `Advertise: ${f2.advertised ?? "-"} ${(f2.recruitment_methods ?? []).length ? `(${(f2.recruitment_methods ?? []).join(", ")})` : ""}`,
  ].join("\n");

  return (
    <Card>
      <CardHeader title="Approved: ready to recruit" icon="megaphone" description="All three executives signed off. Set the vacancy up in Deel ATS, then mark it as started here." />
      <CardBody>
        <Stack gap={4}>
          <Row gap={2} wrap>
            <CopyButton value={summary}>Copy vacancy details for Deel</CopyButton>
          </Row>
          <Field name="note" label="Deel ATS reference or note (optional)">
            <TextArea rows={2} value={note} onChange={setNote} />
          </Field>
          {close.error && <Alert variant="error" title="Not saved">{close.error.message}</Alert>}
          <Row gap={2}>
            <Button variant="primary" icon="check-check" action={close} params={() => ({ token: me.token, id: request.id, note })}>
              Recruitment started in Deel ATS
            </Button>
          </Row>
        </Stack>
      </CardBody>
    </Card>
  );
}
