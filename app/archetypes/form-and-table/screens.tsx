import type { ScreenDef } from "@/lib/router";
import { RequestsPage } from "./pages/RequestsPage";
import { SubmitPage } from "./pages/SubmitPage";

/** Route table consumed by src/main.tsx. Paths mirror the screens in app.json. */
export const screens: ScreenDef[] = [
  { id: "submit", path: "/", title: "New request", element: <SubmitPage /> },
  { id: "requests", path: "/requests", title: "Requests", element: <RequestsPage /> },
];
