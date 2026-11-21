"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Clock3, GraduationCap } from "lucide-react";
import { mondayInMoscow, moscowDate } from "@/lib/time";
import type { ClassItem } from "@/lib/types";
import { useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, Lesson, PageTitle, RequestSummary, SectionHead } from "./ui";

const moscowTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function Dashboard({ initialTime }: { initialTime: number }) {
  const { data, refresh } = useWorkspace();
  const [viewTime, setViewTime] = useState(initialTime);
  const requestedWeek = useRef<string>(null);
  useEffect(() => {
    let timer = window.setTimeout(tick, 0);
    function tick() {
      const now = Date.now();
      setViewTime(now);
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, 60_000 - (now % 60_000));
    }
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const now = new Date(viewTime);
  const today = moscowDate(now);
  const currentTime = moscowTime.format(now);
  const weekStart = mondayInMoscow(now);
  const hasCurrentWeek = data.weekStart === weekStart;
  useEffect(() => {
    if (hasCurrentWeek) return;
    function refreshWeek() {
      if (requestedWeek.current === weekStart || document.visibilityState === "hidden") return;
      requestedWeek.current = weekStart;
      void refresh()
        .catch(() => {})
        .finally(() => {
          if (requestedWeek.current === weekStart) requestedWeek.current = null;
        });
    }
    refreshWeek();
    window.addEventListener("online", refreshWeek);
    document.addEventListener("visibilitychange", refreshWeek);
    return () => {
      window.removeEventListener("online", refreshWeek);
      document.removeEventListener("visibilitychange", refreshWeek);
    };
  }, [hasCurrentWeek, refresh, weekStart]);
  const lessons = data.classes.filter((lesson) => lesson.date === today);
  // The workspace returns classes in chronological order, including timetable changes.
  const stillAhead = (lesson: ClassItem) =>
    lesson.date > today || (lesson.date === today && lesson.endTime > currentTime);
  const highlight =
    data.classes.find(stillAhead) ??
    (data.nextWeekLesson && stillAhead(data.nextWeekLesson) ? data.nextWeekLesson : undefined);
  const inProgress = highlight?.date === today && highlight.startTime <= currentTime;
  let heroTitle = "Расписание группы";
  if (highlight) heroTitle = highlight.subject;
  else if (hasCurrentWeek)
    heroTitle = lessons.length ? "Занятия на сегодня закончились" : "Сегодня без занятий";
  const passed = data.grades.filter((g) => g.status === "passed").length;
  const scored = data.grades.filter(
    (g) => g.status === "passed" && Number(g.grade) > 0 && Number(g.grade) <= 5,
  );
  const average = scored.length
    ? scored.reduce((s, g) => s + Number(g.grade), 0) / scored.length
    : 0;
  const activeRequests = data.requests.filter(
    (r) => r.status === "processing" || r.status === "submitted",
  ).length;
  const ready = data.requests.filter((r) => r.status === "ready").length;
  const upcoming = data.deadlines
    .filter((d) => Date.parse(d.dueAt) >= viewTime)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const unread = data.notifications.filter((n) => !n.read);
  return (
    <>
      <PageTitle
        eyebrow={
          <DateText value={today} options={{ weekday: "long", day: "numeric", month: "long" }} />
        }
        title="Главная"
        description={`${data.user.name} · ${data.user.group}`}
      />
      <section className="hero-banner">
        <div className="hero-copy">
          <span className="hero-label">
            {inProgress
              ? "Сейчас в расписании"
              : highlight
                ? "Ближайшее занятие"
                : "Учебный календарь"}
          </span>
          <h2>{heroTitle}</h2>
          {highlight && (
            <p className="hero-details">
              <span>
                <DateText value={highlight.date} /> · {highlight.startTime}–{highlight.endTime} мск
              </span>
              <span>
                Аудитория {highlight.room} · {highlight.building}
              </span>
            </p>
          )}
          <Link
            className="button hero-button"
            href={highlight ? `/dashboard/schedule?date=${highlight.date}` : "/dashboard/schedule"}
          >
            Открыть расписание
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="stats-grid" aria-label="Учёба в цифрах">
        <Link className="stat-card" href="/dashboard/schedule">
          <div className="stat-top">
            <span className="stat-label">Пары сегодня</span>
          </div>
          <div className="stat-number">{hasCurrentWeek ? lessons.length : "—"}</div>
          {lessons.length > 0 && <span className="stat-foot">Первая в {lessons[0].startTime}</span>}
        </Link>
        <Link className="stat-card" href="/dashboard/grades">
          <div className="stat-top">
            <span className="stat-label">Средний балл</span>
          </div>
          <div className="stat-number">
            {average
              ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(average)
              : "—"}
            <span>из 5</span>
          </div>
          <span className="stat-foot">
            Сдано {passed} из {data.grades.length}
          </span>
        </Link>
        <Link className="stat-card" href="/dashboard/documents">
          <div className="stat-top">
            <span className="stat-label">Мои заявки</span>
          </div>
          <div className="stat-number">
            {activeRequests}
            <span>в работе</span>
          </div>
          <span className="stat-foot">К получению — {ready}</span>
        </Link>
        <Link className="stat-card" href="/dashboard/notifications">
          <div className="stat-top">
            <span className="stat-label">Уведомления</span>
          </div>
          <div className="stat-number">
            {unread.length}
            <span>не прочитано</span>
          </div>
          <span className="stat-foot">Всего — {data.notifications.length}</span>
        </Link>
      </section>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="panel schedule-panel">
            <SectionHead
              title="Сегодня в расписании"
              href="/dashboard/schedule"
              link="Всё расписание"
            />
            <div className="schedule-subhead">
              <span>
                <DateText
                  value={today}
                  options={{ weekday: "long", day: "numeric", month: "long" }}
                />
              </span>
              {hasCurrentWeek && <span>Пар в расписании — {lessons.length}</span>}
            </div>
            {lessons.length ? (
              lessons
                .slice(0, 4)
                .map((lesson, index) => <Lesson key={lesson.id} lesson={lesson} index={index} />)
            ) : (
              <EmptyState
                title={hasCurrentWeek ? "Сегодня без пар" : "Началась новая учебная неделя"}
                text="Занятия по дням доступны в полном расписании."
              />
            )}
          </section>
          <section className="panel">
            <SectionHead title="Мои документы" href="/dashboard/documents" link="Все заявки" />
            {data.requests.length ? (
              data.requests
                .slice(0, 3)
                .map((request) => <RequestSummary key={request.id} request={request} />)
            ) : (
              <EmptyState
                title="Пока нет заявок"
                text="Выбери документ и отправь заявку через кабинет."
              />
            )}
            <Link className="new-request-link" href="/dashboard/documents?new=1">
              Заказать справку или подать заявление
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </div>
        <div className="dashboard-aside">
          <section className="panel deadline-panel">
            <SectionHead title="Ближайшие дедлайны" href="/dashboard/notifications" link="Все" />
            {upcoming.length ? (
              upcoming.slice(0, 3).map((d, i) => (
                <Link
                  key={d.id}
                  href={d.kind === "document" ? "/dashboard/documents" : "/dashboard/grades"}
                  className={`deadline-item ${new Date(d.dueAt).getTime() - viewTime <= 48 * 60 * 60_000 ? "is-urgent" : ""}`}
                >
                  <span className={`deadline-date deadline-${i}`}>
                    <strong>
                      {new Intl.DateTimeFormat("ru-RU", {
                        timeZone: "Europe/Moscow",
                        day: "2-digit",
                      }).format(new Date(d.dueAt))}
                    </strong>
                    <small>
                      {new Intl.DateTimeFormat("ru-RU", {
                        timeZone: "Europe/Moscow",
                        month: "short",
                      }).format(new Date(d.dueAt))}
                    </small>
                  </span>
                  <span>
                    <strong>{d.title}</strong>
                    <small>{d.subject}</small>
                    <em>
                      <Clock3 size={11} aria-hidden="true" />
                      {moscowTime.format(new Date(d.dueAt))}
                    </em>
                  </span>
                </Link>
              ))
            ) : (
              <p className="panel-description">Предстоящих дедлайнов нет.</p>
            )}
          </section>
          <section className="panel news-panel">
            <SectionHead title="Объявления" href="/dashboard/notifications" link="Все" />
            {data.notifications
              .filter((n) => n.kind === "news" || n.kind === "schedule")
              .slice(0, 2)
              .map((n) => (
                <Link className="news-item" href="/dashboard/notifications" key={n.id}>
                  <span className={`news-label ${n.kind === "schedule" ? "label-amber" : ""}`}>
                    {n.kind === "schedule" ? "Расписание" : "Жизнь университета"}
                  </span>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small>
                    <DateText value={n.createdAt} />
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </small>
                </Link>
              ))}
          </section>
          <div className="wellbeing-note">
            <GraduationCap size={20} aria-hidden="true" />
            <p>
              Консультации преподавателей
              <br />
              <Link className="text-link" href="/dashboard/teachers">
                Кафедры и часы приёма
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
