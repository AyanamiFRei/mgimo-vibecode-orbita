"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock3, Info, MapPin, MessageSquare, Search } from "lucide-react";
import type { Teacher } from "@/lib/types";
import { useWorkspace } from "./workspace-provider";
import { EmptyState, PageTitle } from "./ui";
import { getData, TeacherAvatar } from "./teacher-conversation";

export function Teachers() {
  const {
    data: { user },
  } = useWorkspace();
  const params = useSearchParams();
  const [result, setResult] = useState<{ teachers: Teacher[]; error?: string }>();
  const [retry, setRetry] = useState(0);
  const selected = params.get("teacher");
  const query = params.get("q") || "";
  useEffect(() => {
    const controller = new AbortController();
    getData<Teacher[]>("/api/teachers", controller.signal)
      .then((teachers) => setResult({ teachers }))
      .catch((error) => {
        if (error.name !== "AbortError") setResult({ teachers: [], error: error.message });
      });
    return () => controller.abort();
  }, [retry]);
  const teachers =
    result?.teachers.filter(
      (teacher) =>
        (!selected || teacher.id === selected) &&
        `${teacher.name} ${teacher.department} ${teacher.subjects.join(" ")}`
          .toLocaleLowerCase("ru-RU")
          .includes(query.toLocaleLowerCase("ru-RU")),
    ) || [];
  return (
    <>
      <PageTitle title="Преподаватели" description="Дисциплины, кафедры и часы консультаций.">
        <Link className="button primary" href="/dashboard/chats">
          <MessageSquare size={17} aria-hidden="true" />
          Открыть чаты
        </Link>
      </PageTitle>
      <div className="info-strip">
        <Info size={18} aria-hidden="true" />
        <span>
          Каталог вымышленных преподавателей. Переписка доступна в отдельном разделе «Чаты».
        </span>
      </div>
      <form action="/dashboard/teachers" className="search-page-form" role="search">
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="teacher-search">
          Найти преподавателя
        </label>
        <input
          id="teacher-search"
          name="q"
          defaultValue={query}
          maxLength={100}
          autoComplete="off"
          placeholder="Имя, кафедра или дисциплина…"
        />
        <button className="button secondary" type="submit">
          Найти
        </button>
      </form>
      {selected && (
        <Link href="/dashboard/teachers" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Все преподаватели
        </Link>
      )}
      {!result ? (
        <div className="panel loading-state" role="status">
          <span className="spinner" />
          Загружаем преподавателей…
        </div>
      ) : result.error ? (
        <section className="panel" role="alert">
          <p className="form-error">{result.error}</p>
          <button className="button secondary" onClick={() => setRetry((n) => n + 1)}>
            Попробовать ещё раз
          </button>
        </section>
      ) : (
        <div className="teachers-grid">
          {teachers.map((teacher) => (
            <article key={teacher.id} className="panel teacher-card">
              <div className="teacher-card-top">
                <TeacherAvatar teacher={teacher} />
                <span className="badge status-ready">Вымышленный профиль</span>
              </div>
              <h2>{teacher.name}</h2>
              <p className="teacher-title">
                {teacher.title} · {teacher.department}
              </p>
              <div className="teacher-subjects">
                {teacher.subjects.map((subject) => (
                  <span key={subject}>{subject}</span>
                ))}
              </div>
              <p className="teacher-bio">{teacher.bio}</p>
              <div className="teacher-detail">
                <Clock3 size={15} aria-hidden="true" />
                <span>Консультации: {teacher.officeHours}</span>
              </div>
              <div className="teacher-detail">
                <MapPin size={15} aria-hidden="true" />
                <span>{teacher.office}</span>
              </div>
              {user.role === "student" && (
                <Link
                  className="button secondary teacher-write"
                  role="button"
                  href={`/dashboard/chats?compose=${encodeURIComponent(teacher.id)}`}
                >
                  <MessageSquare size={16} aria-hidden="true" />
                  Написать преподавателю
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
      {result && !result.error && !teachers.length && (
        <section className="panel">
          <EmptyState
            title="Преподаватели не найдены"
            text="Измени запрос или открой полный каталог."
          />
        </section>
      )}
    </>
  );
}
