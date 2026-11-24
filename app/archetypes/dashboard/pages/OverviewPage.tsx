import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chart,
  DateRangePicker,
  ErrorState,
  Grid,
  Row,
  Screen,
  Stack,
  Stat,
  type DateRange,
} from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import {
  useListActivity,
  useRefreshDashboard,
  type DashboardData,
  type Metric,
  type TrendSeries,
} from "../generated/actions.gen";
import { SAMPLE_ACTIVITY, SAMPLE_METRICS, SAMPLE_SPARKLINES, SAMPLE_TRENDS } from "../lib/sample";
import { ActivityTable } from "../components/ActivityTable";

/** Last 30 days, which is what a dashboard is opened on. */
function defaultPeriod(): DateRange {
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return { from: iso(from), to: iso(to) };
}

export function OverviewPage() {
  const refresh = useRefreshDashboard();
  // The table asks the flow for one page at a time, so the app keeps no
  // records of its own: the flow owns wherever they really live and answers
  // with {rows, total}.
  const activity = useListActivity();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [trends, setTrends] = useState<TrendSeries[]>([]);
  const [period, setPeriod] = useState<DateRange>(defaultPeriod);

  useEffect(() => {
    // run() never rejects: a failure lands in refresh.error, which the
    // screen shows below.
    void refresh.run(period);
    // Ask again whenever the period changes; the flow does the filtering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.from, period.to]);

  useEffect(() => {
    if (refresh.data) {
      setMetrics(refresh.data.metrics);
      if (refresh.data.trends) setTrends(refresh.data.trends);
    }
  }, [refresh.data]);

  useEvent<DashboardData>("dashboardUpdated", (data) => {
    setMetrics(data.metrics);
    if (data.trends) setTrends(data.trends);
  });

  // Sample numbers only while the app has never had a backend: a stopped or
  // published app must not show invented numbers as if they were its own.
  const { state } = useConnection();
  const sample = state === "unconfigured" && metrics.length === 0;
  const shownMetrics = sample ? SAMPLE_METRICS : metrics;
  const shownTrends = trends.length > 0 ? trends : state === "unconfigured" ? SAMPLE_TRENDS : [];

  const failedToLoad = refresh.error !== undefined && metrics.length === 0;

  return (
    <Screen title="Overview" description="The key numbers and what happened recently.">
      <Stack gap={6}>
        <Row justify="between" align="end" wrap gap={4}>
          {/* One control for the period, with the answers people ask for
              already in it - not two date boxes and a "last 30 days" nobody
              can reach without counting backwards. */}
          <DateRangePicker value={period} onChange={setPeriod} />
          {/* Always the real action: the `action` prop handles the spinner
              and links the button to that step in the flow. */}
          <Button variant="secondary" action={refresh} params={period}>
            Refresh
          </Button>
        </Row>
        {/* The failure sits BESIDE the tiles, never in their place: ErrorState
            renders nothing when the connection banner already said it. */}
        {failedToLoad && refresh.error && (
          <ErrorState error={refresh.error} onRetry={() => void refresh.run(period)} />
        )}
        {/* One tile per row on a phone, two on a tablet, four on a desktop.
            Stat is the kit's own: this archetype used to ship a StatTile of
            its own, with its own colours, which is the compose-the-kit rule
            broken in the first file of the first screen. */}
        <Grid cols={1} mdCols={2} lgCols={4} gap={4}>
            {shownMetrics.map((metric) => (
              <Stat
                key={metric.id}
                label={metric.label}
                value={metric.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                unit={metric.unit}
                delta={metric.change_pct}
                deltaLabel={metric.change_period}
                upIsGood={metric.up_is_good}
                trend={sample ? SAMPLE_SPARKLINES[metric.id] : undefined}
                loading={refresh.loading && metrics.length === 0}
              />
            ))}
        </Grid>
        {shownTrends.length > 0 && (
          <Card>
            <CardHeader title="How we compare" description="Over the period above." />
            <CardBody>
              {/* Several series, one chart: `series` is what makes "us against
                  them over time" expressible at all. Colours come from the
                  app's accent, so nobody picks any. */}
              <Chart
                kind="line"
                xKind="time"
                title="Position over time"
                series={shownTrends}
                source={{ action: refresh }}
                legend
              />
            </CardBody>
          </Card>
        )}
        {/* The sample rows are what the table shows before the app has ever
            had a backend; the table gates them on the connection itself. */}
        <ActivityTable source={{ action: activity, pageSize: 10 }} sampleRows={SAMPLE_ACTIVITY} />
      </Stack>
    </Screen>
  );
}
