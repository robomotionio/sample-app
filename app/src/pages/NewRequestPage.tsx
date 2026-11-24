import { useEffect, useState } from "react";
import {
  Alert, Button, Card, CardBody, CardHeader, Combobox, DescriptionList, Field, Form, Grid,
  Row, Screen, Select, Stack, TextArea, TextInput, useToast,
} from "@robomotion/app-kit";
import { useGetRequest, useSaveRequest, type SaveRequestParams } from "../generated/actions.gen";
import { DEPARTMENTS, LOCATIONS, REPORTING_MANAGERS, ROLE_TYPES } from "../lib/options";
import { DateField } from "../components/DateField";
import { useMe } from "../lib/session";
import { navigate, useSearch } from "../lib/router";
import { todayIso } from "../lib/format";

/** Which People Business Partner looks after which site (assumed for the proof of concept). */
const LOCAL_PBP: Record<string, string> = {
  Argentan: "Holly", "Castel d'Ario": "Holly", Cavriago: "Holly",
  Monignoso: "Holly", Langemark: "Holly", "Fully remote": "Holly",
};

const REQUIRED: (keyof SaveRequestParams)[] = [
  "department", "request_date", "job_title", "location", "role_type",
  "business_justification", "desired_start_date", "reporting_manager",
];

export function NewRequestPage() {
  const me = useMe();
  const id = new URLSearchParams(useSearch()).get("id") ?? "";
  const save = useSaveRequest();
  const existing = useGetRequest();
  const { toast } = useToast();

  const blank: SaveRequestParams = {
    token: me.token,
    id: "",
    department: "",
    request_date: todayIso(),
    job_title: "",
    location: "",
    role_type: "",
    business_justification: "",
    desired_start_date: "",
    reporting_manager: "",
  };
  const [values, setValues] = useState<SaveRequestParams>(blank);

  useEffect(() => {
    if (id) void existing.run({ id, token: me.token });
  }, [id]);

  useEffect(() => {
    const r = existing.data;
    if (!r) return;
    const { hiring_manager: _hm, ...form1 } = r.form1;
    void _hm;
    setValues({ ...blank, ...form1, id: r.id });
  }, [existing.data]);

  useEffect(() => {
    const done = save.data;
    if (!done) return;
    toast({
      title: done.status === "draft" ? "Draft saved" : "Sent to the People team",
      description: done.status === "draft" ? `${done.ref} is kept as a draft.` : `${done.ref} is now waiting for HR validation.`,
      variant: "success",
    });
    navigate(`/request?id=${encodeURIComponent(done.id)}`);
  }, [save.data]);

  const missing = REQUIRED.filter((k) => !String(values[k] ?? "").trim());
  const pbp = values.location ? LOCAL_PBP[values.location] : undefined;
  const editing = Boolean(id);

  return (
    <Screen
      title={editing ? `Edit ${existing.data?.ref ?? "request"}` : "New vacancy request"}
      description="Form 1 of 2. Tell the People team which role you need and why; your local People Business Partner completes the rest."
      backPath={editing ? `/request?id=${id}` : "/my"}
    >
      <Grid cols={1} lgCols={3} gap={6}>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Request details" icon="briefcase" />
            <CardBody>
              <Form values={values as unknown as Record<string, unknown>} onChange={(v) => setValues(v as unknown as SaveRequestParams)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field name="request_date" label="Date of request" required>
                    <DateField label="Date of request" value={values.request_date} onChange={(v) => setValues({ ...values, request_date: v })} />
                  </Field>
                </div>
                <Field name="job_title" label="Job title" required>
                  <TextInput />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field name="department" label="Department the role is for" required>
                    <Select placeholder="Choose a department" options={DEPARTMENTS} />
                  </Field>
                  <Field name="location" label="Location" required>
                    <Select placeholder="Choose a site" options={LOCATIONS} />
                  </Field>
                </div>
                <Field name="role_type" label="Role type" required>
                  <Select placeholder="New role or replacement" options={ROLE_TYPES} />
                </Field>
                <Field name="business_justification" label="Business justification" required
                  help="Why is this role needed now? What happens if it stays open?">
                  <TextArea rows={4} />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field name="desired_start_date" label="Desired start date" required>
                    <DateField label="Desired start date" value={values.desired_start_date} onChange={(v) => setValues({ ...values, desired_start_date: v })} />
                  </Field>
                  <Field name="reporting_manager" label="Reporting manager" required>
                    <Combobox placeholder="Choose who they will report to" options={REPORTING_MANAGERS} emptyText="No one by that name" />
                  </Field>
                </div>
              </Form>
            </CardBody>
          </Card>
        </div>

        <Stack gap={4}>
          <Card>
            <CardHeader title="What happens next" icon="map" />
            <CardBody>
              <DescriptionList
                dense
                items={[
                  { label: "Hiring manager", value: me.name },
                  { label: "Validated by", value: pbp ? `${pbp}, People Business Partner for ${values.location}` : "Your local People Business Partner, once you pick a site" },
                  { label: "Then approved by", value: "CPO, CFO and CEO, each in parallel" },
                  { label: "Then", value: "The Talent Partner starts recruiting in Deel ATS" },
                ]}
              />
            </CardBody>
          </Card>

          {missing.length > 0 && (
            <Alert variant="info" title={`${missing.length} field${missing.length === 1 ? "" : "s"} still to fill in`}>
              You can save a draft at any time; every field is needed before it can be sent.
            </Alert>
          )}
          {save.error && <Alert variant="error" title="Not saved">{save.error.message}</Alert>}

          <Row gap={2} wrap>
            <Button
              variant="primary"
              icon="send"
              action={save}
              params={() => ({ ...values, token: me.token, submit: true })}
              disabled={missing.length > 0}
            >
              Send to People team
            </Button>
            <Button
              variant="secondary"
              icon="save"
              action={save}
              params={() => ({ ...values, token: me.token, submit: false })}
              disabled={!values.job_title?.trim()}
            >
              Save draft
            </Button>
          </Row>
        </Stack>
      </Grid>
    </Screen>
  );
}
