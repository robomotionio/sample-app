import { useEffect } from "react";
import { Avatar, Menu, Row } from "@robomotion/app-kit";
import { useSignOut } from "../generated/actions.gen";
import { roleInfo, useSession } from "../lib/session";
import { navigate } from "../lib/router";

/** The right of the top bar: who is signed in, and signing out. */
export function PersonaSwitcher() {
  const { user, setUser } = useSession();
  const signOut = useSignOut();

  useEffect(() => {
    if (signOut.data || signOut.error) {
      setUser(null);
      navigate("/signin", { replace: true });
    }
  }, [signOut.data, signOut.error]);

  if (!user) return null;
  return (
    <Row gap={2} className="min-w-0">
      <div className="hidden sm:block text-right leading-tight min-w-0">
        <div className="text-sm font-bold text-foreground truncate">{user.name}</div>
        <div className="g-eyebrow g-eyebrow-xs">{roleInfo(user.role).title}</div>
      </div>
      <Avatar name={user.name} size="sm" />
      <Menu
        label="Account"
        items={[{ label: "Sign out", icon: "log-out", action: signOut, params: { token: user.token } }]}
      />
    </Row>
  );
}
