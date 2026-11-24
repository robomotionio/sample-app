/** The app is in English whatever language the viewer's browser is set to.
 * Dates and numbers that are formatted without naming a locale (ours and the
 * kit's, such as the calendar's month and weekday names) use this one. */
export const APP_LOCALE = "en-GB";

type Loc = string | string[] | undefined;
const pick = (l: Loc) => (l === undefined ? APP_LOCALE : l);

const D = Date.prototype;
const toDate = D.toLocaleDateString;
const toDateTime = D.toLocaleString;
const toTime = D.toLocaleTimeString;
D.toLocaleDateString = function (l?: Loc, o?: Intl.DateTimeFormatOptions) {
  return toDate.call(this, pick(l), o);
};
D.toLocaleString = function (l?: Loc, o?: Intl.DateTimeFormatOptions) {
  return toDateTime.call(this, pick(l), o);
};
D.toLocaleTimeString = function (l?: Loc, o?: Intl.DateTimeFormatOptions) {
  return toTime.call(this, pick(l), o);
};

const toNumber = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (l?: Loc, o?: Intl.NumberFormatOptions) {
  return toNumber.call(this, pick(l), o);
};

const DTF = Intl.DateTimeFormat;
const NF = Intl.NumberFormat;
const EnglishDateTimeFormat = function (l?: Loc, o?: Intl.DateTimeFormatOptions) {
  return new DTF(pick(l), o);
} as unknown as typeof Intl.DateTimeFormat;
Object.defineProperty(EnglishDateTimeFormat, "prototype", { value: DTF.prototype });
EnglishDateTimeFormat.supportedLocalesOf = DTF.supportedLocalesOf;
const EnglishNumberFormat = function (l?: Loc, o?: Intl.NumberFormatOptions) {
  return new NF(pick(l), o);
} as unknown as typeof Intl.NumberFormat;
Object.defineProperty(EnglishNumberFormat, "prototype", { value: NF.prototype });
EnglishNumberFormat.supportedLocalesOf = NF.supportedLocalesOf;
Intl.DateTimeFormat = EnglishDateTimeFormat;
Intl.NumberFormat = EnglishNumberFormat;

document.documentElement.lang = "en";
