import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, EmptyState, ErrorState, Kanban, KanbanCard, KanbanColumn, Screen, SegmentedControl, Stack, Toolbar } from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useListRequests, useSendReminders } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { SAMPLE_REQUESTS } from "../lib/samples";
import { STATUS, statusOf } from "../lib/status";
import { waitingLabel } from "../lib/format";
import { navigate } from "../lib/router";
import { RequestTable } from "../components/RequestTable";
import { ApprovalTrio } from "../components/ApprovalTrio";

const BOARD = ["draft", "pending_hr", "pending_approval", "info_requested", "approved", "closed", "rejected"];

export function AllRequestsPage() {
  const me = useMe();
  const list = useListRequests();
  const remind = useSendReminders();
  const { state } = useConnection();
  const [view, setView] = useState("list");
  const [status, setStatus] = useState<string | undefined>();
  const ask = () => void list.run({ scope: "all", token: me.token });

  useEffect(() => {
    void list.run({ scope: "all", token: me.token });
  }, [me.token]);
  useEvent("requestChanged", () => ask());

  const all = list.data?.rows ?? (state === "ready" ? [] : SAMPLE_REQUESTS);
  const rows = status ? all.filter((r) => r.status === status) : all;

  return (
    <Screen
      title="All requests"
      description="Every vacancy request you have a part in, and the stage it is in. Click one to see its forms, sign-offs and audit trail."
      actions={
        me.role === "people_partner" || me.role === "admin" ? (
          <Button variant="secondary" icon="bell" action={remind} params={{ token: me.token }}>
            Send reminders now
          </Button>
        ) : undefined
      }
    >
      <Stack gap={4}>
        {remind.data && (
          <Alert variant={remind.data.sent > 0 ? "success" : "info"} title={remind.data.sent > 0 ? `${remind.data.sent} reminder${remind.data.sent === 1 ? "" : "s"} sent` : "No reminders needed"}>
            {remind.data.sent > 0
              ? "Executives who left a request waiting a week or more have been reminded."
              : "No executive has left a request waiting a week or more. Reminders also go out by themselves every few hours."}
          </Alert>
        )}
        {remind.error && <ErrorState error={remind.error} title="Reminders were not sent" />}
        {list.error && <ErrorState error={list.error} onRetry={ask} />}

        <Toolbar
          end={
            <SegmentedControl
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: "List", icon: "list" },
                { value: "board", label: "Board", icon: "kanban" },
              ]}
            />
          }
        >
          {Object.entries(STATUS).map(([key, s]) => (
            <Button key={key} size="sm" variant={status === key ? "primary" : "ghost"} icon={s.icon}
              onClick={() => setStatus(status === key ? undefined : key)}>
              {s.label} <span className="tabular-nums opacity-70">{all.filter((r) => r.status === key).length}</span>
            </Button>
          ))}
        </Toolbar>

        {view === "list" ? (
          <Card>
            <CardBody>
              <RequestTable
                rows={rows}
                source={list}
                loading={list.loading && !list.data}
                show={["status", "approvals", "manager", "pbp", "waiting"]}
                emptyState={<EmptyState icon="search" title={status ? `No requests are ${statusOf(status).label.toLowerCase()}` : "No requests yet"} description="Requests appear here as soon as a hiring manager saves one." />}
              />
            </CardBody>
          </Card>
        ) : (
          <Kanban>
            {BOARD.filter((k) => !status || k === status).map((key) => {
              const inCol = all.filter((r) => r.status === key);
              return (
                <KanbanColumn key={key} id={key} title={STATUS[key].label} meta={<Badge size="sm" variant={STATUS[key].variant}>{inCol.length}</Badge>}
                  emptyState={<span className="text-xs text-muted-foreground">None</span>}>
                  {inCol.map((r) => (
                    <KanbanCard key={r.id} id={r.id} disabled>
                      <button type="button" className="w-full text-left" onClick={() => navigate(`/request?id=${r.id}`)}>
                        <Stack gap={2}>
                          <div className="text-sm text-foreground">{r.job_title}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">{r.ref} · {r.location}</div>
                          {(key === "pending_approval" || key === "info_requested") && <ApprovalTrio approvals={r.approvals} />}
                          <div className="text-xs text-muted-foreground">{r.hiring_manager} · {waitingLabel(r.stage_since)}</div>
                        </Stack>
                      </button>
                    </KanbanCard>
                  ))}
                </KanbanColumn>
              );
            })}
          </Kanban>
        )}
      </Stack>
    </Screen>
  );
}
