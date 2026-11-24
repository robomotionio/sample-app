import type { ReactNode } from "react";
import { Button, DataTable, type DataTableColumn, type DataTableSource } from "@robomotion/app-kit";
import type { RequestSummary } from "../generated/actions.gen";
import { navigate } from "../lib/router";
import { formatDate, waitingLabel } from "../lib/format";
import { statusOf } from "../lib/status";
import { StatusTag } from "./StatusTag";
import { ApprovalTrio } from "./ApprovalTrio";

/** The one list of vacancy requests every screen uses, so they all read the same. */
export function RequestTable({
  rows,
  loading,
  source,
  emptyState,
  show = ["status", "waiting", "approvals", "manager"],
  openLabel = "Open",
  extra = [],
}: {
  rows: RequestSummary[];
  loading?: boolean;
  source?: DataTableSource;
  emptyState: ReactNode;
  show?: ("status" | "waiting" | "approvals" | "manager" | "pbp" | "updated" | "decision")[];
  openLabel?: string;
  extra?: DataTableColumn<RequestSummary>[];
}) {
  const open = (r: RequestSummary) => navigate(`/request?id=${encodeURIComponent(r.id)}`);

  const cols: DataTableColumn<RequestSummary>[] = [
    {
      key: "job_title",
      header: "Vacancy",
      sortable: true,
      value: (r) => `${r.ref} ${r.job_title}`,
      render: (r) => (
        <div className="min-w-0">
          <div className="text-foreground truncate">{r.job_title}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {r.ref} · {r.department} · {r.location}
          </div>
        </div>
      ),
    },
  ];
  if (show.includes("manager"))
    cols.push({ key: "hiring_manager", header: "Hiring manager", sortable: true });
  if (show.includes("pbp")) cols.push({ key: "pbp", header: "People partner", sortable: true });
  if (show.includes("status"))
    cols.push({
      key: "status",
      header: "Status",
      sortable: true,
      value: (r) => statusOf(r.status).label,
      render: (r) => <StatusTag status={r.status} />,
    });
  if (show.includes("approvals"))
    cols.push({
      key: "approvals",
      header: "Sign-offs",
      value: (r) => (r.approvals ?? []).map((a) => `${a.role}:${a.decision}`).join(" "),
      render: (r) => <ApprovalTrio approvals={r.approvals} />,
    });
  if (show.includes("waiting"))
    cols.push({
      key: "stage_since",
      header: "In this stage",
      sortable: true,
      align: "right",
      value: (r) => r.stage_since ?? 0,
      render: (r) => <span className="tabular-nums text-muted-foreground">{waitingLabel(r.stage_since)}</span>,
    });
  if (show.includes("updated"))
    cols.push({
      key: "updated_at",
      header: "Last update",
      sortable: true,
      align: "right",
      value: (r) => r.updated_at ?? 0,
      render: (r) => <span className="tabular-nums text-muted-foreground">{formatDate(r.updated_at)}</span>,
    });
  cols.push(...extra);
  cols.push({
    key: "open",
    header: "",
    align: "right",
    noExport: true,
    render: (r) => (
      <Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => open(r)}>
        {openLabel}
      </Button>
    ),
  });

  return (
    <DataTable
      columns={cols}
      rows={rows}
      rowKey={(r) => r.id}
      source={source}
      loading={loading}
      filterable
      filterPlaceholder="Search by title, reference, person or place"
      onRowClick={open}
      pageSize={10}
      exportable
      exportFilename="vacancy-requests.csv"
      emptyState={emptyState}
    />
  );
}
