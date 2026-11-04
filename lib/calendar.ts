import type { CalendarDay, Semester } from "@/lib/types";

/** Semester boundaries are fictional university policy; only public holidays/transfers are statutory. */
export const semesters: Semester[] = [
  {
    id: "autumn-2026",
    name: "Осенний семестр 2026/27",
    startDate: "2026-09-01",
    endDate: "2027-01-31",
    teachingEndDate: "2026-12-26",
    examStartDate: "2027-01-11",
    examEndDate: "2027-01-30",
  },
  {
    id: "spring-2027",
    name: "Весенний семестр 2026/27",
    startDate: "2027-02-01",
    endDate: "2027-06-30",
    teachingEndDate: "2027-06-05",
    examStartDate: "2027-06-07",
    examEndDate: "2027-06-30",
  },
];

const sources = {
  2026: "https://static.government.ru/media/files/4jeB8hNKm69ggOa9yDiYOli6YoAyM21i.pdf",
  2027: "http://publication.pravo.gov.ru/document/0001202609180037",
  statutory:
    "https://www.consultant.ru/document/cons_doc_LAW_34683/98ef2900507766e70ff29c0b9d8e2353ea80a1cf/",
};
const holidays: Record<string, string> = {
  "2026-11-04": "День народного единства",
  "2026-12-31": "Выходной: перенос с 4 января",
  "2027-01-01": "Новогодние каникулы",
  "2027-01-02": "Новогодние каникулы",
  "2027-01-03": "Новогодние каникулы",
  "2027-01-04": "Новогодние каникулы",
  "2027-01-05": "Новогодние каникулы",
  "2027-01-06": "Новогодние каникулы",
  "2027-01-07": "Рождество Христово",
  "2027-01-08": "Новогодние каникулы",
  "2027-02-22": "Выходной: перенос с 20 февраля",
  "2027-02-23": "День защитника Отечества",
  "2027-03-08": "Международный женский день",
  "2027-05-01": "Праздник Весны и Труда",
  "2027-05-03": "Выходной за 1 мая",
  "2027-05-09": "День Победы",
  "2027-05-10": "Выходной за 9 мая",
  "2027-06-12": "День России",
  "2027-06-14": "Выходной за 12 июня",
};

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Monday=0 ... Sunday=6. Feb 20 follows the Monday timetable under the official transfer. */
export function teachingWeekday(date: string): number {
  if (date === "2027-02-20") return 0;
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function calendarDay(date: string): CalendarDay {
  if (holidays[date])
    return {
      date,
      kind: "holiday",
      label: holidays[date],
      sourceUrl:
        date === "2026-12-31"
          ? sources[2026]
          : date === "2027-02-22"
            ? sources[2027]
            : sources.statutory,
    };
  if (teachingWeekday(date) >= 5) return { date, kind: "weekend", label: "Выходной" };
  const semester = semesters.find((item) => date >= item.startDate && date <= item.endDate);
  if (!semester || (date > semester.teachingEndDate && date < semester.examStartDate)) {
    return { date, kind: "vacation", label: "Каникулы по учебному плану прототипа" };
  }
  if (date >= semester.examStartDate && date <= semester.examEndDate)
    return { date, kind: "exam", label: "Экзаменационная сессия" };
  return {
    date,
    kind: "study",
    label: date === "2027-02-20" ? "Учебная суббота: расписание понедельника" : "Учебный день",
    ...(date === "2027-02-20" ? { sourceUrl: sources[2027] } : {}),
  };
}

export const calendarNotes = [
  "Календарь 2026/27: пятидневная учебная неделя. Даты семестров, каникул и экзаменов — вымышленный учебный план.",
  "Праздники и переносы: постановление Правительства РФ №1466 от 24.09.2025 и №1187 от 17.09.2026; статья 112 ТК РФ.",
  "20 февраля 2027 — учебная суббота по расписанию понедельника; 22 февраля — выходной. Все преподаватели и занятия вымышлены.",
];
