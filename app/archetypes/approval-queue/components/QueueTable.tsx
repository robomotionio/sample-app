import {
  DataTable,
  EmptyState,
  StatusBadge,
  type DataTableBulkAction,
} from "@robomotion/app-kit";
import type { QueueItem } from "../generated/actions.gen";

function formatAmount(item: QueueItem): string {
  if (item.amount === undefined) return "";
  if (item.currency) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: item.currency,
    }).format(item.amount);
  }
  return new Intl.NumberFormat().format(item.amount);
}

/**
 * The queue as a table people can work through two ways: click one row to
 * review it on the right, or tick a run of them and clear the lot in one
 * press. `rowKey` is required by `selectable` because the ticks belong to
 * records, not to row slots - without it, turning the page would silently
 * reassign the selection to different items.
 */
export function QueueTable({
  items,
  loading,
  selectedId,
  onSelect,
  bulkActions,
}: {
  items: QueueItem[];
  /** True while the first page is on its way. */
  loading?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  bulkActions?: DataTableBulkAction<QueueItem>[];
}) {
  return (
    <DataTable<QueueItem>
      columns={[
        { key: "title", header: "What", sortable: true },
        { key: "requester", header: "Who" },
        {
          key: "amount",
          header: "Amount",
          value: (row) => row.amount ?? null,
          render: (row) => formatAmount(row),
          align: "right",
          sortable: true,
        },
        {
          key: "open",
          header: "",
          render: (row) =>
            row.id === selectedId ? <StatusBadge status="pending">Reviewing</StatusBadge> : null,
        },
        {
          key: "submitted_at",
          header: "Waiting since",
          value: (row) => row.submitted_at,
          render: (row) =>
            new Date(row.submitted_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
          align: "right",
          sortable: true,
        },
      ]}
      rows={items}
      loading={loading}
      rowKey={(row) => row.id}
      selectable
      bulkActions={bulkActions}
      exportable
      exportFilename="waiting-for-a-decision.csv"
      filterable
      filterPlaceholder="Find an item"
      caption="Items waiting for a decision"
      pageSize={10}
      onRowClick={(row) => onSelect(row.id)}
      emptyState={
        <EmptyState
          title="All caught up"
          description="New items will appear here when the robot adds them."
        />
      }
    />
  );
}
