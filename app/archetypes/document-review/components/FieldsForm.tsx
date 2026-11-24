import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DatePicker,
  Field,
  Form,
  NumberInput,
  Row,
  Stack,
  TextArea,
  TextInput,
  type ActionLike,
} from "@robomotion/app-kit";
import type { ConfirmDocumentParams, DocumentFields } from "../generated/actions.gen";

/** Editable view of what was read out of one document. */
export function FieldsForm({
  fileName,
  documentId,
  value,
  onChange,
  confirm,
  onStartOver,
}: {
  fileName: string;
  documentId: string;
  value: DocumentFields;
  onChange: (fields: DocumentFields) => void;
  /** The confirmDocument call. The Confirm button runs it and is linked to that step in the flow. */
  confirm: ActionLike<ConfirmDocumentParams>;
  onStartOver: () => void;
}) {
  const saving = confirm.loading;
  const params: ConfirmDocumentParams = { id: documentId, fields: value };

  return (
    <Card>
      <CardHeader>Check the details from {fileName}</CardHeader>
      <CardBody>
        {/* Enter in a field confirms too. */}
        <Form onSubmit={() => void confirm.run(params)}>
          <Stack gap={4}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="number" label="Reference number">
                <TextInput
                  value={value.number ?? ""}
                  onChange={(number) => onChange({ ...value, number: number || undefined })}
                />
              </Field>
              <Field name="issued_by" label="Issued by">
                <TextInput
                  value={value.issued_by ?? ""}
                  onChange={(issuedBy) =>
                    onChange({ ...value, issued_by: issuedBy || undefined })
                  }
                />
              </Field>
              <Field name="issued_on" label="Issued on">
                <DatePicker
                  value={value.issued_on ?? ""}
                  onChange={(issuedOn) =>
                    onChange({ ...value, issued_on: issuedOn || undefined })
                  }
                />
              </Field>
              <Field name="total" label="Total">
                <NumberInput
                  value={value.total}
                  onChange={(total) => onChange({ ...value, total })}
                  min={0}
                  step={0.01}
                />
              </Field>
              <Field name="currency" label="Currency" help="For example USD or EUR.">
                <TextInput
                  value={value.currency ?? ""}
                  onChange={(currency) =>
                    onChange({ ...value, currency: currency || undefined })
                  }
                />
              </Field>
            </div>
            <Field
              name="notes"
              label="Notes"
              help="Anything worth remembering about this document."
            >
              <TextArea
                value={value.notes ?? ""}
                onChange={(notes) => onChange({ ...value, notes: notes || undefined })}
                rows={3}
              />
            </Field>
          </Stack>
        </Form>
      </CardBody>
      <CardFooter>
        <Row gap={3} justify="end">
          <Button variant="ghost" disabled={saving} onClick={onStartOver}>
            Start over
          </Button>
          <Button variant="primary" action={confirm} params={params}>
            Confirm details
          </Button>
        </Row>
      </CardFooter>
    </Card>
  );
}
