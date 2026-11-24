import { Badge } from "@robomotion/app-kit";
import { statusOf } from "../lib/status";

export function StatusTag({ status }: { status: string | undefined }) {
  const s = statusOf(status);
  return (
    <Badge variant={s.variant} icon={s.icon}>
      {s.label}
    </Badge>
  );
}
