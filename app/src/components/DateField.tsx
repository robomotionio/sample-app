import { useState } from "react";
import { Button, Calendar, Icon, Popover, Row } from "@robomotion/app-kit";
import { formatDay, todayIso } from "../lib/format";

/** A date chosen from a calendar that opens under the field, instead of the
 * browser's typed "dd.mm.yyyy" box. The value is ISO "yyyy-mm-dd". */
export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  label,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = value ? value.slice(0, 7) : todayIso().slice(0, 7);
  const [month, setMonth] = useState(shown);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setMonth(value ? value.slice(0, 7) : todayIso().slice(0, 7));
      }}
      label={label}
      width={320}
      triggerClassName="g-date w-full"
      trigger={
        <Row gap={2} justify="between" className="w-full">
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? formatDay(value) : placeholder}
          </span>
          <Icon name="calendar" size={16} />
        </Row>
      }
    >
      <div className="g-mini-cal">
        <Calendar
          month={month}
          onMonthChange={setMonth}
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </div>
      <Row justify="between" className="mt-2">
        <Button size="sm" variant="ghost" onClick={() => { onChange(todayIso()); setOpen(false); }}>
          Today
        </Button>
        {value && (
          <Button size="sm" variant="ghost" onClick={() => { onChange(""); setOpen(false); }}>
            Clear
          </Button>
        )}
      </Row>
    </Popover>
  );
}
