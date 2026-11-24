import type { ScreenDef } from "@/lib/router";
import { ReviewPage } from "./pages/ReviewPage";

/** Route table consumed by src/main.tsx. Paths mirror the screens in app.json. */
export const screens: ScreenDef[] = [
  { id: "review", path: "/", title: "Review", element: <ReviewPage /> },
];
