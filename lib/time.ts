/** All timetable dates are calendar dates in Moscow, independent of the server's timezone. */
export function moscowDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function mondayInMoscow(now = new Date()): string {
  const date = moscowDate(now);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -(weekday === 0 ? 6 : weekday - 1));
}

export function requestDueAt(now: Date): string {
  let date = moscowDate(now);
  let days = 0;
  while (days < 3) {
    date = addDays(date, 1);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return new Date(`${date}T18:00:00+03:00`).toISOString();
}
