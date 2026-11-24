import { useEffect } from "react";
import {
  Alert, Avatar, Badge, Card, CardBody, CardHeader, DescriptionList, EmptyState, ErrorState, Grid, Row, Screen,
  Skeleton, Stack, Timeline, TimelineItem,
} from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useGetRequest, type Changed, type RequestDetail } from "../generated/actions.gen";
import { isExecutive, roleInfo, useMe } from "../lib/session";
import { SAMPLE_DETAIL } from "../lib/samples";
import { decisionOf, RECOMMENDATION, statusOf, toneOf } from "../lib/status";
import { daysSince, formatDate, formatDateTime, formatDay, REMINDER_DAYS, waitingLabel } from "../lib/format";
import { useSearch } from "../lib/router";
import { ApprovalTrio } from "../components/ApprovalTrio";
import { StatusTag } from "../components/StatusTag";
import { RequestJourney } from "../components/RequestJourney";
import { ValidationPanel } from "../components/ValidationPanel";
import { DecisionPanel } from "../components/DecisionPanel";
import { AnswerPanel } from "../components/AnswerPanel";
import { DraftPanel } from "../components/DraftPanel";
import { RecruitPanel } from "../components/RecruitPanel";

const ORDER = ["cpo", "cfo", "ceo"];

export function RequestPage() {
  const id = new URLSearchParams(useSearch()).get("id") ?? "";
  const me = useMe();
  const req = useGetRequest();
  const { state } = useConnection();

  useEffect(() => {
    if (id) void req.run({ id, token: me.token });
  }, [id]);
  useEvent<Changed>("requestChanged", (c) => {
    if (c.id === id) void req.run({ id, token: me.token });
  });

  const r: RequestDetail | undefined = req.data ?? (state === "ready" ? undefined : SAMPLE_DETAIL);

  if (!r) {
    return (
      <Screen title="Vacancy request" backPath="/requests">
        {req.error ? (
          <ErrorState error={req.error} onRetry={() => void req.run({ id, token: me.token })} />
        ) : !id ? (
          <EmptyState icon="search" title="No request chosen" description="Open one from a list." />
        ) : (
          <Skeleton variant="text" lines={8} />
        )}
      </Screen>
    );
  }

  const f1 = r.form1;
  const f2 = r.form2;
  const backPath =
    me.role === "hiring_manager" ? "/my"
      : me.role === "people_partner" ? "/validate"
      : isExecutive(me.role) ? "/approvals"
      : me.role === "talent_partner" ? "/recruit" : "/requests";

  return (
    <Screen
      title={f1.job_title || "Vacancy request"}
      description={`${r.ref} · raised by ${r.hiring_manager ?? f1.hiring_manager ?? "-"} on ${formatDate(r.created_at)} · ${statusOf(r.status).label} for ${waitingLabel(r.stage_since)}`}
      badge={<StatusTag status={r.status} />}
      backPath={backPath}
    >
      <Stack gap={6}>
        {req.error && <ErrorState error={req.error} onRetry={() => void req.run({ id, token: me.token })} />}

        <Card>
          <CardBody>
            <RequestJourney status={r.status} approvals={r.approvals} infoTarget={r.info?.target} />
          </CardBody>
        </Card>

        <YourMove request={r} />

        <Grid cols={1} lgCols={3} gap={6}>
          <div className="lg:col-span-2">
            <Stack gap={6}>
              <Card>
                <CardHeader title="Request" icon="file-text" description={`Form 1 · ${f1.hiring_manager ?? r.hiring_manager ?? ""}`} />
                <CardBody>
                  <DescriptionList
                    columns={2}
                    items={[
                      { label: "Job title", value: f1.job_title },
                      { label: "Role type", value: f1.role_type },
                      { label: "Department", value: f1.department },
                      { label: "Location", value: f1.location },
                      { label: "Reporting manager", value: f1.reporting_manager },
                      { label: "Desired start date", value: formatDay(f1.desired_start_date) },
                      { label: "Date of request", value: formatDay(f1.request_date) },
                      { label: "Hiring manager", value: f1.hiring_manager },
                      { label: "Business justification", value: f1.business_justification, wide: true },
                    ]}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Validation"
                  icon="clipboard-check"
                  description={f2 && f2.hr_recommendation ? `Form 2 · ${r.pbp ?? "People Business Partner"}` : `Form 2 · waiting for ${r.pbp ?? "the People Business Partner"}`}
                  actions={f2?.hr_recommendation ? (
                    <Badge variant={f2.hr_recommendation === "not_supported" ? "danger" : f2.hr_recommendation === "support" ? "success" : "warning"}>
                      {RECOMMENDATION[f2.hr_recommendation] ?? f2.hr_recommendation}
                    </Badge>
                  ) : undefined}
                />
                <CardBody>
                  {f2 && f2.hr_recommendation ? (
                    <DescriptionList
                      columns={2}
                      items={[
                        { label: "Proposed salary range", value: f2.salary_range },
                        { label: "Job family / Hay level", value: f2.job_family },
                        { label: "Advertised", value: f2.advertised },
                        { label: "External recruitment", value: (f2.recruitment_methods ?? []).join(", ") },
                        { label: "Budget", value: f2.budget_confirmed ? "Covered by the approved headcount budget" : "Not confirmed" },
                        { label: "Recommendation", value: RECOMMENDATION[f2.hr_recommendation ?? ""] ?? f2.hr_recommendation },
                        { label: "Proposed benefit package", value: f2.benefit_package, wide: true },
                        { label: "Comments", value: f2.hr_comments, wide: true },
                      ]}
                    />
                  ) : (
                    <EmptyState icon="clipboard" title="Not validated yet" description="The executives see this request only once the People Business Partner has completed it." />
                  )}
                </CardBody>
              </Card>
            </Stack>
          </div>

          <Stack gap={6}>
            <Card>
              <CardHeader title="Sign-offs" icon="shield-check" description="All three must approve." />
              <CardBody>
                <Stack gap={4}>
                  <div className="pb-4 border-b border-border">
                    <ApprovalTrio approvals={r.approvals} size="lg" />
                  </div>
                  {ORDER.map((role) => {
                    const a = r.approvals.find((x) => x.role === role) ?? { role, decision: "pending" };
                    const d = decisionOf(a.decision);
                    const waiting = a.decision === "pending" && (r.status === "pending_approval" || r.status === "info_requested");
                    return (
                      <Row key={role} gap={3} align="start">
                        <Avatar name={roleInfo(role).short} size="sm" />
                        <div className="min-w-0 flex-1">
                          <Row gap={2} justify="between">
                            <span className="text-sm text-foreground">{roleInfo(role).title}</span>
                            <Badge size="sm" variant={d.variant} icon={d.icon}>{d.label}</Badge>
                          </Row>
                          <div className="text-xs text-muted-foreground">
                            {a.at ? formatDateTime(a.at) : waiting ? `Waiting ${waitingLabel(r.stage_since)}` : "Not started"}
                            {(a.reminders ?? 0) > 0 && ` · reminded ${a.reminders}×`}
                          </div>
                          {a.comment && <p className="text-sm text-muted-foreground mt-1">“{a.comment}”</p>}
                          {waiting && daysSince(r.stage_since) >= REMINDER_DAYS && (
                            <div className="mt-1"><Badge size="sm" variant="warning" icon="bell">Over {REMINDER_DAYS} days</Badge></div>
                          )}
                        </div>
                      </Row>
                    );
                  })}
                </Stack>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="History" icon="history" description="Every step, who took it and when." />
              <CardBody>
                {r.history.length === 0 ? (
                  <EmptyState icon="history" title="Nothing recorded yet" />
                ) : (
                  <Timeline>
                    {r.history.map((e) => (
                      <TimelineItem
                        key={e.id}
                        at={formatDateTime(e.at)}
                        title={e.title}
                        body={e.note}
                        status={toneOf(e.tone)}
                        by={<Avatar size="xs" name={e.actor_name} />}
                      />
                    ))}
                  </Timeline>
                )}
              </CardBody>
            </Card>
          </Stack>
        </Grid>
      </Stack>
    </Screen>
  );
}

/** The one card that says what the person looking at this can do with it now. */
function YourMove({ request: r }: { request: RequestDetail }) {
  const me = useMe();
  const role = me.role;

  if (role === "hiring_manager" && r.status === "draft") return <DraftPanel request={r} />;
  if (r.status === "info_requested" && r.info?.target === role && (role === "hiring_manager" || role === "people_partner"))
    return <AnswerPanel request={r} role={role} />;
  if (role === "people_partner" && r.status === "pending_hr") return <ValidationPanel request={r} />;
  if (isExecutive(role) && (r.status === "pending_approval" || r.status === "info_requested")) {
    const mine = r.approvals.find((a) => a.role === role);
    if (!mine || mine.decision === "pending") return <DecisionPanel request={r} role={role} />;
    if (mine.decision === "info")
      return <Alert variant="info" title="You asked for more information">The request comes back to you as soon as {r.info?.target === "people_partner" ? r.pbp ?? "the People partner" : r.hiring_manager ?? "the hiring manager"} answers.</Alert>;
  }
  if (role === "talent_partner" && r.status === "approved") return <RecruitPanel request={r} />;

  const waitingOn: Record<string, string> = {
    draft: `${r.hiring_manager ?? "The hiring manager"} has not sent it yet.`,
    pending_hr: `Waiting for ${r.pbp ?? "the People Business Partner"} to validate it.`,
    pending_approval: "Waiting for the remaining executive sign-offs.",
    info_requested: `Waiting for ${r.info?.target === "people_partner" ? r.pbp ?? "the People partner" : r.hiring_manager ?? "the hiring manager"} to answer a question.`,
    approved: "Approved. The Talent Partner is setting up recruitment in Deel ATS.",
    rejected: "This request was rejected. The reason is in the history.",
    closed: "Recruitment has started in Deel ATS. Nothing else to do here.",
  };
  const s = statusOf(r.status);
  return (
    <Alert
      variant={r.status === "rejected" ? "error" : r.status === "approved" || r.status === "closed" ? "success" : "info"}
      title={`${s.label} · nothing for the ${roleInfo(role).title} to do here`}
    >
      {waitingOn[r.status] ?? ""}
    </Alert>
  );
}
