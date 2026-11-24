import {
  Button,
  DataTable,
  EmptyState,
  Screen,
  useToast,
  type DataTableApi,
} from "@robomotion/app-kit";
import { useRef } from "react";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { navigate } from "@/lib/router";
import { useListRequests, type WorkRequest } from "../generated/actions.gen";
import { categoryLabel } from "../lib/categories";
import { SAMPLE_REQUESTS } from "../lib/sample";
import { RequestStatusBadge } from "../components/RequestStatusBadge";

const dayFormat: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, dayFormat);
}

function formatDay(isoDate: string): string {
  // Date-only strings parse as UTC; adding a time keeps them in local time.
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, dayFormat);
}

export function RequestsPage() {
  const { toast } = useToast();
  // The app keeps no records of its own. The flow owns wherever the requests
  // really live - a database beside the robot, a spreadsheet, the system they
  // were sent to - and answers one page at a time. The table asks; nothing
  // here holds a copy.
  const live = useListRequests();
  const table = useRef<DataTableApi | null>(null);
  // Sample rows only while the app has never had a backend: a stopped or
  // published app must not show invented rows as if they were its own.
  const { state } = useConnection();
  const sampleRows = state === "unconfigured" ? SAMPLE_REQUESTS : undefined;

  useEvent<WorkRequest>("requestUpdated", (request) => {
    // The row on screen is now out of date, so ask for the page again.
    table.current?.refresh();
    if (request.status === "done") {
      toast({ title: `"${request.title}" is done.`, variant: "success" });
    } else if (request.status === "failed") {
      toast({
        title: `"${request.title}" did not go through.`,
        description: "Open it to see what happened.",
        variant: "error",
      });
    }
  });

  return (
    <Screen title="Requests" description="Every request and where it stands.">
      <DataTable<WorkRequest>
        columns={[
          { key: "title", header: "Request" },
          { key: "category", header: "Kind", render: (row) => categoryLabel(row.category) },
          {
            key: "status",
            header: "Status",
            render: (row) => <RequestStatusBadge status={row.status} />,
          },
          {
            key: "needed_by",
            header: "Needed by",
            render: (row) => (row.needed_by ? formatDay(row.needed_by) : ""),
          },
          {
            key: "submitted_at",
            header: "Sent",
            render: (row) => formatDateTime(row.submitted_at),
            sortable: true,
            align: "right",
          },
        ]}
        // The sample rows fill the table before the app has ever had a
        // backend; once the flow answers, the answer owns it.
        rows={sampleRows}
        source={{ action: live, pageSize: 15 }}
        tableRef={table}
        rowKey={(row) => row.id}
        filterable
        filterPlaceholder="Filter requests"
        emptyState={
          <EmptyState
            title="No requests yet"
            description="Send your first request and it will show up here."
            action={
              <Button variant="primary" onClick={() => navigate("/")}>
                Send a request
              </Button>
            }
          />
        }
      />
    </Screen>
  );
}
