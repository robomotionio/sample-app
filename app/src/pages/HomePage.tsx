import { useEffect, useState } from "react";
import {
  Avatar, Button, Card, CardBody, ConfirmDialog, EmptyState, ErrorState, Icon,
  Row, Screen, Skeleton, Stack, Timeline, TimelineItem,
} from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useClearAllRequests, useGetOverview, useLoadSampleData, type GetOverviewResult } from "../generated/actions.gen";
import { isExecutive, roleInfo, useMe } from "../lib/session";
import { SAMPLE_HISTORY, SAMPLE_REQUESTS } from "../lib/samples";
import { statusOf, toneOf } from "../lib/status";
import { formatDateTime, waitingLabel } from "../lib/format";
import { navigate } from "../lib/router";
import { ApprovalTrio } from "../components/ApprovalTrio";

const SAMPLE_OVERVIEW: GetOverviewResult = {
  counts: { draft: 1, pending_hr: 1, pending_approval: 1, info_requested: 1, approved: 1, rejected: 1, closed: 0, total: 6 },
  needs_me: SAMPLE_REQUESTS.slice(0, 2),
  recent: SAMPLE_HISTORY,
  unread: 2,
};

export function HomePage() {
  return <Dashboard />;
}

/* ------------------------------------------------------------------ */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const NEEDS_ME_COPY: Record<string, { title: string; empty: string; go: string; path: string }> = {
  hiring_manager: { title: "Needs your input", empty: "Nothing needs you right now. Drafts and questions about your requests show up here.", go: "My requests", path: "/my" },
  people_partner: { title: "Waiting for your validation", empty: "No requests are waiting for you. New ones for your sites land here.", go: "Validation", path: "/validate" },
  ceo: { title: "Waiting for your decision", empty: "Nothing is waiting for your sign-off.", go: "Approvals", path: "/approvals" },
  cpo: { title: "Waiting for your decision", empty: "Nothing is waiting for your sign-off.", go: "Approvals", path: "/approvals" },
  cfo: { title: "Waiting for your decision", empty: "Nothing is waiting for your sign-off.", go: "Approvals", path: "/approvals" },
  talent_partner: { title: "Ready to recruit", empty: "No approved vacancies are waiting to be picked up.", go: "Recruitment", path: "/recruit" },
  admin: { title: "Open requests", empty: "Nothing is open right now.", go: "All requests", path: "/requests" },
};

type Counts = GetOverviewResult["counts"] | undefined;

/** The pipeline's stages, each with its flavour on the stripe. */
const PIPELINE: { key: string; label: string; fill: string; count: (c: Counts) => number }[] = [
  { key: "draft", label: "Drafts", fill: "g-fill-draft", count: (c) => c?.draft ?? 0 },
  { key: "hr", label: "HR validation", fill: "g-fill-hr", count: (c) => c?.pending_hr ?? 0 },
  { key: "exec", label: "Executives", fill: "g-fill-exec", count: (c) => c?.pending_approval ?? 0 },
  { key: "info", label: "Info requested", fill: "g-fill-info", count: (c) => c?.info_requested ?? 0 },
  { key: "approved", label: "Approved", fill: "g-fill-approved", count: (c) => c?.approved ?? 0 },
  { key: "rejected", label: "Rejected", fill: "g-fill-rejected", count: (c) => c?.rejected ?? 0 },
  { key: "closed", label: "Recruiting", fill: "g-fill-closed", count: (c) => c?.closed ?? 0 },
];

const FILL: Record<string, string> = {
  draft: "g-fill-draft",
  pending_hr: "g-fill-hr",
  closed: "g-fill-closed",
};

const AT_EXECUTIVES = ["pending_approval", "info_requested", "approved", "rejected"];

function Dashboard() {
  const me = useMe();
  const overview = useGetOverview();
  const loadSamples = useLoadSampleData();
  const clearAll = useClearAllRequests();
  const [clearing, setClearing] = useState(false);
  const { state } = useConnection();
  const ask = () => void overview.run({ token: me.token });

  useEffect(() => {
    void overview.run({ token: me.token });
  }, [me.token]);
  useEvent("requestChanged", () => ask());
  useEffect(() => {
    if (loadSamples.data) ask();
  }, [loadSamples.data]);

  const data = overview.data ?? (state === "ready" ? undefined : SAMPLE_OVERVIEW);
  const c = data?.counts;
  const info = roleInfo(me.role);
  const copy = NEEDS_ME_COPY[me.role];
  const firstName = me.name.split(" ")[0];
  const isEmptyApp = state === "ready" && overview.data && (overview.data.counts.total ?? 0) === 0;
  const needsMe = data?.needs_me ?? [];

  const stats = [
    { label: "In HR validation", value: c?.pending_hr ?? 0, note: "with the People partner" },
    { label: "With the executives", value: (c?.pending_approval ?? 0) + (c?.info_requested ?? 0), note: "CPO, CFO and CEO" },
    { label: "Approved", value: c?.approved ?? 0, note: "ready to recruit" },
  ];

  return (
    <Screen
      title={
        <>
          <span className="g-eyebrow mb-3">{info.title}</span>
          {greeting()}, {isExecutive(me.role) ? info.short : firstName}
        </>
      }
      description={info.blurb}
      actions={
        <Button
          variant="primary"
          className="g-go"
          iconRight="arrow-right"
          onClick={() => navigate(me.role === "hiring_manager" ? "/new" : copy.path)}
        >
          {me.role === "hiring_manager" ? "New vacancy request" : copy.go}
        </Button>
      }
    >
      <Stack gap={8}>
        {overview.error && <ErrorState error={overview.error} onRetry={ask} />}

        {isEmptyApp && (
          <Card>
            <CardBody>
              <EmptyState
                icon="sparkles"
                title="No vacancy requests yet"
                description={me.role === "admin" ? "Load a few example requests to see every stage of the route, or sign in as a hiring manager to raise the first one." : "Requests you have a part in will show up here."}
                action={
                  <Row gap={2}>
                    {me.role === "admin" && (
                      <Button variant="primary" icon="download" action={loadSamples} params={{ token: me.token }}>Load example requests</Button>
                    )}
                    {me.role === "hiring_manager" && (
                      <Button variant="secondary" icon="plus" onClick={() => navigate("/new")}>New request</Button>
                    )}
                  </Row>
                }
              />
            </CardBody>
          </Card>
        )}

        {/* The chocolate band: the number that matters to this person is the
            big one; the rest of the pipeline sits beside it, smaller. */}
        <section className="g-band px-6 py-8 md:px-10 md:py-10" aria-label="At a glance">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
            <button type="button" className="lg:col-span-5 text-left group" onClick={() => navigate(copy.path)}>
              <span className="g-eyebrow mb-4">{copy.title}</span>
              <span className="g-number g-number-hero block">{data ? needsMe.length : "–"}</span>
              <span className="g-band-muted mt-4 inline-flex items-center gap-2 text-sm font-bold">
                {needsMe.length === 0 ? "You are all caught up" : needsMe.length === 1 ? "request is waiting for you" : "requests are waiting for you"}
                <span className="transition-transform group-hover:translate-x-1">
                  <Icon name="arrow-right" size={16} />
                </span>
              </span>
            </button>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.map((s) => (
                <button key={s.label} type="button" className="g-stat" onClick={() => navigate("/requests")}>
                  <span className="g-number g-number-small block">{data ? s.value : "–"}</span>
                  <span className="block mt-3 text-sm font-bold">{s.label}</span>
                  <span className="g-band-muted block text-xs">{s.note}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* The queue: what is waiting for this person, as a quiet list. */}
          <section className="lg:col-span-7 min-w-0" aria-label={copy.title}>
            <Row justify="between" align="end" className="mb-3">
              <div>
                <span className="g-eyebrow">Your queue</span>
                <h2 className="text-2xl font-black text-foreground mt-1">{copy.title}</h2>
              </div>
              <Button size="sm" variant="ghost" iconRight="arrow-right" onClick={() => navigate(copy.path)}>{copy.go}</Button>
            </Row>
            {!data && !overview.error ? (
              <Skeleton variant="text" lines={5} />
            ) : needsMe.length === 0 ? (
              <EmptyState icon="circle-check" title="You are all caught up" description={copy.empty} />
            ) : (
              <div className="border-t border-border">
                {needsMe.slice(0, 6).map((r) => (
                  <button key={r.id} type="button" className="g-row" onClick={() => navigate(`/request?id=${encodeURIComponent(r.id)}`)}>
                    <span className="w-6 flex justify-center">
                      {AT_EXECUTIVES.includes(r.status) ? (
                        <ApprovalTrio approvals={r.approvals} />
                      ) : (
                        <span className={`g-swatch ${FILL[r.status] ?? "g-fill-draft"}`} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="g-eyebrow">{r.ref} · {r.location}</span>
                      <span className="block text-lg font-bold text-foreground truncate">{r.job_title}</span>
                      <span className="block text-sm text-muted-foreground truncate">
                        {r.hiring_manager} · {r.department} · {statusOf(r.status).label}, {waitingLabel(r.stage_since)}
                      </span>
                    </span>
                    <span className="g-row-go">
                      <Icon name="arrow-right" size={20} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="lg:col-span-5 min-w-0">
            <Stack gap={8}>
              <section aria-label="Pipeline">
                <span className="g-eyebrow">Pipeline</span>
                <h2 className="text-2xl font-black text-foreground mt-1 mb-4">Where every request stands</h2>
                <div className="g-stripe" role="img" aria-label={PIPELINE.map((p) => `${p.label}: ${p.count(c)}`).join(", ")}>
                  {PIPELINE.map((p) => (
                    <span key={p.key} className={p.fill} style={{ flexGrow: p.count(c) }} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                  {PIPELINE.map((p) => (
                    <Row key={p.key} gap={2} justify="between">
                      <Row gap={2}>
                        <span className={`g-swatch ${p.fill}`} />
                        <span className="text-sm text-muted-foreground">{p.label}</span>
                      </Row>
                      <span className="text-sm font-black tabular-nums text-foreground">{p.count(c)}</span>
                    </Row>
                  ))}
                </div>
              </section>

              <section aria-label="Latest decisions">
                <span className="g-eyebrow">Audit trail</span>
                <h2 className="text-2xl font-black text-foreground mt-1 mb-4">Latest decisions</h2>
                {data && data.recent.length === 0 ? (
                  <EmptyState icon="history" title="Nothing has happened yet" description="Every submission, validation and decision is recorded here." />
                ) : (
                  <Timeline>
                    {(data?.recent ?? []).slice(0, 4).map((e) => (
                      <TimelineItem
                        key={e.id}
                        at={formatDateTime(e.at)}
                        title={
                          <button type="button" className="text-left hover:underline" onClick={() => e.request_id && navigate(`/request?id=${e.request_id}`)}>
                            <span className="text-muted-foreground tabular-nums">{e.ref}</span> {e.title}
                          </button>
                        }
                        body={e.note}
                        status={toneOf(e.tone)}
                        by={<Avatar size="xs" name={e.actor_name} />}
                      />
                    ))}
                  </Timeline>
                )}
              </section>
            </Stack>
          </aside>
        </div>

        {me.role === "admin" && (
          <Row justify="end">
            <Button size="sm" variant="ghost" icon="rotate-cw" onClick={() => setClearing(true)}>
              Clear all requests
            </Button>
          </Row>
        )}
      </Stack>
      <ConfirmDialog
        open={clearing}
        onClose={() => setClearing(false)}
        title="Remove every request?"
        description="Every vacancy request, its history and all notifications are removed for everyone, so the app starts empty again. You cannot undo this."
        confirmLabel="Remove everything"
        danger
        action={clearAll}
        params={() => ({ token: me.token, confirm: true })}
      />
    </Screen>
  );
}
