"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Info, RefreshCw } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, Lesson, PageTitle } from "./ui";
import type { ScheduleData as WeekData } from "@/lib/types";

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value &&
    value >= "2026-09-01" &&
    value <= "2027-06-30"
  );
}
export function Schedule() {
  const { data } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date());
  const requested = params.get("date") || today;
  const selected = validDate(requested) ? requested : "2026-09-01";
  const semesterId = selected < "2027-02-01" ? "autumn-2026" : "spring-2027";
  const day = new Date(`${selected}T12:00:00Z`).getUTCDay();
  const monday = addDays(selected, day === 0 ? -6 : 1 - day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const view = params.get("view") === "week" ? "week" : "day";
  const [attempt, setAttempt] = useState(0);
  const query = `semester=${semesterId}&week=${monday}`;
  const key = `${query}:${attempt}`;
  const [result, setResult] = useState<{ key: string; data?: WeekData; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/schedule?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Не удалось загрузить расписание");
        setResult({ key, data: body.data });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setResult({ key, error: error.message });
      });
    return () => controller.abort();
  }, [query, key]);
  const loaded = result?.key === key ? result.data : undefined;
  const error = result?.key === key ? result.error : undefined;
  const shown = view === "day" ? [selected] : week;
  const classes = loaded?.classes || [];
  return (
    <>
      <PageTitle
        eyebrow="ПЛАНИРУЙ СВОЙ РИТМ"
        title="Расписание"
        description={`${data.user.group} · Учебный год 2026/27`}
      />
      <div className="semester-controls">
        <label htmlFor="semester">
          Семестр
          <select
            id="semester"
            value={semesterId}
            onChange={(event) =>
              router.push(
                `?date=${event.target.value === "spring-2027" ? "2027-02-08" : "2026-09-01"}&view=${view}`,
              )
            }
          >
            <option value="autumn-2026">Осенний · 2026/27</option>
            <option value="spring-2027">Весенний · 2026/27</option>
          </select>
        </label>
        <label htmlFor="schedule-date">
          Перейти к дате
          <input
            id="schedule-date"
            type="date"
            value={selected}
            min="2026-09-01"
            max="2027-06-30"
            onChange={(event) => {
              if (validDate(event.target.value))
                router.push(`?date=${event.target.value}&view=${view}`);
            }}
          />
        </label>
        <span className="semester-caption">
          {loaded?.semester.name || "Два семестра в одном календаре"}
          <small>Праздники РФ + учебный план вымышленного вуза</small>
        </span>
      </div>
      <div className="schedule-toolbar">
        <div className="week-switch">
          {addDays(selected, -7) >= "2026-09-01" ? (
            <Link
              className="icon-button"
              href={`?date=${addDays(selected, -7)}&view=${view}`}
              aria-label="Предыдущая неделя"
            >
              <ChevronLeft size={20} />
            </Link>
          ) : (
            <span className="icon-button muted" aria-hidden="true">
              <ChevronLeft size={20} />
            </span>
          )}
          <strong>
            <DateText value={monday} options={{ day: "numeric", month: "short" }} /> —{" "}
            <DateText value={week[6]} options={{ day: "numeric", month: "short" }} />
          </strong>
          {addDays(selected, 7) <= "2027-06-30" ? (
            <Link
              className="icon-button"
              href={`?date=${addDays(selected, 7)}&view=${view}`}
              aria-label="Следующая неделя"
            >
              <ChevronRight size={20} />
            </Link>
          ) : (
            <span className="icon-button muted" aria-hidden="true">
              <ChevronRight size={20} />
            </span>
          )}
        </div>
        <Link
          className="button secondary small"
          href={`?date=${validDate(today) ? today : "2026-09-01"}&view=${view}`}
        >
          Сегодня
        </Link>
        <div className="segmented">
          <Link href={`?date=${selected}&view=day`} className={view === "day" ? "selected" : ""}>
            День
          </Link>
          <Link href={`?date=${selected}&view=week`} className={view === "week" ? "selected" : ""}>
            Неделя
          </Link>
        </div>
      </div>
      <div className="week-days">
        {week.map((date) => {
          const meta = loaded?.days.find((d) => d.date === date);
          return validDate(date) ? (
            <Link
              key={date}
              href={`?date=${date}&view=${view}`}
              className={`day-tab ${selected === date ? "selected" : ""} ${date === today ? "is-today" : ""} ${meta?.kind === "holiday" ? "is-holiday" : ""}`}
              aria-current={selected === date ? "date" : undefined}
              title={meta?.label}
            >
              <span>
                {new Intl.DateTimeFormat("ru-RU", {
                  weekday: "short",
                  timeZone: "Europe/Moscow",
                }).format(new Date(`${date}T12:00:00Z`))}
              </span>
              <strong>{new Date(`${date}T12:00:00Z`).getUTCDate()}</strong>
              <i className={classes.some((c) => c.date === date) ? "has-lessons" : ""} />
            </Link>
          ) : (
            <span key={date} className="day-tab outside-semester" aria-hidden="true">
              <span>—</span>
              <strong>{new Date(`${date}T12:00:00Z`).getUTCDate()}</strong>
            </span>
          );
        })}
      </div>
      <div className="info-strip">
        <Info size={17} aria-hidden="true" />
        <span>
          Выходные и переносы учтены. Даты и время — московские. Каникулы и сессия заданы учебным
          планом концепта.
        </span>
      </div>
      {!loaded && !error && (
        <div className="panel loading-state" role="status">
          <span className="spinner" />
          Загружаем неделю…
        </div>
      )}
      {error && (
        <div className="panel" role="alert">
          <p className="form-error">{error}</p>
          <button className="button secondary" onClick={() => setAttempt((n) => n + 1)}>
            <RefreshCw size={17} aria-hidden="true" />
            Попробовать ещё раз
          </button>
        </div>
      )}
      {loaded && (
        <>
          <div className={`schedule-view ${view === "week" ? "weekly-view" : ""}`}>
            {shown.filter(validDate).map((date) => {
              const daily = classes
                .filter((c) => c.date === date)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              const meta = loaded.days.find((d) => d.date === date);
              return (
                <section className="panel" key={date}>
                  <div className="section-head">
                    <h2>
                      <DateText
                        value={date}
                        options={{ weekday: "long", day: "numeric", month: "long" }}
                      />
                    </h2>
                    <span className="muted">
                      <CalendarDays size={17} aria-hidden="true" />
                      {daily.length}
                    </span>
                  </div>
                  {meta && (meta.kind !== "study" || meta.date === "2027-02-20") && (
                    <p className={`calendar-day-note day-kind-${meta.kind}`}>{meta.label}</p>
                  )}
                  {daily.length ? (
                    daily.map((lesson, i) => <Lesson key={lesson.id} lesson={lesson} index={i} />)
                  ) : (
                    <EmptyState
                      title={
                        meta?.kind === "holiday"
                          ? meta.label
                          : meta?.kind === "vacation"
                            ? "Учебные каникулы"
                            : "День без занятий"
                      }
                      text={
                        meta?.kind === "holiday"
                          ? "Праздничный или перенесённый выходной. Отдыхай и строй свои планы."
                          : meta?.kind === "vacation"
                            ? "Время восстановиться перед новым учебным этапом."
                            : "На этот день занятия не запланированы."
                      }
                    />
                  )}
                </section>
              );
            })}
          </div>
          <details className="calendar-details">
            <summary>Как составлен календарь</summary>
            {loaded.notes.map((note, i) => (
              <p key={i}>{note}</p>
            ))}
            <p>
              <Link href="/dashboard/teachers">Преподаватели и консультации</Link>
            </p>
          </details>
        </>
      )}
    </>
  );
}
