import { useEffect, useState } from "react";
import {
  ErrorState,
  Screen,
  Stack,
  useToast,
  type DataTableBulkAction,
} from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import {
  useApproveItem,
  useApproveMany,
  useListQueue,
  useRejectItem,
  type QueueItem,
} from "../generated/actions.gen";
import { SAMPLE_QUEUE } from "../lib/sample";
import { DecisionPane } from "../components/DecisionPane";
import { QueueTable } from "../components/QueueTable";

export function QueuePage() {
  const { toast } = useToast();
  // The app keeps no queue of its own. The flow owns wherever the items
  // really live and hands back a page of them; this asks on mount and again
  // whenever a decision lands.
  const queue = useListQueue();
  const approve = useApproveItem();
  const approveMany = useApproveMany();
  const reject = useRejectItem();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sample items only while the app has never had a backend: a stopped or
  // published app must not show invented items as if they were its own.
  const { state } = useConnection();
  const loaded = queue.data?.rows ?? (state === "unconfigured" ? SAMPLE_QUEUE : []);
  const pending = loaded
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));

  const selected = pending.find((item) => item.id === selectedId) ?? pending[0] ?? null;

  useEffect(() => {
    void queue.run({ limit: 50 });
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEvent<QueueItem>("itemDecided", (item) => {
    // Somebody decided something, here or elsewhere: ask again.
    void queue.run({ limit: 50 });
    toast({
      title: `"${item.title}" was ${item.status === "approved" ? "approved" : "rejected"}.`,
    });
  });

  // A decision that does not go through leaves its reason on the hook rather
  // than throwing, so the failure is announced from there.
  const failure = approve.error ?? reject.error ?? approveMany.error;
  useEffect(() => {
    if (failure) {
      toast({
        title: "The decision could not be sent.",
        description: failure.message,
        variant: "error",
      });
    }
  }, [failure, toast]);

  /**
   * The bulk half of the job: tick a run of items and clear them in one
   * press. The table hands the action its selection - either the ticked keys
   * or "everything this filter matches" - and the flow does the work, which
   * is the only version of this that survives a queue of ten thousand.
   */
  const bulkActions: DataTableBulkAction<QueueItem>[] = [
    {
      label: "Approve",
      action: approveMany,
      // The selection goes to the flow in the contract's own words: which
      // ids, or "all of them under this filter".
      params: (selection) => ({
        ids: selection.keys,
        all_matching: selection.allMatching,
        filter: selection.filter,
      }),
    },
  ];

  return (
    <Screen title="Queue" description="Work through the items waiting for a decision.">
      <Stack gap={6}>
        {/* The failure sits BESIDE the table, never in its place. */}
        {queue.error && (
          <ErrorState error={queue.error} onRetry={() => void queue.run({ limit: 50 })} />
        )}
        <QueueTable
          items={pending}
          loading={queue.loading && !queue.data}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          bulkActions={bulkActions}
        />
        {selected && <DecisionPane item={selected} approve={approve} reject={reject} />}
      </Stack>
    </Screen>
  );
}
