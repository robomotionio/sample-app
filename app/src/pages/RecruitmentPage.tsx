import { useEffect } from "react";
import { Card, CardBody, EmptyState, ErrorState, Grid, Screen, Stack, Stat, Tab, TabPanel, Tabs } from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useListRequests } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { SAMPLE_REQUESTS } from "../lib/samples";
import { RequestTable } from "../components/RequestTable";

const SAMPLE_READY = SAMPLE_REQUESTS.filter((r) => r.status === "approved");

export function RecruitmentPage() {
  const me = useMe();
  const ready = useListRequests();
  const started = useListRequests();
  const { state } = useConnection();
  const ask = () => {
    void ready.run({ scope: "to_recruit", token: me.token });
    void started.run({ scope: "recruited", token: me.token });
  };

  useEffect(() => {
    void ready.run({ scope: "to_recruit", token: me.token });
    void started.run({ scope: "recruited", token: me.token });
  }, [me.token]);
  useEvent("requestChanged", () => ask());

  const toStart = ready.data?.rows ?? (state === "ready" ? [] : SAMPLE_READY);
  const handed = started.data?.rows ?? (state === "ready" ? [] : []);

  return (
    <Screen
      title="Recruitment"
      description="Vacancies with all three sign-offs. Open one to see the approved details, set it up in Deel ATS, then mark it as started."
    >
      <Stack gap={6}>
        <Grid cols={1} mdCols={2}>
          <Stat label="Ready to recruit" value={toStart.length} icon="circle-check" emphasis="inverted" loading={ready.loading && !ready.data} />
          <Stat label="Handed to Deel ATS" value={handed.length} icon="archive" loading={started.loading && !started.data} />
        </Grid>

        {ready.error && <ErrorState error={ready.error} onRetry={ask} />}

        <Card>
          <CardBody>
            <Tabs defaultValue="ready" label="Recruitment">
              <Tab value="ready" icon="megaphone" badge={toStart.length}>Ready to recruit</Tab>
              <Tab value="started" icon="archive">Started in Deel</Tab>
              <TabPanel value="ready">
                <RequestTable
                  rows={toStart}
                  source={ready}
                  loading={ready.loading && !ready.data}
                  show={["manager", "pbp", "waiting"]}
                  openLabel="Pick up"
                  emptyState={<EmptyState icon="megaphone" title="No approved vacancies waiting" description="You are notified here as soon as the CEO, CPO and CFO have all approved one." />}
                />
              </TabPanel>
              <TabPanel value="started">
                <RequestTable
                  rows={handed}
                  source={started}
                  loading={started.loading && !started.data}
                  show={["manager", "pbp", "updated"]}
                  emptyState={<EmptyState icon="archive" title="Nothing handed over yet" description="Vacancies you mark as started in Deel ATS are kept here." />}
                />
              </TabPanel>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>
    </Screen>
  );
}
