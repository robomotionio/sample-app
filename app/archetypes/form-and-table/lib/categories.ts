import type { WorkRequest } from "../generated/actions.gen";

type WorkRequestCategory = WorkRequest["category"];

/** Plain-language labels for the category values in app.json. */
export const CATEGORY_OPTIONS: { value: WorkRequestCategory; label: string }[] = [
  { value: "report", label: "A report" },
  { value: "data_update", label: "A data update" },
  { value: "access", label: "An access change" },
  { value: "other", label: "Something else" },
];

export function categoryLabel(value: WorkRequestCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function isCategory(value: string): value is WorkRequestCategory {
  return CATEGORY_OPTIONS.some((option) => option.value === value);
}
