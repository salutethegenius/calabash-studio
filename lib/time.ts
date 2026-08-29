/** Business calendar: The Calabash Studio is in Nassau (Eastern Time, DST). */
export const BUSINESS_TIMEZONE = "America/Nassau";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  let hour = get("hour");
  if (hour === 24) hour = 0;

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` at `date`: wall-clock-as-UTC minus the actual instant. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/** Instant of 00:00:00 in `timeZone` on the calendar day that contains `now`. */
export function startOfDayInTimeZone(
  now: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE
): Date {
  const { year, month, day } = zonedParts(now, timeZone);
  const utcMidnightOfCalendarDate = Date.UTC(year, month - 1, day);
  let instant =
    utcMidnightOfCalendarDate -
    timeZoneOffsetMs(new Date(utcMidnightOfCalendarDate), timeZone);
  instant =
    utcMidnightOfCalendarDate -
    timeZoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

export function formatBusinessDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-BS", {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatBusinessDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-BS", {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: "medium",
  }).format(date);
}
