"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { EmptyState, PageTitle } from "./ui";
export function Search() {
  const { data } = useWorkspace();
  const params = useSearchParams();
  const query = params.get("q")?.trim().slice(0, 100) || "";
  const matches = (text: string) =>
    query && text.toLocaleLowerCase("ru-RU").includes(query.toLocaleLowerCase("ru-RU"));
  const results = [
    ...data.classes
      .filter((c) => matches(`${c.subject} ${c.teacher} ${c.room}`))
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        title: c.subject,
        description: `${c.date} · ${c.startTime} · ${c.room}`,
        href: `/dashboard/schedule?date=${c.date}`,
      })),
    ...data.grades
      .filter((g) => matches(g.subject))
      .map((g) => ({
        id: g.id,
        title: g.subject,
        description: "Успеваемость",
        href: "/dashboard/grades",
      })),
    ...data.requests
      .filter((r) => matches(`${r.title} ${r.purpose} ${r.number}`))
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.purpose,
        href: `/dashboard/documents?id=${r.id}`,
      })),
    ...data.notifications
      .filter((n) => matches(`${n.title} ${n.body}`))
      .map((n) => ({
        id: n.id,
        title: n.title,
        description: "Уведомление",
        href: "/dashboard/notifications",
      })),
  ];
  return (
    <>
      <PageTitle
        title="Поиск по кабинету"
        description="Расписание, дисциплины, документы и объявления."
      />
      <form action="/dashboard/search" className="search-page-form" role="search">
        <label className="sr-only" htmlFor="search-query">
          Что найти?
        </label>
        <SearchIcon size={20} aria-hidden="true" />
        <input
          id="search-query"
          name="q"
          defaultValue={query}
          maxLength={100}
          autoComplete="off"
          placeholder="Например, английский язык…"
        />
        <button className="button primary" type="submit">
          Найти
        </button>
      </form>
      <section className="panel">
        {results.length ? (
          <>
            <p className="muted">Найдено: {results.length}</p>
            {results.map((r, i) => (
              <Link className="search-result" href={r.href} key={`${r.id}-${i}`}>
                <span>
                  <strong>{r.title}</strong>
                  <small>{r.description}</small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </>
        ) : (
          <EmptyState
            title={query ? "Ничего не нашлось" : "Что будем искать?"}
            text={
              query
                ? "Попробуй другое слово или более короткий запрос."
                : "Введи название дисциплины, документа или преподавателя."
            }
          />
        )}
      </section>
    </>
  );
}
