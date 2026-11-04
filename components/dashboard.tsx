"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Files,
  ChartNoAxesCombined,
  MoveUpRight,
  Bell,
  Sparkles,
  Clock3,
  Check,
  Sun,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, Lesson, PageTitle, RequestSummary, SectionHead } from "./ui";

export function Dashboard() {
  const { data } = useWorkspace();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date());
  const lessons = data.classes
    .filter((c) => c.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
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
    .filter((d) => new Date(d.dueAt) >= new Date())
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const unread = data.notifications.filter((n) => !n.read);
  return (
    <>
      <PageTitle
        eyebrow={
          <DateText value={today} options={{ weekday: "long", day: "numeric", month: "long" }} />
        }
        title={`Привет, ${data.user.firstName} 👋`}
        description="Всё важное уже здесь. Давай посмотрим, что на орбите."
      />
      <section className="hero-banner">
        <div className="hero-copy">
          <span className="hero-label">
            <span />
            ТВОЙ УНИВЕРСИТЕТ НА СВЯЗИ
          </span>
          <h2>Учёба в твоём ритме.</h2>
          <p>
            Меньше забот о формальностях —<br className="desktop-only" /> больше времени на то, что
            вдохновляет.
          </p>
          <Link className="button hero-button" href="/dashboard/schedule">
            План на неделю
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="orbit-star">✳</span>
          <div className="floating-ticket ticket-top">
            <span className="ticket-icon">
              <CalendarDays size={21} />
            </span>
            <span>
              <strong>Всё по плану</strong>
              <small>Твой следующий шаг — здесь</small>
            </span>
            <Check size={16} />
          </div>
          <div className="floating-ticket ticket-bottom">
            <span className="ticket-icon light">
              <Sparkles size={21} />
            </span>
            <span>
              <strong>Время для большего</strong>
              <small>Деканат без очередей</small>
            </span>
          </div>
          <span className="hero-dot dot-one" />
          <span className="hero-dot dot-two" />
        </div>
      </section>
      <section className="stats-grid" aria-label="Учёба в цифрах">
        <Link className="stat-card" href="/dashboard/schedule">
          <div className="stat-top">
            <span className="stat-label">Пары сегодня</span>
            <CalendarDays size={19} aria-hidden="true" />
          </div>
          <div className="stat-number">
            {lessons.length}
            <span>занятия</span>
          </div>
          <span className="stat-foot">
            {lessons.length ? `Начало в ${lessons[0].startTime}` : "Можно выдохнуть"}
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </Link>
        <Link className="stat-card" href="/dashboard/grades">
          <div className="stat-top">
            <span className="stat-label">Средний балл</span>
            <ChartNoAxesCombined size={19} aria-hidden="true" />
          </div>
          <div className="stat-number">
            {average
              ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(average)
              : "—"}
            <span>из 5</span>
          </div>
          <span className="stat-foot positive">
            <MoveUpRight size={14} aria-hidden="true" />
            {passed} дисциплин закрыто
          </span>
        </Link>
        <Link className="stat-card" href="/dashboard/documents">
          <div className="stat-top">
            <span className="stat-label">Мои заявки</span>
            <Files size={19} aria-hidden="true" />
          </div>
          <div className="stat-number">
            {activeRequests}
            <span>в работе</span>
          </div>
          <span className="stat-foot">
            {ready ? `${ready} готовы к получению` : "Всё под контролем"}
            <span className="small-dot" />
          </span>
        </Link>
        <Link className="stat-card" href="/dashboard/notifications">
          <div className="stat-top">
            <span className="stat-label">Уведомления</span>
            <Bell size={19} aria-hidden="true" />
          </div>
          <div className="stat-number">
            {unread.length}
            <span>новых</span>
          </div>
          <span className="stat-foot">
            Не пропусти важное
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
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
                <span className="small-dot" />
                <DateText
                  value={today}
                  options={{ weekday: "long", day: "numeric", month: "long" }}
                />
              </span>
              <span>{lessons.length} занятия</span>
            </div>
            {lessons.length ? (
              lessons
                .slice(0, 4)
                .map((lesson, index) => <Lesson key={lesson.id} lesson={lesson} index={index} />)
            ) : (
              <EmptyState
                title="Сегодня без пар"
                text="Хороший день, чтобы заняться своим проектом или отдохнуть."
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
                text="Закажи первую справку — без похода в деканат."
              />
            )}
            <Link className="new-request-link" href="/dashboard/documents?new=1">
              <span>＋</span> Заказать справку или подать заявление
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </div>
        <div className="dashboard-aside">
          <section className="panel deadline-panel">
            <SectionHead title="На горизонте" href="/dashboard/notifications" link="Все" />
            <p className="panel-description">Важное, о чём стоит помнить</p>
            {upcoming.length ? (
              upcoming.slice(0, 3).map((d, i) => (
                <Link
                  key={d.id}
                  href={d.kind === "document" ? "/dashboard/documents" : "/dashboard/grades"}
                  className="deadline-item"
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
                      {new Intl.DateTimeFormat("ru-RU", {
                        timeZone: "Europe/Moscow",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(d.dueAt))}
                    </em>
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState title="Без срочных дел" text="Все ближайшие задачи закрыты." />
            )}
          </section>
          <section className="panel news-panel">
            <SectionHead title="На связи с деканатом" href="/dashboard/notifications" link="Все" />
            {data.notifications
              .filter((n) => n.kind === "news" || n.kind === "schedule")
              .slice(0, 2)
              .map((n) => (
                <Link className="news-item" href="/dashboard/notifications" key={n.id}>
                  <span className={`news-label ${n.kind === "schedule" ? "label-amber" : ""}`}>
                    {n.kind === "schedule" ? "РАСПИСАНИЕ" : "ЖИЗНЬ УНИВЕРСИТЕТА"}
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
            <Sun size={23} aria-hidden="true" />
            <p>
              Ты — больше, чем твои оценки.
              <br />
              <strong>Не забывай оставлять время для себя.</strong>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
