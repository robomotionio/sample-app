import { useState } from "react";
import {
  Alert, Button, Card, CardBody, CardHeader, Checkbox, Combobox, Dialog, Field, Form, Row, Select,
  TextArea, TextInput,
} from "@robomotion/app-kit";
import { useValidateRequest, type Form2, type RequestDetail } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { ADVERTISED, RECOMMENDATIONS, RECRUITMENT_METHODS } from "../lib/options";

/** Form 2: what the People Business Partner fills in before the executives see the request. */
export function ValidationPanel({ request }: { request: RequestDetail }) {
  const me = useMe();
  const validate = useValidateRequest();
  const [values, setValues] = useState<Form2>({
    salary_range: "", benefit_package: "", job_family: "", advertised: "", recruitment_methods: [],
    budget_confirmed: false, hr_recommendation: "", hr_comments: "", ...(request.form2 ?? {}),
  });
  const [returning, setReturning] = useState(false);
  const [question, setQuestion] = useState("");

  const external = values.advertised !== "Internally";
  const missing = [
    !values.salary_range?.trim() && "salary range",
    !values.benefit_package?.trim() && "benefit package",
    !values.job_family?.trim() && "job family / Hay level",
    !values.advertised && "where it is advertised",
    external && !(values.recruitment_methods ?? []).length && "external recruitment method",
    !values.hr_recommendation && "recommendation",
  ].filter(Boolean) as string[];

  const params = (outcome: "submit" | "return") => () => ({
    token: me.token, id: request.id, outcome, question: outcome === "return" ? question : "",
    ...values, recruitment_methods: external ? values.recruitment_methods ?? [] : [],
  });

  return (
    <Card>
      <CardHeader
        title="Validate this request"
        icon="clipboard-check"
        description="Form 2 of 2. Confirm the need, the budget and the package. Executive approval starts only once this is complete."
      />
      <CardBody>
        <Form values={values as Record<string, unknown>} onChange={(v) => setValues(v as Form2)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field name="salary_range" label="Proposed salary range" required help="The expected range for this position.">
              <TextInput />
            </Field>
            <Field name="job_family" label="Job family / Hay level" required>
              <TextInput />
            </Field>
          </div>
          <Field name="benefit_package" label="Proposed benefit package" required>
            <TextArea rows={3} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field name="advertised" label="Role to be advertised" required>
              <Select placeholder="Where to advertise" options={ADVERTISED} />
            </Field>
            {external && (
              <Field name="recruitment_methods" label="External recruitment method" required help="Pick every method that will be used.">
                <Combobox multiple options={RECRUITMENT_METHODS} placeholder="Choose methods" />
              </Field>
            )}
          </div>
          <Field name="budget_confirmed" label="Budget">
            <Checkbox label="This role is covered by the approved headcount budget" />
          </Field>
          <Field name="hr_recommendation" label="HR recommendation" required>
            <Select placeholder="Choose a recommendation" options={RECOMMENDATIONS} />
          </Field>
          <Field name="hr_comments" label="Comments for the executives" help="Workforce planning notes, risks, anything they should know.">
            <TextArea rows={3} />
          </Field>
        </Form>
        {missing.length > 0 && (
          <div className="mt-4">
            <Alert variant="info" title="Still to complete">{missing.join(", ")}.</Alert>
          </div>
        )}
        {validate.error && (
          <div className="mt-4">
            <Alert variant="error" title="Not sent">{validate.error.message}</Alert>
          </div>
        )}
        <Row gap={2} wrap className="mt-6">
          <Button variant="primary" icon="send" action={validate} params={params("submit")} disabled={missing.length > 0}>
            Send for executive approval
          </Button>
          <Button variant="secondary" icon="undo-2" onClick={() => setReturning(true)}>
            Send back to hiring manager
          </Button>
        </Row>
      </CardBody>

      <Dialog
        open={returning}
        onClose={() => setReturning(false)}
        title="Send back to the hiring manager"
        description={`${request.form1.hiring_manager ?? "The hiring manager"} will be asked to add what is missing, and the request comes back to you.`}
        footer={
          <Row gap={2} justify="end">
            <Button variant="ghost" onClick={() => setReturning(false)}>Cancel</Button>
            <Button variant="primary" icon="send" action={validate} params={params("return")} disabled={!question.trim()}
              onClick={() => setTimeout(() => setReturning(false), 0)}>
              Send back
            </Button>
          </Row>
        }
      >
        <Field name="question" label="What should they add or change?" required>
          <TextArea rows={4} value={question} onChange={setQuestion} />
        </Field>
      </Dialog>
    </Card>
  );
}
