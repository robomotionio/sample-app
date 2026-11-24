import { useEffect } from "react";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Icon, Row, Screen, Skeleton, Stack } from "@robomotion/app-kit";
import { useConnection, useEvent } from "@robomotion/apps-runtime/react";
import { useListNotifications, useMarkNotificationsRead, type ListNotificationsResult } from "../generated/actions.gen";
import { roleInfo, useMe } from "../lib/session";
import { formatDateTime } from "../lib/format";
import { navigate } from "../lib/router";

const now = Date.now();
const SAMPLE_INBOX: ListNotificationsResult = {
  unread: 2,
  rows: [
    { id: "n1", at: now - 3600000, request_id: "s2", ref: "VR-2026-015", title: "Validation requested: Data Analyst", note: "Sophie Laurent sent a new vacancy request for Cavriago.", tone: "pending", read: false },
    { id: "n2", at: now - 86400000, request_id: "s1", ref: "VR-2026-014", title: "Reminder: Maintenance Engineer is waiting for your approval", note: "It has been waiting 8 days.", tone: "warn", read: false },
    { id: "n3", at: now - 3 * 86400000, request_id: "s3", ref: "VR-2026-012", title: "Vacancy approved and ready for recruitment", note: "Key Account Manager, Langemark.", tone: "ok", read: true },
  ],
};

const TONE_ICON = { ok: "circle-check", warn: "bell", error: "circle-x", pending: "mail" } as const;

export function InboxPage() {
  const me = useMe();
  const inbox = useListNotifications();
  const markRead = useMarkNotificationsRead();
  const { state } = useConnection();
  const ask = () => void inbox.run({ token: me.token });

  useEffect(() => {
    void inbox.run({ token: me.token });
  }, [me.token]);
  useEvent("requestChanged", () => ask());
  // After "Mark all as read", reload the list and clear the bubble in the menu.
  useEffect(() => {
    if (!markRead.data) return;
    ask();
    window.dispatchEvent(new Event("notifications-changed"));
  }, [markRead.data]);

  const data = inbox.data ?? (state === "ready" ? undefined : SAMPLE_INBOX);

  return (
    <Screen
      title="Notifications"
      description={`Everything sent to ${me.name} (${roleInfo(me.role).title}).`}
      badge={data && data.unread > 0 ? <Badge variant="accent">{data.unread} new</Badge> : undefined}
      actions={
        <Button variant="secondary" icon="check-check" action={markRead} params={{ token: me.token }} disabled={!data?.unread}>
          Mark all as read
        </Button>
      }
    >
      <Stack gap={4}>
        {inbox.error && <ErrorState error={inbox.error} onRetry={ask} />}
        {!data && !inbox.error && <Skeleton variant="text" lines={6} />}
        {data && data.rows.length === 0 && (
          <Card><CardBody>
            <EmptyState icon="bell" title="No notifications yet" description="You hear here when something needs you or one of your requests moves on." />
          </CardBody></Card>
        )}
        {data && data.rows.length > 0 && (
          <Card>
            <CardBody>
              <Stack gap={0}>
                {data.rows.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="text-left w-full py-3 border-b border-border last:border-b-0 hover:bg-muted/50 rounded-lg px-2"
                    onClick={() => n.request_id && navigate(`/request?id=${n.request_id}`)}
                  >
                    <Row gap={3} align="start">
                      <span className={n.read ? "text-muted-foreground" : "text-primary"}>
                        <Icon name={TONE_ICON[(n.tone as keyof typeof TONE_ICON) ?? "pending"] ?? "mail"} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Row gap={2} justify="between">
                          <span className={n.read ? "text-sm text-muted-foreground" : "text-sm text-foreground"}>{n.title}</span>
                          {!n.read && <Badge size="sm" variant="accent" dot>New</Badge>}
                        </Row>
                        {n.note && <div className="text-sm text-muted-foreground">{n.note}</div>}
                        <div className="text-xs text-muted-foreground tabular-nums mt-1">{n.ref} · {formatDateTime(n.at)}</div>
                      </div>
                    </Row>
                  </button>
                ))}
              </Stack>
            </CardBody>
          </Card>
        )}
      </Stack>
    </Screen>
  );
}
