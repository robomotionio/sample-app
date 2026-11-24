import type { ScreenDef } from "@/lib/router";
import { QueuePage } from "./pages/QueuePage";

/** Route table consumed by src/main.tsx. Paths mirror the screens in app.json. */
export const screens: ScreenDef[] = [
  { id: "queue", path: "/", title: "Queue", element: <QueuePage /> },
];
