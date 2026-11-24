import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  ImageGrid,
  Lightbox,
  Screen,
  SearchInput,
  SegmentedControl,
  Stack,
  Toolbar,
  useToast,
  type ImageGridItem,
} from "@robomotion/app-kit";
import { bindAction, useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { navigate } from "@/lib/router";
import {
  useApprovePicture,
  useListPictures,
  type ListPicturesParams,
  type Picture,
} from "../generated/actions.gen";
import { SAMPLE_PICTURES, sampleMatches, sampleSrc } from "../lib/sample";

type StatusFilter = NonNullable<ListPicturesParams["status"]>;

const PAGE = 60;

const STATUS_LABEL: Record<Picture["status"], string> = {
  to_review: "To review",
  changes_requested: "Changes asked",
  approved: "Approved",
};

function statusBadge(status: Picture["status"]) {
  if (status === "changes_requested") return <Badge variant="warning" size="sm">{STATUS_LABEL[status]}</Badge>;
  if (status === "approved") return <Badge variant="success" size="sm">{STATUS_LABEL[status]}</Badge>;
  return undefined;
}

export function GalleryPage() {
  const { toast } = useToast();
  // The flow owns the photos and where each one is up to; the screen asks
  // for the ones in the state it is showing and keeps nothing of its own.
  const pictures = useListPictures();
  const approve = useApprovePicture();
  const { state, robotOnline } = useConnection();
  // Sample photos only while the app has never had a backend: a stopped or
  // published app must not show invented photos as if they were its own.
  const sample = state === "unconfigured";

  const [status, setStatus] = useState<StatusFilter>("to_review");
  const [filter, setFilter] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);

  // Ask when the robot is there and again whenever the question changes.
  // The dependencies are the question's values, never the hook object: that
  // would ask in a loop.
  useEffect(() => {
    if (!robotOnline) return;
    void pictures.run({ status, filter, offset: 0, limit: PAGE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotOnline, status, filter]);

  // A photo arrived or came back fixed. Events are hints, not state: the
  // list is asked again rather than patched.
  useEvent<Picture>("pictureReady", (picture) => {
    void pictures.run({ status, filter, offset: 0, limit: PAGE });
    toast({ title: `"${picture.title}" is ready to look at.` });
  });

  // The robot's answer. Before the app has ever had a backend the sample
  // photos stand in; otherwise no answer yet is the empty state.
  const rows: Picture[] =
    pictures.data?.rows ?? (sample ? SAMPLE_PICTURES.filter((p) => sampleMatches(p, status, filter)) : []);

  // A selection outlives a filter change only for what is still on screen.
  const shown = new Set(rows.map((p) => p.id));
  const picked = selection.filter((id) => shown.has(id));

  const items: ImageGridItem[] = rows.map((p) => ({
    key: p.id,
    // A sample photo is drawn locally; a photo the robot saved has only
    // `file`, which the kit turns into a link.
    src: sampleSrc(p.file),
    file: p.file,
    placeholder: p.thumb,
    alt: p.title,
    caption: p.title,
    badge: status === "all" ? statusBadge(p.status) : undefined,
  }));

  async function approveSelected() {
    const ids = picked;
    if (ids.length === 0) return;
    setApproving(true);
    let failed = 0;
    // One at a time: each answer is the photo as the robot now has it.
    for (const id of ids) {
      const done = await approve.run({ id });
      if (!done) failed += 1;
    }
    setApproving(false);
    void pictures.run({ status, filter, offset: 0, limit: PAGE });
    if (failed > 0) {
      toast({
        title: failed === ids.length ? "The photos could not be approved." : `${failed} of ${ids.length} could not be approved.`,
        description: "Nothing else changed. Try again in a moment.",
        variant: "error",
      });
      return;
    }
    setSelection([]);
    toast({ title: ids.length === 1 ? "Photo approved." : `${ids.length} photos approved.`, variant: "success" });
  }

  const firstPicked = picked.length > 0 ? rows.findIndex((p) => p.id === picked[0]) : 0;

  return (
    <Screen
      title="Photos"
      description="Look through what the robot collected. Approve the good ones; open one to mark what needs fixing."
      actions={
        <Button
          icon="check"
          disabled={picked.length === 0}
          loading={approving}
          onClick={() => void approveSelected()}
          {...bindAction(approve)}
        >
          {picked.length > 1 ? `Approve ${picked.length}` : "Approve"}
        </Button>
      }
    >
      <Stack gap={4}>
        <SegmentedControl
          label="Show"
          value={status}
          onChange={(next) => setStatus(next as StatusFilter)}
          options={[
            { value: "to_review", label: "To review" },
            { value: "changes_requested", label: "Changes asked" },
            { value: "approved", label: "Approved" },
            { value: "all", label: "All" },
          ]}
        />
        <Toolbar
          end={
            <>
              <Button variant="secondary" icon="maximize-2" disabled={rows.length === 0} onClick={() => setViewing(Math.max(0, firstPicked))}>
                View
              </Button>
              <Button
                variant="secondary"
                icon="pencil"
                disabled={picked.length !== 1}
                onClick={() => navigate(`/review?id=${encodeURIComponent(picked[0])}`)}
              >
                Review
              </Button>
            </>
          }
        >
          <SearchInput value={filter} onChange={setFilter} placeholder="Find a photo" />
        </Toolbar>

        <Card>
          <CardHeader
            title={STATUS_LABEL[status as Picture["status"]] ?? "All photos"}
            description="Click to pick photos, then approve them together. Enter opens the one in focus full screen."
          />
          <CardBody>
            {/* The failure sits BESIDE the grid, never in its place. */}
            {pictures.error && (
              <ErrorState
                className="mb-4"
                error={pictures.error}
                onRetry={() => void pictures.run({ status, filter, offset: 0, limit: PAGE })}
              />
            )}
            <ImageGrid
              label="Photos"
              items={items}
              // While the first answer is on its way the empty slots show
              // the shape of what is coming.
              total={pictures.loading && items.length === 0 ? 12 : undefined}
              columns={{ base: 2, md: 4, lg: 5 }}
              aspect="4:3"
              selectable
              selection={picked}
              onSelectionChange={setSelection}
              onSelect={(item) => setViewing(rows.findIndex((p) => p.id === item.key))}
              source={{ name: pictures.name }}
              emptyState={
                <EmptyState
                  icon="images"
                  title="Nothing here"
                  description={filter ? "No photo matches what you typed." : "No photo is in this state right now."}
                />
              }
            />
          </CardBody>
        </Card>
      </Stack>

      <Lightbox
        open={viewing !== null}
        onClose={() => setViewing(null)}
        items={rows.map((p) => ({
          key: p.id,
          src: sampleSrc(p.file),
          file: p.file,
          alt: p.title,
          caption: [p.title, p.category, STATUS_LABEL[p.status]].filter(Boolean).join(" · "),
        }))}
        index={viewing ?? 0}
        onIndexChange={setViewing}
        actions={(item) => (
          <Button size="sm" variant="secondary" icon="pencil" onClick={() => navigate(`/review?id=${encodeURIComponent(item.key ?? "")}`)}>
            Review
          </Button>
        )}
      />
    </Screen>
  );
}
