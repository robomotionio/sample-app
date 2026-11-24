import type { MutableRefObject } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  StatusBadge,
  type DataTableApi,
  type DataTableSource,
} from "@robomotion/app-kit";
import { useConnection } from "@robomotion/apps-runtime/react";
import type { ReviewedDocument } from "../generated/actions.gen";

const badges: Record<
  ReviewedDocument["status"],
  { status: "ok" | "warn" | "error" | "pending"; label: string }
> = {
  reading: { status: "pending", label: "Being read" },
  needs_review: { status: "warn", label: "Needs a check" },
  confirmed: { status: "ok", label: "Confirmed" },
};

function formatTotal(doc: ReviewedDocument): string {
  if (doc.fields.total === undefined) return "";
  if (doc.fields.currency) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: doc.fields.currency,
    }).format(doc.fields.total);
  }
  return new Intl.NumberFormat().format(doc.fields.total);
}

export function DocumentHistory({
  source,
  sampleRows,
  tableRef,
}: {
  /** The action the table pages through. */
  source: DataTableSource;
  /** Shown only before the app has ever had a backend. */
  sampleRows?: ReviewedDocument[];
  /** Lets the screen re-ask when a document finishes. */
  tableRef?: MutableRefObject<DataTableApi | null>;
}) {
  // Sample rows only while the app has never had a backend: a stopped or
  // published app must not show invented rows as if they were its own.
  const { state } = useConnection();
  const fallbackRows = state === "unconfigured" ? sampleRows : undefined;
  return (
    <Card>
      <CardHeader>Documents</CardHeader>
      <CardBody>
        <DataTable<ReviewedDocument>
          columns={[
            { key: "name", header: "File", render: (row) => row.file.name },
            { key: "number", header: "Reference", render: (row) => row.fields.number ?? "" },
            {
              key: "total",
              header: "Total",
              render: (row) => formatTotal(row),
              align: "right",
            },
            {
              key: "status",
              header: "Status",
              render: (row) => {
                const badge = badges[row.status];
                return <StatusBadge status={badge.status}>{badge.label}</StatusBadge>;
              },
            },
            {
              key: "uploaded_at",
              header: "Uploaded",
              render: (row) =>
                new Date(row.uploaded_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }),
              sortable: true,
              align: "right",
            },
          ]}
          rows={fallbackRows}
          source={source}
          tableRef={tableRef}
          rowKey={(row) => row.id}
          pageSize={10}
          emptyState={
            <EmptyState
              title="No documents yet"
              description="Upload a document above to get started."
            />
          }
        />
      </CardBody>
    </Card>
  );
}
