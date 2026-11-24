import { useEffect } from "react";
import { Badge, Card, CardBody, EmptyState, ErrorState, Grid, Screen, Stack, Stat, Tab, TabPanel, Tabs } from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useListRequests, type RequestSummary } from "../generated/actions.gen";
import { roleInfo, useMe } from "../lib/session";
import { SAMPLE_REQUESTS } from "../lib/samples";
import { daysSince, REMINDER_DAYS } from "../lib/format";
import { decisionOf } from "../lib/status";
import { RequestTable } from "../components/RequestTable";

const SAMPLE_AWAITING = SAMPLE_REQUESTS.filter((r) => r.status === "pending_approval");
const SAMPLE_DECIDED = SAMPLE_REQUESTS.filter((r) => ["approved", "rejected", "info_requested"].includes(r.status))
  .map((r) => ({ ...r, my_decision: r.approvals?.find((a) => a.role === "cfo")?.decision }));

export function ApprovalsPage() {
  const me = useMe();
  const awaiting = useListRequests();
  const decided = useListRequests();
  const { state } = useConnection();
  const info = roleInfo(me.role);
  const ask = () => {
    void awaiting.run({ scope: "awaiting_me", token: me.token });
    void decided.run({ scope: "decided_by_me", token: me.token });
  };

  useEffect(() => {
    void awaiting.run({ scope: "awaiting_me", token: me.token });
    void decided.run({ scope: "decided_by_me", token: me.token });
  }, [me.token]);
  useEvent("requestChanged", () => ask());

  const toDecide = awaiting.data?.rows ?? (state === "ready" ? [] : SAMPLE_AWAITING);
  const mine = decided.data?.rows ?? (state === "ready" ? [] : SAMPLE_DECIDED);
  const overdue = toDecide.filter((r) => daysSince(r.stage_since) >= REMINDER_DAYS).length;
  const approvedByMe = mine.filter((r) => r.my_decision === "approved").length;
  const rejectedByMe = mine.filter((r) => r.my_decision === "rejected").length;

  const myDecisionColumn = {
    key: "my_decision",
    header: "My decision",
    value: (r: RequestSummary) => decisionOf(r.my_decision).label,
    render: (r: RequestSummary) => {
      const d = decisionOf(r.my_decision);
      return <Badge variant={d.variant} icon={d.icon}>{d.label}</Badge>;
    },
  };

  return (
    <Screen
      title="Approvals"
      description={`Vacancies validated by the People team and waiting for the ${info.short}. All three executives must approve; one rejection stops the request.`}
    >
      <Stack gap={6}>
        <Grid cols={1} mdCols={2} lgCols={4}>
          <Stat label="Waiting for my decision" value={toDecide.length} icon="inbox" emphasis="inverted" loading={awaiting.loading && !awaiting.data} />
          <Stat label={`Waiting ${REMINDER_DAYS}+ days`} value={overdue} icon="bell" upIsGood={false} loading={awaiting.loading && !awaiting.data} />
          <Stat label="Approved by me" value={approvedByMe} icon="circle-check" loading={decided.loading && !decided.data} />
          <Stat label="Rejected by me" value={rejectedByMe} icon="circle-x" loading={decided.loading && !decided.data} />
        </Grid>

        {awaiting.error && <ErrorState error={awaiting.error} onRetry={ask} />}

        <Card>
          <CardBody>
            <Tabs defaultValue="waiting" label="Approvals">
              <Tab value="waiting" icon="hourglass" badge={toDecide.length}>Awaiting my decision</Tab>
              <Tab value="decided" icon="history">My decisions</Tab>
              <TabPanel value="waiting">
                <RequestTable
                  rows={toDecide}
                  source={awaiting}
                  loading={awaiting.loading && !awaiting.data}
                  show={["approvals", "manager", "waiting"]}
                  openLabel="Review and decide"
                  emptyState={<EmptyState icon="circle-check" title="Nothing waiting for you" description="Validated requests appear here the moment the People team sends them." />}
                />
              </TabPanel>
              <TabPanel value="decided">
                <RequestTable
                  rows={mine}
                  source={decided}
                  loading={decided.loading && !decided.data}
                  show={["status", "approvals", "updated"]}
                  extra={[myDecisionColumn]}
                  emptyState={<EmptyState icon="history" title="No decisions yet" description="Every request you approve, reject or question stays listed here." />}
                />
              </TabPanel>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>
    </Screen>
  );
}
