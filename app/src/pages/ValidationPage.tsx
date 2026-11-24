import { useEffect } from "react";
import { Card, CardBody, EmptyState, ErrorState, Grid, Screen, Stack, Stat, Tab, TabPanel, Tabs } from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useListRequests } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { SAMPLE_REQUESTS } from "../lib/samples";
import { daysSince } from "../lib/format";
import { RequestTable } from "../components/RequestTable";

const SAMPLE_TO_VALIDATE = SAMPLE_REQUESTS.filter((r) => r.status === "pending_hr" || r.info_target === "people_partner");
const SAMPLE_VALIDATED = SAMPLE_REQUESTS.filter((r) => ["pending_approval", "approved", "rejected"].includes(r.status));

export function ValidationPage() {
  const me = useMe();
  const waiting = useListRequests();
  const done = useListRequests();
  const { state } = useConnection();
  const ask = () => {
    void waiting.run({ scope: "to_validate", token: me.token });
    void done.run({ scope: "validated", token: me.token });
  };

  useEffect(() => {
    void waiting.run({ scope: "to_validate", token: me.token });
    void done.run({ scope: "validated", token: me.token });
  }, [me.token]);
  useEvent("requestChanged", () => ask());

  const toDo = waiting.data?.rows ?? (state === "ready" ? [] : SAMPLE_TO_VALIDATE);
  const history = done.data?.rows ?? (state === "ready" ? [] : SAMPLE_VALIDATED);
  const questions = toDo.filter((r) => r.status === "info_requested").length;
  const oldest = toDo.reduce((m, r) => Math.max(m, daysSince(r.stage_since)), 0);

  return (
    <Screen
      title="Validation"
      description={`Requests for ${me.name}'s sites. Check the need, the budget and the package, then send them to the executives or back to the hiring manager.`}
    >
      <Stack gap={6}>
        <Grid cols={1} mdCols={3}>
          <Stat label="Waiting for you" value={toDo.length} icon="inbox" emphasis="inverted" loading={waiting.loading && !waiting.data} />
          <Stat label="Questions from executives" value={questions} icon="circle-help" loading={waiting.loading && !waiting.data} />
          <Stat label="Oldest waiting" value={oldest} unit={oldest === 1 ? "day" : "days"} icon="timer" loading={waiting.loading && !waiting.data} />
        </Grid>

        {waiting.error && <ErrorState error={waiting.error} onRetry={ask} />}

        <Card>
          <CardBody>
            <Tabs defaultValue="todo" label="Validation">
              <Tab value="todo" icon="inbox" badge={toDo.length}>To validate</Tab>
              <Tab value="done" icon="history">Validated by me</Tab>
              <TabPanel value="todo">
                <RequestTable
                  rows={toDo}
                  source={waiting}
                  loading={waiting.loading && !waiting.data}
                  show={["status", "manager", "waiting"]}
                  openLabel="Validate"
                  emptyState={<EmptyState icon="circle-check" title="Nothing to validate" description="New requests for your sites land here as soon as a hiring manager sends them." />}
                />
              </TabPanel>
              <TabPanel value="done">
                <RequestTable
                  rows={history}
                  source={done}
                  loading={done.loading && !done.data}
                  show={["status", "approvals", "manager", "updated"]}
                  emptyState={<EmptyState icon="history" title="You have not validated a request yet" description="Requests you send on stay listed here with their outcome." />}
                />
              </TabPanel>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>
    </Screen>
  );
}
