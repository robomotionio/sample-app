import type { ScreenDef } from "@/lib/router";
import { GalleryPage } from "./pages/GalleryPage";
import { ReviewPage } from "./pages/ReviewPage";

/** Route table consumed by src/main.tsx. Paths mirror the screens in app.json;
 * every screen carries an icon, which is what the sidebar draws beside it. */
export const screens: ScreenDef[] = [
  { id: "gallery", path: "/", title: "Photos", icon: "images", element: <GalleryPage /> },
  { id: "review", path: "/review", title: "Review", icon: "pencil", element: <ReviewPage /> },
];
