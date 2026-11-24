// First: the app speaks English whatever the browser is set to.
import "./lib/locale";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createApp } from "@robomotion/apps-runtime";
import { AppProvider, useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { AppShell, AssistantWidget } from "@robomotion/app-kit";
import manifest from "../../app.json";
import { CONTRACT_HASH, useListNotifications, useWhoAmI } from "./generated/actions.gen";
import { loadConfig } from "./lib/config";
import { Router, navigate, usePath } from "./lib/router";
import { screens } from "./screens";
import { SessionProvider, useSession } from "./lib/session";
import { SignInPage } from "./pages/SignInPage";
import { PersonaSwitcher } from "./components/PersonaSwitcher";
import "./index.css";

// The nav lists one item per screen and only appears once there is more than
// one. Items carry the screen path so the frame can mark the open one and
// hand navigation back to the router instead of reloading the page; the icon
// and the group come from the screen table, and the shell draws a sidebar
// for two or more screens unless app.json's theme says otherwise.
// The sidebar follows the signed-in role: everyone sees Home, All requests
// and Notifications, and each role adds its own work screens. A screen a role
// may not use is not reachable by typing its address either. (The robot
// checks every action again; this only decides what is drawn.)
function screensFor(role: string | undefined) {
  return screens.filter((s) => s.id !== "signIn" && (!s.roles || (role !== undefined && s.roles.includes(role))));
}
function navFor(role: string | undefined, unread = 0) {
  return screensFor(role)
    .filter((s) => !s.hidden)
    .map((screen) => ({
      label: screen.title,
      path: screen.path,
      icon: screen.icon,
      group: screen.group,
      badge:
        screen.id === "inbox" && unread > 0 ? (
          <span
            aria-label={`${unread} unread notifications`}
            style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9999, background: "#DC2626", color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: "18px", textAlign: "center", display: "inline-block" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : undefined,
    }));
}

const theme = (manifest as { theme?: { accent?: string; layout?: "sidebar" | "topbar" } }).theme;

// The app's icon, if it ships one: drop a square picture at src/icon.png (or
// .svg/.webp) and it becomes the tile in the sidebar and the browser tab.
// Globbed rather than imported so an app with no icon still builds; the shell
// falls back to the first letter of the name, which is what every app did
// before this existed.
const logoSrc = Object.values(
  import.meta.glob("./icon.{png,svg,webp}", { eager: true, query: "?url", import: "default" }),
)[0] as string | undefined;

function Frame() {
  const path = usePath();
  const { user, setUser } = useSession();
  const whoAmI = useWhoAmI();
  const { state } = useConnection();
  const inbox = useListNotifications();

  // Unread count for the red bubble on "Notifications": fetched on sign-in,
  // on every page change, whenever a request moves, and every 20 seconds.
  const refreshInbox = () => {
    if (user && state === "ready") void inbox.run({ token: user.token });
  };
  useEffect(refreshInbox, [user?.token, state, path]);
  useEvent("requestChanged", () => refreshInbox());
  useEffect(() => {
    const t = setInterval(refreshInbox, 20000);
    const onChange = () => refreshInbox();
    window.addEventListener("notifications-changed", onChange);
    return () => { clearInterval(t); window.removeEventListener("notifications-changed", onChange); };
  }, [user?.token, state]);
  const unread = inbox.data?.unread ?? 0;

  // A remembered session is checked with the robot once it is reachable.
  useEffect(() => {
    if (user && state === "ready") void whoAmI.run({ token: user.token });
  }, [user?.token, state]);
  useEffect(() => {
    if (whoAmI.error && whoAmI.error.code === "invalid_params") setUser(null);
  }, [whoAmI.error]);

  if (!user) {
    return (
      <SignInPage title={manifest.name} logoSrc={logoSrc} />
    );
  }

  return (
    <AppShell
      title={manifest.name}
      subtitle="Glacier · People"
      logoSrc={logoSrc}
      accent={theme?.accent}
      layout={theme?.layout}
      nav={navFor(user.role, unread)}
      headerRight={<PersonaSwitcher />}
      activePath={path}
      onNavigate={navigate}
    >
      <Router screens={screensFor(user.role)} />
      {/* The app's assistant: renders only when the robot says there is one. */}
      <AssistantWidget />
    </AppShell>
  );
}

async function start() {
  const config = await loadConfig();
  const app = createApp({ config, contractHash: CONTRACT_HASH });

  document.title = manifest.name;

  // The tab icon. Without this every app shows the browser's blank page glyph.
  if (logoSrc) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement("link");
    link.rel = "icon";
    link.href = logoSrc;
    document.head.appendChild(link);
  }

  // One root per mount point. Vite's HMR re-runs this module on a change it
  // cannot patch, and a second createRoot on the same element is what React
  // warns about in the preview's console ("already been passed to
  // createRoot()", issue 265). The root is kept across re-runs and released
  // when the module is replaced.
  const el = document.getElementById("root")!;
  const held = globalThis as { __rmRoot?: ReturnType<typeof createRoot> };
  const root = (held.__rmRoot ??= createRoot(el));
  import.meta.hot?.dispose(() => {
    root.unmount();
    held.__rmRoot = undefined;
  });

  root.render(
    <StrictMode>
      <AppProvider app={app}>
        <SessionProvider>
          <Frame />
        </SessionProvider>
      </AppProvider>
    </StrictMode>,
  );
}

void start();
