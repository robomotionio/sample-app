/** The choices on the two forms, exactly as the current Microsoft Forms offer them. */
const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

export const DEPARTMENTS = opts(["Operations", "Commercial", "Information Technology", "Finance", "People", "Acquisitions"]);
export const LOCATIONS = opts(["Argentan", "Castel d'Ario", "Cavriago", "Monignoso", "Langemark", "Fully remote"]);
export const ROLE_TYPES = opts(["New role", "Replacement"]);
export const ADVERTISED = opts(["Internally", "Externally", "Both Internally and Externally"]);
export const RECRUITMENT_METHODS = opts(["LinkedIn Search", "Job Boards", "Agency"]);
export const RECOMMENDATIONS = [
  { value: "support", label: "Support this vacancy" },
  { value: "support_with_changes", label: "Support, with the changes noted" },
  { value: "not_supported", label: "Do not support" },
];

/** The demo's management team: who a new hire can report to. Made up for the
 * proof of concept; in production this list would come from the HR system. */
export const REPORTING_MANAGERS = [
  { name: "Luc Moreau", title: "Plant Manager, Argentan" },
  { name: "Chiara Romano", title: "Plant Manager, Castel d'Ario" },
  { name: "Giorgio Bianchi", title: "Plant Manager, Cavriago" },
  { name: "Paolo Neri", title: "Finance Controller, Monignoso" },
  { name: "Jan De Vries", title: "Plant Manager, Langemark" },
  { name: "Elena Conti", title: "Head of Information Technology" },
  { name: "Annelies Peeters", title: "Commercial Director" },
  { name: "Marta Rossi", title: "Head of Acquisitions" },
  { name: "Claire Dubois", title: "People Director" },
  { name: "Sophie Laurent", title: "Group Operations Director" },
].map((m) => ({ value: m.name, label: `${m.name} · ${m.title}` }));
