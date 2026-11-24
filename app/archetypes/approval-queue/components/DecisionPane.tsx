import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  Row,
  TextArea,
  type ActionLike,
} from "@robomotion/app-kit";
import type { ApproveItemParams, QueueItem, RejectItemParams } from "../generated/actions.gen";

export type Decision = "approved" | "rejected";

function formatAmount(item: QueueItem): string | null {
  if (item.amount === undefined) return null;
  return new Intl.NumberFormat(undefined, {
    style: item.currency ? "currency" : "decimal",
    currency: item.currency,
  }).format(item.amount);
}

export function DecisionPane({
  item,
  approve,
  reject,
}: {
  item: QueueItem;
  /** The approveItem call. The button runs it and is linked to that step in the flow. */
  approve: ActionLike<ApproveItemParams>;
  /** The rejectItem call, same arrangement. */
  reject: ActionLike<RejectItemParams>;
}) {
  const [note, setNote] = useState("");

  // A fresh item gets a fresh note.
  useEffect(() => setNote(""), [item.id]);

  const amount = formatAmount(item);
  const busy = approve.loading || reject.loading;
  const canReject = !busy && note.trim() !== "";

  return (
    <Card>
      <CardHeader>{item.title}</CardHeader>
      <CardBody>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-zinc-500 dark:text-zinc-400">Requested by</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{item.requester}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500 dark:text-zinc-400">Sent on</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {new Date(item.submitted_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          {amount && (
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">Amount</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-50">{amount}</dd>
            </div>
          )}
        </dl>
        {item.summary && (
          <p className="mt-4 text-zinc-700 dark:text-zinc-300">{item.summary}</p>
        )}
        <div className="mt-4">
          <Field
            name="note"
            label="Note"
            help="Optional for approvals, required when rejecting."
          >
            <TextArea
              value={note}
              onChange={setNote}
              rows={3}
              placeholder="Why you decided this way"
            />
          </Field>
        </div>
      </CardBody>
      <CardFooter>
        <Row gap={3} justify="end">
          <Button
            variant="danger"
            action={reject}
            params={{ id: item.id, reason: note.trim() }}
            disabled={!canReject}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            action={approve}
            params={{ id: item.id, note: note.trim() || undefined }}
            disabled={reject.loading}
          >
            Approve
          </Button>
        </Row>
      </CardFooter>
    </Card>
  );
}
