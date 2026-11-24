import type { FileRef } from "@robomotion/apps-runtime";
import type { Picture } from "../generated/actions.gen";

// Sample photos, so both screens show their real shape before the robot side
// of this app exists. They are only ever a fallback while the app has never
// had a backend (the screens read useConnection() for that): in every other
// state no answer yet is the empty state, never the sample one. Presses always go to
// the robot, so nothing here pretends a photo was approved.
//
// The sample photos are drawn here, as SVG data URLs, so the screens need no
// network and no asset folder - and so the review screen's export can read
// them back, which it could not do with a picture from another site.
const HUES = [18, 48, 95, 150, 200, 235, 275, 320];

function drawPhoto(seed: number, w: number, h: number): string {
  const sky = HUES[seed % HUES.length];
  const ground = HUES[(seed * 3 + 2) % HUES.length];
  const sun = 15 + ((seed * 37) % 70);
  const hill = 45 + ((seed * 11) % 25);
  const block = 10 + ((seed * 29) % 55);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${sky} 70% 72%)"/><stop offset="1" stop-color="hsl(${sky} 55% 88%)"/></linearGradient>` +
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${ground} 45% 45%)"/><stop offset="1" stop-color="hsl(${ground} 55% 28%)"/></linearGradient></defs>` +
    `<rect width="400" height="300" fill="url(#s)"/>` +
    `<circle cx="${sun * 4}" cy="70" r="28" fill="hsl(45 95% 82% / 0.9)"/>` +
    `<path d="M0 ${hill * 3} Q 120 ${hill * 3 - 60} 220 ${hill * 3 - 10} T 400 ${hill * 3 - 30} V 300 H 0 Z" fill="url(#g)"/>` +
    `<rect x="${block * 4}" y="${hill * 3 - 70}" width="90" height="80" rx="4" fill="hsl(${ground} 25% 92%)"/>` +
    `<rect x="${block * 4 + 14}" y="${hill * 3 - 52}" width="22" height="22" fill="hsl(${sky} 40% 35%)"/>` +
    `<rect x="${block * 4 + 52}" y="${hill * 3 - 52}" width="22" height="22" fill="hsl(${sky} 40% 35%)"/>` +
    `<path d="M${block * 4 - 8} ${hill * 3 - 70} L ${block * 4 + 45} ${hill * 3 - 110} L ${block * 4 + 98} ${hill * 3 - 70} Z" fill="hsl(${ground} 50% 32%)"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The sample photos by artifact id, so a screen can show one without a robot. */
const SAMPLE_SRC = new Map<string, string>();

function samplePhoto(id: string, seed: number): { file: FileRef; thumb: string } {
  const artifactId = `sample-${id}`;
  SAMPLE_SRC.set(artifactId, drawPhoto(seed, 1200, 900));
  return {
    file: { artifact_id: artifactId, name: `${id}.jpg`, size: 240_000, mime: "image/svg+xml" },
    thumb: drawPhoto(seed, 24, 18),
  };
}

/**
 * The drawn picture behind a sample file, or undefined for any other file -
 * which is every file the robot saves, so `Image` resolves those itself.
 */
export function sampleSrc(file: FileRef | undefined): string | undefined {
  return file ? SAMPLE_SRC.get(file.artifact_id) : undefined;
}

const SAMPLES: [string, string, string, number, Picture["status"]][] = [
  ["north-entrance", "North entrance", "Exterior", 0.94, "to_review"],
  ["reception", "Reception desk", "Interior", 0.88, "to_review"],
  ["loading-bay", "Loading bay", "Exterior", 0.52, "to_review"],
  ["roof-east", "Roof, east side", "Exterior", 0.71, "changes_requested"],
  ["meeting-room", "Meeting room 2", "Interior", 0.97, "approved"],
  ["stairwell", "Stairwell B", "Interior", 0.43, "to_review"],
  ["car-park", "Car park", "Exterior", 0.9, "approved"],
  ["kitchen", "Staff kitchen", "Interior", 0.81, "to_review"],
  ["signage", "Front signage", "Detail", 0.66, "to_review"],
  ["garden", "Courtyard garden", "Exterior", 0.92, "approved"],
  ["server-room", "Server room", "Interior", 0.58, "changes_requested"],
  ["door-handle", "Door handle, main door", "Detail", 0.77, "to_review"],
  ["west-wall", "West wall", "Exterior", 0.85, "to_review"],
  ["lobby-art", "Lobby artwork", "Detail", 0.95, "approved"],
];

export const SAMPLE_PICTURES: Picture[] = SAMPLES.map(([id, title, category, confidence, status], i) => {
  const photo = samplePhoto(id, i + 1);
  const picture: Picture = {
    id,
    title,
    category,
    confidence,
    status,
    taken_at: new Date(Date.UTC(2026, 8, 1 + i, 9, 30)).toISOString(),
    file: photo.file,
    thumb: photo.thumb,
  };
  if (id === "roof-east") {
    // A photo that has already been redone once, so the review screen has a
    // before and after to show.
    picture.previous = samplePhoto(`${id}-v1`, i + 5).file;
    picture.note = "The gutter is out of frame; take it from further back.";
    picture.marks = [{ id: "m1", n: 1, kind: "box", rect: [0.55, 0.52, 0.35, 0.3], note: "Gutter should be in the shot" }];
  }
  return picture;
});

/** The sample photos a filter would show, the way listPictures answers. */
export function sampleMatches(picture: Picture, status: string, filter: string): boolean {
  if (status !== "all" && picture.status !== status) return false;
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  return picture.title.toLowerCase().includes(q) || (picture.category ?? "").toLowerCase().includes(q);
}

/** One sample photo by id; the one with a before and after when none is named. */
export function samplePicture(id: string | null): Picture {
  return SAMPLE_PICTURES.find((p) => p.id === id) ?? SAMPLE_PICTURES.find((p) => p.previous) ?? SAMPLE_PICTURES[0];
}
