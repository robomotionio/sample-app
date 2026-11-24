import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, EmptyState, ErrorState, Grid, Screen, SegmentedControl, Stack, Stat } from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useListRequests } from "../generated/actions.gen";
import { useMe } from "../lib/session";
import { SAMPLE_REQUESTS } from "../lib/samples";
import { navigate } from "../lib/router";
import { RequestTable } from "../components/RequestTable";

const SAMPLE_MINE = SAMPLE_REQUESTS.filter((r) => r.hiring_manager === "Sophie Laurent");

const VIEWS: Record<string, string[]> = {
  all: [],
  moving: ["pending_hr", "pending_approval", "info_requested"],
  drafts: ["draft"],
  done: ["approved", "closed", "rejected"],
};

export function MyRequestsPage() {
  const me = useMe();
  const list = useListRequests();
  const { state } = useConnection();
  const [view, setView] = useState("all");
  const ask = () => void list.run({ scope: "mine", token: me.token });

  useEffect(() => {
    void list.run({ scope: "mine", token: me.token });
  }, [me.token]);
  useEvent("requestChanged", () => ask());

  const all = list.data?.rows ?? (state === "ready" ? [] : SAMPLE_MINE);
  const rows = VIEWS[view].length ? all.filter((r) => VIEWS[view].includes(r.status)) : all;
  const needsAnswer = all.filter((r) => r.status === "info_requested" && r.info_target === "hiring_manager");
  const count = (ss: string[]) => all.filter((r) => ss.includes(r.status)).length;

  return (
    <Screen
      title="My requests"
      description={`Every vacancy request raised by ${me.name}, and where each one stands.`}
      actions={<Button variant="primary" icon="plus" onClick={() => navigate("/new")}>New vacancy request</Button>}
    >
      <Stack gap={6}>
        {needsAnswer.length > 0 && (
          <Alert
            variant="warning"
            title={`${needsAnswer.length} request${needsAnswer.length === 1 ? " needs" : "s need"} your answer`}
            action={<Button size="sm" variant="secondary" onClick={() => navigate(`/request?id=${needsAnswer[0].id}`)}>Answer now</Button>}
          >
            Someone asked for more information before they can go on.
          </Alert>
        )}

        <Grid cols={1} mdCols={2} lgCols={4}>
          <Stat label="Drafts" value={count(["draft"])} icon="pencil" loading={list.loading && !list.data} />
          <Stat label="On their way" value={count(VIEWS.moving)} icon="hourglass" loading={list.loading && !list.data} />
          <Stat label="Approved" value={count(["approved", "closed"])} icon="circle-check" loading={list.loading && !list.data} />
          <Stat label="Rejected" value={count(["rejected"])} icon="circle-x" upIsGood={false} loading={list.loading && !list.data} />
        </Grid>

        {list.error && <ErrorState error={list.error} onRetry={ask} />}

        <Card>
          <CardBody>
            <Stack gap={4}>
              <SegmentedControl
                label="Show"
                value={view}
                onChange={setView}
                options={[
                  { value: "all", label: "All" },
                  { value: "moving", label: "In progress" },
                  { value: "drafts", label: "Drafts" },
                  { value: "done", label: "Decided" },
                ]}
              />
              <RequestTable
                rows={rows}
                source={list}
                loading={list.loading && !list.data}
                show={["status", "approvals", "waiting"]}
                emptyState={
                  <EmptyState
                    icon="file-plus"
                    title={view === "all" ? "You have not raised a request yet" : "Nothing in this view"}
                    description="Start with form 1: the role, the site and why you need it."
                    action={<Button variant="secondary" icon="plus" onClick={() => navigate("/new")}>New vacancy request</Button>}
                  />
                }
              />
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </Screen>
  );
}
