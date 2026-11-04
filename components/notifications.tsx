"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, CalendarDays, Files, Clock3, CheckCheck, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { apiMutation, useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, PageTitle } from "./ui";
const icons = { news: Bell, schedule: CalendarDays, request: Files, deadline: Clock3 };
const names = {
  news: "Новости",
  schedule: "Расписание",
  request: "Документы",
  deadline: "Дедлайны",
};
export function Notifications() {
  const { data, refresh } = useWorkspace();
  const params = useSearchParams();
  const filter = params.get("filter") || "all";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const filtered = data.notifications.filter(
    (n) => filter === "all" || (filter === "unread" ? !n.read : n.kind === filter),
  );
  async function mark(id?: string) {
    setPending(true);
    setError("");
    try {
      await apiMutation("/api/notifications/read", id ? { id } : {});
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить уведомления");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ВСЕГДА В КУРСЕ"
        title="Уведомления"
        description="Изменения, новости и напоминания — ничего не потеряется."
      >
        <button
          className="button secondary"
          disabled={pending || data.notifications.every((n) => n.read)}
          onClick={() => mark()}
        >
          <CheckCheck size={18} aria-hidden="true" />
          {pending ? "Обновляем…" : "Прочитать все"}
        </button>
      </PageTitle>
      <div className="filter-row">
        <div className="segmented wrap-segmented">
          {[
            { id: "all", name: "Все" },
            { id: "unread", name: "Непрочитанные" },
            { id: "schedule", name: "Расписание" },
            { id: "request", name: "Документы" },
            { id: "news", name: "Новости" },
          ].map((f) => (
            <Link key={f.id} href={`?filter=${f.id}`} className={filter === f.id ? "selected" : ""}>
              {f.name}
            </Link>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <section className="notification-list">
        {filtered.length ? (
          filtered.map((n) => {
            const Icon = icons[n.kind];
            return (
              <article key={n.id} className={`panel notification-card ${!n.read ? "unread" : ""}`}>
                <span className={`notice-icon notice-${n.kind}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div className="notification-copy">
                  <div className="notification-top">
                    <span className="eyebrow">{names[n.kind]}</span>
                    <small>
                      <DateText value={n.createdAt} />
                    </small>
                  </div>
                  <h2>
                    {n.title}
                    {!n.read && <span className="unread-dot" aria-label="Не прочитано" />}
                  </h2>
                  <p>{n.body}</p>
                  <div className="notification-links">
                    {n.href && (
                      <Link className="text-link" href={n.href}>
                        Подробнее
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                    )}
                    {!n.read && (
                      <button disabled={pending} className="text-button" onClick={() => mark(n.id)}>
                        Отметить прочитанным
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <section className="panel">
            <EmptyState title="Всё спокойно" text="В этой категории пока нет уведомлений." />
          </section>
        )}
      </section>
      <p className="sr-only" aria-live="polite">
        {pending
          ? "Обновление уведомлений"
          : `${data.notifications.filter((n) => !n.read).length} непрочитанных уведомлений`}
      </p>
    </>
  );
}
