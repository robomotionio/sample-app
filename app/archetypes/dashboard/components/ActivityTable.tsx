import {
  Card,
  CardBody,
  CardHeader,
  DataTable,
  type DataTableSource,
  EmptyState,
  StatusBadge,
} from "@robomotion/app-kit";
import { useConnection } from "@robomotion/apps-runtime/react";
import type { Activity } from "../generated/actions.gen";

const statusLabels: Record<Activity["status"], string> = {
  ok: "Done",
  warn: "Needs attention",
  error: "Failed",
  pending: "Waiting",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityTable({
  source,
  sampleRows,
}: {
  /** The action the table pages through. */
  source: DataTableSource;
  /** Shown only before the app has ever had a backend. */
  sampleRows?: Activity[];
}) {
  // Sample rows only while the app has never had a backend: a stopped or
  // published app must not show invented rows as if they were its own.
  const { state } = useConnection();
  const fallbackRows = state === "unconfigured" ? sampleRows : undefined;
  return (
    <Card>
      <CardHeader>Recent activity</CardHeader>
      <CardBody>
        <DataTable<Activity>
          columns={[
            { key: "title", header: "What happened" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge status={row.status}>{statusLabels[row.status]}</StatusBadge>
              ),
            },
            { key: "actor", header: "Who", render: (row) => row.actor ?? "The robot" },
            {
              key: "at",
              header: "When",
              render: (row) => formatWhen(row.at),
              sortable: true,
              align: "right",
            },
          ]}
          rows={fallbackRows}
          source={source}
          rowKey={(row) => row.id}
          pageSize={10}
          emptyState={
            <EmptyState
              title="Nothing yet"
              description="Activity will show up here once the robot starts working."
            />
          }
        />
      </CardBody>
    </Card>
  );
}
