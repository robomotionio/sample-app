import type { ScreenDef } from "./lib/router";
import { HomePage } from "./pages/HomePage";
import { NewRequestPage } from "./pages/NewRequestPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { ValidationPage } from "./pages/ValidationPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { RecruitmentPage } from "./pages/RecruitmentPage";
import { AllRequestsPage } from "./pages/AllRequestsPage";
import { RequestPage } from "./pages/RequestPage";
import { InboxPage } from "./pages/InboxPage";

/** Route table consumed by src/main.tsx. Paths mirror the screens in app.json.
 * `roles` limits a screen to the roles it is for; `hidden` keeps a screen out
 * of the sidebar (it is reached from a list). */
export const screens: ScreenDef[] = [
  { id: "home", path: "/", title: "Home", icon: "home", element: <HomePage /> },
  { id: "newRequest", path: "/new", title: "New request", icon: "file-plus", group: "My work", roles: ["hiring_manager"], element: <NewRequestPage /> },
  { id: "myRequests", path: "/my", title: "My requests", icon: "briefcase", group: "My work", roles: ["hiring_manager"], element: <MyRequestsPage /> },
  { id: "validation", path: "/validate", title: "Validation", icon: "handshake", group: "My work", roles: ["people_partner"], element: <ValidationPage /> },
  { id: "approvals", path: "/approvals", title: "Approvals", icon: "shield-check", group: "My work", roles: ["ceo", "cpo", "cfo"], element: <ApprovalsPage /> },
  { id: "recruitment", path: "/recruit", title: "Recruitment", icon: "megaphone", group: "My work", roles: ["talent_partner"], element: <RecruitmentPage /> },
  { id: "requests", path: "/requests", title: "All requests", icon: "table", group: "Glacier", element: <AllRequestsPage /> },
  { id: "inbox", path: "/inbox", title: "Notifications", icon: "bell", group: "Glacier", element: <InboxPage /> },
  { id: "request", path: "/request", title: "Request", icon: "file-text", hidden: true, element: <RequestPage /> },
];
