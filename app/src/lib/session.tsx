import { createContext, useContext, useState, type ReactNode } from "react";
import type { IconName } from "@robomotion/app-kit";
import type { Role, User } from "../generated/actions.gen";

/** Who is signed in. The robot decides what each person may see and do from
 * their session; the screens only use this to choose what to show. */

export interface RoleInfo {
  role: Role;
  title: string;
  short: string;
  blurb: string;
  icon: IconName;
}

export const ROLES: RoleInfo[] = [
  { role: "hiring_manager", title: "Hiring Manager", short: "HM", icon: "user-plus",
    blurb: "Raise a vacancy request and follow it through to recruitment." },
  { role: "people_partner", title: "People Business Partner", short: "PBP", icon: "handshake",
    blurb: "Check the need, budget and package, then pass it on for approval." },
  { role: "cpo", title: "Chief People Officer", short: "CPO", icon: "users",
    blurb: "Approve, reject or question vacancies from a people angle." },
  { role: "cfo", title: "Chief Financial Officer", short: "CFO", icon: "banknote",
    blurb: "Approve, reject or question vacancies from a budget angle." },
  { role: "ceo", title: "Chief Executive Officer", short: "CEO", icon: "award",
    blurb: "Give the final word on every new or replacement role." },
  { role: "talent_partner", title: "Talent Partner", short: "TP", icon: "megaphone",
    blurb: "Pick up approved vacancies and start recruiting in Deel ATS." },
  { role: "admin", title: "Administrator", short: "ADM", icon: "shield",
    blurb: "See every request, load example requests or clear them all." },
];


export function roleInfo(role: string | undefined): RoleInfo {
  return ROLES.find((r) => r.role === role) ?? ROLES[0];
}

export function isExecutive(role: string | undefined): role is "ceo" | "cpo" | "cfo" {
  return role === "ceo" || role === "cpo" || role === "cfo";
}

const KEY = "vacancy-approvals.session";

function readStored(): User | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStored(u: User | null) {
  try {
    if (u) window.localStorage.setItem(KEY, JSON.stringify(u));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* the session then lasts until the page is closed */
  }
}

interface SessionValue {
  user: User | null;
  setUser: (u: User | null) => void;
}

const SessionContext = createContext<SessionValue>({ user: null, setUser: () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setState] = useState<User | null>(() => readStored());
  const setUser = (u: User | null) => {
    writeStored(u);
    setState(u);
  };
  return <SessionContext.Provider value={{ user, setUser }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

const NOBODY: User = { token: "", username: "", name: "", role: "hiring_manager" };

/** The signed-in person. Screens only render once someone is signed in. */
export function useMe(): User {
  return useContext(SessionContext).user ?? NOBODY;
}
