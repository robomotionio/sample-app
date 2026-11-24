import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FileUpload,
  Progress,
  Row,
  Screen,
  Stack,
  Step,
  Stepper,
  Timeline,
  TimelineItem,
  useToast,
  type DataTableApi,
} from "@robomotion/app-kit";
import type { AppError } from "@robomotion/apps-runtime";
import { useEvent } from "@robomotion/apps-runtime/react";
import {
  useConfirmDocument,
  useExtractDocument,
  useListDocuments,
  type DocumentEvent,
  type DocumentFields,
  type ReviewedDocument,
} from "../generated/actions.gen";
import { SAMPLE_DOCUMENTS } from "../lib/sample";
import { DocumentHistory } from "../components/DocumentHistory";
import { FieldsForm } from "../components/FieldsForm";

type Phase =
  | { name: "idle" }
  | { name: "reading" }
  | { name: "review"; document: ReviewedDocument };

export function ReviewPage() {
  const { toast } = useToast();
  const extract = useExtractDocument();
  const confirm = useConfirmDocument();
  // The app keeps no history of its own: the flow owns where the documents
  // really live and the table below asks it for a page at a time.
  const documents = useListDocuments();
  const history = useRef<DataTableApi | null>(null);

  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [draft, setDraft] = useState<DocumentFields>({});

  useEvent<ReviewedDocument>("documentReady", (document) => {
    // Announces documents finished for other people looking at this screen;
    // the uploader's own result arrives through the action call below.
    history.current?.refresh();
    if (phase.name !== "reading") {
      toast({ title: `"${document.file.name}" is ready to check.` });
    }
  });

  // The upload area runs extractDocument itself once the file lands; the
  // reviewed document arrives here and opens the review.
  const reviewed = extract.data;
  useEffect(() => {
    if (!reviewed) return;
    setDraft(reviewed.fields);
    setPhase({ name: "review", document: reviewed });
  }, [reviewed]);

  // Reading and saving report their reasons on the hook instead of throwing,
  // so failures are announced from there.
  const readError = extract.error;
  useEffect(() => {
    if (!readError) return;
    setPhase({ name: "idle" });
    // Stopping on purpose is not a failure worth announcing.
    if (readError.code !== "cancelled") {
      toast({
        title: "The document could not be read.",
        description: readError.message,
        variant: "error",
      });
    }
  }, [readError, toast]);

  const saveError = confirm.error;
  useEffect(() => {
    if (saveError) {
      toast({
        title: "The details could not be saved.",
        description: saveError.message,
        variant: "error",
      });
    }
  }, [saveError, toast]);

  // A saved document ends the review.
  const saved = confirm.data;
  useEffect(() => {
    if (!saved) return;
    toast({ title: "Details saved." });
    setPhase({ name: "idle" });
  }, [saved, toast]);

  function handleUploadFailed(error: AppError) {
    setPhase({ name: "idle" });
    toast({
      title: "The file could not be sent.",
      description: error.message,
      variant: "error",
    });
  }

  function handleStop() {
    extract.cancel();
    setPhase({ name: "idle" });
  }

  const reading = {
    percent: extract.progress?.percent,
    message: extract.progress?.message ?? "Reading the document",
  };
  // The three moments of the job, made visible. The page already had this
  // state machine; the Stepper is it, drawn, so somebody halfway through can
  // see where they are and what is still to come.
  const stepIndex = phase.name === "idle" ? 0 : phase.name === "reading" ? 1 : 2;
  const documentHistory: DocumentEvent[] =
    phase.name === "review" ? phase.document.history ?? [] : [];

  return (
    <Screen
      title="Review"
      description="Upload a document, watch it being read, then check the details."
    >
      <Stack gap={6}>
        <Stepper
          label="Reviewing a document"
          value={stepIndex}
          // The page's own state decides which step is showing, so the rail
          // is a map rather than a control: the only move it offers is back
          // to the start.
          controls={false}
          onChange={(next) => {
            if (next === 0) setPhase({ name: "idle" });
          }}
        >
          <Step title="Upload" description="A PDF or a photo">
            {phase.name === "idle" && (
              <Card>
                <CardBody>
                  {/* Always the real action: the upload area runs extractDocument
                      with the stored file as soon as the upload lands, and the drop
                      zone is linked to that step in the flow. Before a robot is
                      connected the upload fails honestly and says so. */}
                  <FileUpload
                    action={extract}
                    onUpload={() => setPhase({ name: "reading" })}
                    onError={handleUploadFailed}
                    accept="application/pdf,image/*"
                    hint="PDF and image files work best."
                  />
                </CardBody>
              </Card>
            )}
          </Step>
          <Step title="Being read" description="The robot is working">
            {phase.name === "reading" && (
              <Card>
                <CardBody>
                  <Stack gap={4}>
                    <Progress value={reading.percent} label={reading.message} />
                    <Row justify="end">
                      <Button variant="ghost" onClick={handleStop}>
                        Stop
                      </Button>
                    </Row>
                  </Stack>
                </CardBody>
              </Card>
            )}
          </Step>
          <Step title="Check and confirm" description="Your turn">
            {phase.name === "review" && (
              <Stack gap={6}>
                <FieldsForm
                  fileName={phase.document.file.name}
                  documentId={phase.document.id}
                  value={draft}
                  onChange={setDraft}
                  confirm={confirm}
                  onStartOver={() => setPhase({ name: "idle" })}
                />
                {documentHistory.length > 0 && (
                  <Card>
                    <CardHeader title="What has happened to this document" />
                    <CardBody>
                      {/* A table answers "which one"; a Timeline answers
                          "what happened next", which is the question in front
                          of somebody deciding whether to trust what was read. */}
                      <Timeline>
                        {documentHistory.map((event, i) => (
                          <TimelineItem
                            key={i}
                            at={event.at}
                            title={event.title}
                            body={event.note}
                            status={event.status}
                          />
                        ))}
                      </Timeline>
                    </CardBody>
                  </Card>
                )}
              </Stack>
            )}
          </Step>
        </Stepper>
        {/* The sample rows are what the table shows before the app has ever
            had a backend; the table gates them on the connection itself. */}
        <DocumentHistory
          source={{ action: documents, pageSize: 10 }}
          sampleRows={SAMPLE_DOCUMENTS}
          tableRef={history}
        />
      </Stack>
    </Screen>
  );
}
