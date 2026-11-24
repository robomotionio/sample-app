import type { Mark } from "@robomotion/app-kit";
import type { PictureMark } from "../generated/actions.gen";

// The contract carries a mark's coordinates as plain arrays of numbers; the
// kit's ImageMarkup names their shape ([x, y], [x, y, width, height]). These
// two turn one into the other, so neither side is ever cast.

export function toKitMarks(marks: PictureMark[] | undefined): Mark[] {
  return (marks ?? []).map((m) => ({
    id: m.id,
    n: m.n,
    kind: m.kind,
    at: m.at && m.at.length >= 2 ? [m.at[0], m.at[1]] : undefined,
    rect: m.rect && m.rect.length >= 4 ? [m.rect[0], m.rect[1], m.rect[2], m.rect[3]] : undefined,
    points: m.points?.filter((p) => p.length >= 2).map((p): [number, number] => [p[0], p[1]]),
    width: m.width,
    note: m.note,
    tone: m.tone,
  }));
}

export function toContractMarks(marks: Mark[]): PictureMark[] {
  return marks.map((m) => ({
    id: m.id,
    n: m.n,
    kind: m.kind,
    at: m.at,
    rect: m.rect,
    points: m.points,
    width: m.width,
    note: m.note,
    tone: m.tone,
  }));
}
