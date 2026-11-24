import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  ErrorState,
  ImageCompare,
  ImageMarkup,
  MarkList,
  Meter,
  Progress,
  Screen,
  Skeleton,
  Stack,
  useMarkHistory,
  useToast,
  type ImageMarkupHandle,
  type MarkTool,
} from "@robomotion/app-kit";
import { bindAction, markGesture, useConnection, useFileUpload } from "@robomotion/apps-runtime/react";
import { navigate, useSearch } from "@/lib/router";
import {
  useApprovePicture,
  useGetPicture,
  useRequestChanges,
  type Picture,
} from "../generated/actions.gen";
import { samplePicture, sampleSrc } from "../lib/sample";
import { toContractMarks, toKitMarks } from "../lib/marks";
import { ChangeRequest } from "../components/ChangeRequest";

export function ReviewPage() {
  const { toast } = useToast();
  const id = new URLSearchParams(useSearch()).get("id");
  const getPicture = useGetPicture();
  const requestChanges = useRequestChanges();
  const approve = useApprovePicture();
  const { upload } = useFileUpload();
  const { state, robotOnline } = useConnection();
  // A sample photo only while the app has never had a backend: a stopped or
  // published app must not show an invented photo as if it were its own.
  const sample = state === "unconfigured";

  // The photo comes from the robot every time the screen opens on one; a
  // link to /review?id=... is a link to that photo.
  useEffect(() => {
    if (robotOnline && id) void getPicture.run({ id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotOnline, id]);

  // Before the app has ever had a backend a sample photo stands in, so the
  // screen shows its real shape; otherwise it is the robot's answer or nothing.
  const picture: Picture | undefined = getPicture.data ?? (sample ? samplePicture(id) : undefined);

  // The marks belong to the photo on screen. A different photo, or a request
  // that went out, starts a clean sheet.
  const history = useMarkHistory();
  const resetMarks = history.reset;
  useEffect(() => {
    resetMarks();
  }, [picture?.id, resetMarks]);

  const [tool, setTool] = useState<MarkTool>("box");
  const [selected, setSelected] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const markup = useRef<ImageMarkupHandle>(null);
  const composer = useRef<HTMLDivElement>(null);

  const approved = approve.data;
  useEffect(() => {
    if (!approved) return;
    toast({ title: `"${approved.title}" approved.`, variant: "success" });
    navigate("/");
  }, [approved, toast]);

  const sendError = requestChanges.error;
  useEffect(() => {
    if (sendError) {
      toast({ title: "The photo could not be sent back.", description: sendError.message, variant: "error" });
    }
  }, [sendError, toast]);

  async function sendBack(note: string) {
    if (!picture || sending) return;
    if (history.marks.length === 0) {
      toast({ title: "Mark at least one place on the photo first." });
      return;
    }
    const marks = toContractMarks(history.marks);
    setSending(true);
    try {
      // The robot never sees the screen, so the marks go to it twice: as data,
      // and burned into a copy of the photo for whoever redoes it.
      const blob = await markup.current!.exportAnnotated({ maxSize: 2048 });
      const annotatedFile = await upload(new File([blob], `${picture.id}-marked.png`, { type: "image/png" }));
      if (!annotatedFile) {
        toast({ title: "The marked-up photo could not be uploaded.", variant: "error" });
        return;
      }
      // The upload took a while: the call still belongs to the box the
      // person pressed Send in.
      markGesture(composer.current);
      const done = await requestChanges.run({ id: picture.id, marks, annotatedFile, note });
      if (!done) return;
      void getPicture.run({ id: picture.id });
      history.reset();
      toast({ title: "Sent back with your marks.", variant: "success" });
    } catch (e) {
      toast({
        title: "The marked-up photo could not be made.",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  }

  if (!sample && !id) {
    return (
      <Screen title="Review" description="Open a photo from the Photos screen to review it." backPath="/">
        <EmptyState
          icon="images"
          title="No photo picked"
          description="Pick one on the Photos screen and press Review."
          action={<Button onClick={() => navigate("/")}>Go to the photos</Button>}
        />
      </Screen>
    );
  }

  if (!picture) {
    return (
      <Screen title="Review" backPath="/">
        {getPicture.error ? (
          <ErrorState error={getPicture.error} onRetry={() => id && void getPicture.run({ id })} />
        ) : robotOnline ? (
          <Skeleton variant="rect" height="24rem" />
        ) : (
          // Not running (the banner says so and offers Start it): nothing is
          // on its way, so a skeleton would be a promise nobody keeps.
          <EmptyState icon="images" title="This photo shows once the app is running" />
        )}
      </Screen>
    );
  }

  const confidence = picture.confidence;
  const progress = requestChanges.progress;

  return (
    <Screen
      title={picture.title}
      description="Approve it as it is, or mark the places that need fixing and say what should change."
      backPath="/"
      badge={
        picture.status === "approved" ? (
          <Badge variant="success">Approved</Badge>
        ) : picture.status === "changes_requested" ? (
          <Badge variant="warning">Changes asked</Badge>
        ) : undefined
      }
      actions={
        <Button icon="check" action={approve} params={{ id: picture.id }} disabled={picture.status === "approved"}>
          Approve
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ImageMarkup
          ref={markup}
          src={sampleSrc(picture.file)}
          file={picture.file}
          alt={picture.title}
          tool={tool}
          onToolChange={setTool}
          marks={history.marks}
          onMarksChange={history.setMarks}
          selectedId={selected}
          onSelect={setSelected}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          readOnly={sending}
          maxHeight="60vh"
        />

        <Stack gap={4}>
          <Card>
            <CardHeader title="What the robot made of it" />
            <CardBody>
              <Stack gap={4}>
                <DescriptionList
                  columns={2}
                  dense
                  items={[
                    { label: "Filed under", value: picture.category },
                    {
                      label: "Taken",
                      value: new Date(picture.taken_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }),
                    },
                  ]}
                />
                {confidence !== undefined && (
                  <Meter
                    label="How sure the robot is"
                    value={confidence}
                    trailing={`${Math.round(confidence * 100)}%`}
                    uncertain={confidence < 0.6}
                    tone={confidence < 0.6 ? "warning" : "default"}
                  />
                )}
              </Stack>
            </CardBody>
          </Card>

          <div ref={composer} {...bindAction(requestChanges)}>
            <ChangeRequest
              marks={history.marks}
              onMarksChange={history.setMarks}
              selectedId={selected}
              onSelect={setSelected}
              busy={sending}
              onSend={(note) => void sendBack(note)}
            />
          </div>

          {sending && <Progress value={progress?.percent} label={progress?.message ?? "Sending the photo back"} />}
        </Stack>
      </div>

      {picture.previous && (
        <Card className="mt-6">
          <CardHeader
            title="Before and after"
            description={picture.note ? `What was asked last time: "${picture.note}"` : "The version before this one."}
          />
          <CardBody>
            <Stack gap={4}>
              <ImageCompare
                aspect="4:3"
                before={{ src: sampleSrc(picture.previous), file: picture.previous, alt: `${picture.title}, before`, label: "Before" }}
                after={{ src: sampleSrc(picture.file), file: picture.file, alt: `${picture.title}, now`, label: "Now" }}
                className="max-w-3xl"
              />
              {picture.marks && picture.marks.length > 0 && (
                <MarkList marks={toKitMarks(picture.marks)} onMarksChange={() => undefined} readOnly />
              )}
            </Stack>
          </CardBody>
        </Card>
      )}
    </Screen>
  );
}
