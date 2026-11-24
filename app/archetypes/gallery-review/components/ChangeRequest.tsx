import { Card, CardBody, CardHeader, Composer, MarkList, Stack, type Mark } from "@robomotion/app-kit";

/**
 * The saying half of "point and say something": the numbered marks with a
 * note beside each, and one sentence about what should change. Bound to the
 * same marks as the photo, so the list and the picture never disagree.
 */
export function ChangeRequest({
  marks,
  onMarksChange,
  selectedId,
  onSelect,
  busy,
  onSend,
}: {
  marks: Mark[];
  onMarksChange: (marks: Mark[]) => void;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  /** True while the request is going out. */
  busy: boolean;
  /** Called with the sentence; the page makes the marked-up copy and sends it. */
  onSend: (note: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="What needs fixing"
        description="Mark the places on the photo, add a note to any of them, then say what should change."
      />
      <CardBody>
        <Stack gap={4}>
          <MarkList
            marks={marks}
            onMarksChange={onMarksChange}
            selectedId={selectedId}
            onSelect={onSelect}
            readOnly={busy}
            emptyState="Nothing marked yet. Pick a tool above the photo and point at what is wrong."
          />
          <Composer
            placeholder="Say what should change"
            sendLabel="Send back"
            busy={busy}
            disabled={busy}
            onSend={onSend}
          />
        </Stack>
      </CardBody>
    </Card>
  );
}
