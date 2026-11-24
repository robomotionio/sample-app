import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Combobox,
  DatePicker,
  Field,
  FieldArray,
  Form,
  NumberInput,
  Row,
  Screen,
  Stack,
  TagInput,
  TextArea,
  TextInput,
  useToast,
  type FormValues,
} from "@robomotion/app-kit";
import { bindAction } from "@robomotion/apps-runtime/react";
import { navigate } from "@/lib/router";
import {
  useSubmitRequest,
  type RequestLine,
  type SubmitRequestParams,
} from "../generated/actions.gen";
import { CATEGORY_OPTIONS, isCategory } from "../lib/categories";

/**
 * One value bag for the whole form. Every input inside a <Field name="…">
 * reads and writes this by name, which is what lets FieldArray exist at all:
 * a row's fields write plain names and the array puts them in the right row.
 */
type Draft = FormValues & {
  title?: string;
  category?: string;
  details?: string;
  needed_by?: string;
  labels?: string[];
  lines?: FormValues[];
};

export function SubmitPage() {
  const { toast } = useToast();
  const submit = useSubmitRequest();

  const [values, setValues] = useState<Draft>({ lines: [] });
  const [titleError, setTitleError] = useState<string | undefined>();
  const [categoryError, setCategoryError] = useState<string | undefined>();

  // A request that does not go through leaves its reason on the hook rather
  // than throwing, so the failure is announced from there.
  const failure = submit.error;
  useEffect(() => {
    if (failure) {
      toast({
        title: "The request could not be sent.",
        description: failure.message,
        variant: "error",
      });
    }
  }, [failure, toast]);

  /** The rows the person actually filled in, in the contract's own shape. */
  function lines(): RequestLine[] | undefined {
    const rows = (values.lines ?? [])
      .map((row) => ({
        description: String(row.description ?? "").trim(),
        quantity: typeof row.quantity === "number" ? row.quantity : undefined,
      }))
      .filter((row) => row.description !== "");
    return rows.length > 0 ? rows : undefined;
  }

  async function handleSubmit() {
    const title = (values.title ?? "").trim();
    const category = values.category ?? "";
    setTitleError(title ? undefined : "Give the request a short title.");
    setCategoryError(isCategory(category) ? undefined : "Choose what kind of request this is.");
    if (!title || !isCategory(category)) return;

    const params: SubmitRequestParams = {
      title,
      category,
      details: (values.details ?? "").trim() || undefined,
      needed_by: values.needed_by || undefined,
      lines: lines(),
      labels: values.labels?.length ? values.labels : undefined,
    };

    const sent = await submit.run(params);
    if (!sent) return;
    toast({ title: "Request sent." });
    navigate("/requests");
  }

  return (
    <Screen
      title="New request"
      description="Tell the robot what you need and it will get to work."
    >
      <Card>
        <CardBody>
          <Form values={values} onChange={(next) => setValues(next as Draft)} onSubmit={handleSubmit}>
            <Stack gap={4}>
              <Field name="title" label="What do you need?" required error={titleError}>
                <TextInput placeholder="A short title for the request" />
              </Field>
              <Field name="category" label="Kind of request" required error={categoryError}>
                {/* A Combobox rather than a Select: this list is four long
                    today and every real one grows past twenty, at which point
                    a native select stops being usable and typing is the only
                    way anybody finds anything. */}
                <Combobox options={CATEGORY_OPTIONS} placeholder="Start typing" />
              </Field>
              <Field
                name="details"
                label="Details"
                help="Anything that helps get it right the first time."
              >
                <TextArea rows={5} placeholder="Links, names, amounts, anything useful" />
              </Field>
              {/* A repeating group: the form's value at "lines" is a real
                  array of objects, which is what the contract declares and
                  what the flow loops over. */}
              <FieldArray
                name="lines"
                label="The specific things you need"
                help="One per line. Leave it empty if the details above cover it."
                newItem={() => ({ description: "", quantity: 1 })}
                addLabel="Add a line"
                emptyText="No lines yet."
              >
                {() => (
                  <Row gap={3} align="start" className="w-full">
                    <Field name="description" label="What" className="flex-1">
                      <TextInput placeholder="One thing you need" />
                    </Field>
                    <Field name="quantity" label="How many" className="w-28">
                      <NumberInput min={1} />
                    </Field>
                  </Row>
                )}
              </FieldArray>
              <Field
                name="labels"
                label="Labels"
                help="Short words to file it under. Press Enter after each one."
              >
                <TagInput placeholder="leadership, monthly" />
              </Field>
              <Field name="needed_by" label="Needed by" help="Leave empty if there is no deadline.">
                <DatePicker />
              </Field>
              <Row justify="end">
                {/* The form checks the fields by hand before calling
                    submitRequest, so the button declares its link with
                    bindAction instead of running the call itself. */}
                <Button
                  type="submit"
                  variant="primary"
                  loading={submit.loading}
                  {...bindAction(submit)}
                >
                  Send request
                </Button>
              </Row>
            </Stack>
          </Form>
        </CardBody>
      </Card>
    </Screen>
  );
}
