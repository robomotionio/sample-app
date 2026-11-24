import type { ScreenDef } from "@/lib/router";
import { OverviewPage } from "./pages/OverviewPage";

/** Route table consumed by src/main.tsx. Paths mirror the screens in app.json. */
export const screens: ScreenDef[] = [
  { id: "overview", path: "/", title: "Overview", element: <OverviewPage /> },
];
