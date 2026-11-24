import type { HistoryEntry, RequestDetail, RequestSummary } from "../generated/actions.gen";

/** What the screens show before the robot is connected. Never shown once it is. */
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const pending = (role: string) => ({ role, decision: "pending" });

export const SAMPLE_REQUESTS: RequestSummary[] = [
  {
    id: "s1", ref: "VR-2026-014", status: "pending_approval", job_title: "Maintenance Engineer",
    department: "Operations", location: "Argentan", role_type: "Replacement",
    hiring_manager: "Sophie Laurent", pbp: "Holly", created_at: now - 12 * DAY, updated_at: now - 9 * DAY,
    stage_since: now - 9 * DAY,
    approvals: [{ role: "cpo", decision: "approved", at: now - 7 * DAY }, pending("cfo"), pending("ceo")],
  },
  {
    id: "s2", ref: "VR-2026-015", status: "pending_hr", job_title: "Data Analyst",
    department: "Information Technology", location: "Cavriago", role_type: "New role",
    hiring_manager: "Sophie Laurent", pbp: "Holly", created_at: now - 2 * DAY, updated_at: now - 2 * DAY,
    stage_since: now - 2 * DAY, approvals: [pending("cpo"), pending("cfo"), pending("ceo")],
  },
  {
    id: "s3", ref: "VR-2026-012", status: "approved", job_title: "Key Account Manager",
    department: "Commercial", location: "Langemark", role_type: "New role",
    hiring_manager: "Sophie Laurent", pbp: "Holly", created_at: now - 20 * DAY, updated_at: now - 3 * DAY,
    stage_since: now - 3 * DAY,
    approvals: [
      { role: "cpo", decision: "approved", at: now - 6 * DAY },
      { role: "cfo", decision: "approved", at: now - 4 * DAY },
      { role: "ceo", decision: "approved", at: now - 3 * DAY },
    ],
  },
  {
    id: "s4", ref: "VR-2026-016", status: "info_requested", job_title: "Payroll Specialist",
    department: "Finance", location: "Monignoso", role_type: "Replacement",
    hiring_manager: "Sophie Laurent", pbp: "Holly", created_at: now - 8 * DAY, updated_at: now - 1 * DAY,
    stage_since: now - 1 * DAY, info_target: "people_partner",
    approvals: [pending("cpo"), { role: "cfo", decision: "info", at: now - DAY }, pending("ceo")],
  },
  {
    id: "s5", ref: "VR-2026-009", status: "rejected", job_title: "M&A Analyst",
    department: "Acquisitions", location: "Fully remote", role_type: "New role",
    hiring_manager: "Sophie Laurent", pbp: "Holly", created_at: now - 30 * DAY, updated_at: now - 18 * DAY,
    stage_since: now - 18 * DAY,
    approvals: [{ role: "cpo", decision: "approved" }, { role: "cfo", decision: "rejected" }, pending("ceo")],
  },
  {
    id: "s6", ref: "VR-2026-017", status: "draft", job_title: "HR Coordinator",
    department: "People", location: "Castel d'Ario", role_type: "New role",
    hiring_manager: "Sophie Laurent", pbp: "Holly", created_at: now - 3600000, updated_at: now - 3600000,
    stage_since: now - 3600000, approvals: [pending("cpo"), pending("cfo"), pending("ceo")],
  },
];

export const SAMPLE_HISTORY: HistoryEntry[] = [
  { id: "h1", at: now - 1 * DAY, ref: "VR-2026-016", request_id: "s4", actor_role: "cfo", actor_name: "CFO",
    title: "CFO asked the People Business Partner for more information",
    note: "Is this backfill already in the 2026 payroll budget?", tone: "warn" },
  { id: "h2", at: now - 2 * DAY, ref: "VR-2026-015", request_id: "s2", actor_role: "hiring_manager",
    actor_name: "Sophie Laurent", title: "Request sent to the People team", tone: "pending" },
  { id: "h3", at: now - 3 * DAY, ref: "VR-2026-012", request_id: "s3", actor_role: "ceo", actor_name: "CEO",
    title: "CEO approved - all approvals in, Talent Partner notified", tone: "ok" },
  { id: "h4", at: now - 7 * DAY, ref: "VR-2026-014", request_id: "s1", actor_role: "cpo", actor_name: "CPO",
    title: "CPO approved", tone: "ok" },
];

export const SAMPLE_DETAIL: RequestDetail = {
  id: "s1", ref: "VR-2026-014", status: "pending_approval", hiring_manager: "Sophie Laurent", pbp: "Holly",
  created_at: now - 12 * DAY, updated_at: now - 9 * DAY, stage_since: now - 9 * DAY,
  form1: {
    hiring_manager: "Sophie Laurent", department: "Operations", request_date: "2026-11-08",
    job_title: "Maintenance Engineer", location: "Argentan", role_type: "Replacement",
    business_justification: "Replaces a senior engineer retiring in January; line 3 needs cover on all three shifts.",
    desired_start_date: "2027-01-15", reporting_manager: "Luc Moreau",
  },
  form2: {
    salary_range: "EUR 48,000 - 54,000", benefit_package: "Standard Argentan package, shift allowance, company car not included.",
    job_family: "Engineering / Hay 14", advertised: "Both Internally and Externally",
    recruitment_methods: ["LinkedIn Search", "Job Boards"], budget_confirmed: true,
    hr_recommendation: "support", hr_comments: "Like-for-like backfill, within the 2026 headcount plan.",
  },
  approvals: SAMPLE_REQUESTS[0].approvals ?? [],
  history: [
    { id: "d3", at: now - 7 * DAY, title: "CPO approved", actor_role: "cpo", actor_name: "CPO", tone: "ok" },
    { id: "d2", at: now - 9 * DAY, title: "Validated by Holly and sent to the CEO, CPO and CFO", actor_role: "people_partner", actor_name: "Holly", tone: "pending" },
    { id: "d1", at: now - 12 * DAY, title: "Request sent to the People team", actor_role: "hiring_manager", actor_name: "Sophie Laurent", tone: "pending" },
  ],
};
