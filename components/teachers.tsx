import Form from "next/form";
import { ArrowUpRight, Clock3, Info, MapPin, MessageSquare, Search } from "lucide-react";
import type { Role, Teacher } from "@/lib/types";
import { EmptyState, PageTitle } from "./ui";
import { TeacherAvatar } from "./teacher-conversation";
import { NavigationLink } from "./navigation-link";

export function Teachers({
  teachers,
  role,
  query,
}: {
  teachers: Teacher[];
  role: Role;
  query: string;
}) {
  const normalizedQuery = query.toLocaleLowerCase("ru-RU");
  const matches = teachers.filter((teacher) =>
    `${teacher.name} ${teacher.department} ${teacher.subjects.join(" ")}`
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery),
  );
  return (
    <>
      <PageTitle title="Преподаватели" description="Дисциплины, кафедры и часы консультаций.">
        <NavigationLink className="button primary" href="/dashboard/chats">
          <MessageSquare size={17} aria-hidden="true" />
          Открыть чаты
        </NavigationLink>
      </PageTitle>
      <div className="info-strip">
        <Info size={18} aria-hidden="true" />
        <span>
          Каталог вымышленных преподавателей. Переписка доступна в отдельном разделе «Чаты».
        </span>
      </div>
      <Form
        action="/dashboard/teachers"
        prefetch={false}
        className="search-page-form"
        role="search"
      >
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="teacher-search">
          Найти преподавателя
        </label>
        <input
          key={query}
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
      </Form>
      {matches.length ? (
        <div className="teachers-grid">
          {matches.map((teacher) => (
            <article key={teacher.id} className="panel teacher-card">
              <div className="teacher-card-top">
                <TeacherAvatar teacher={teacher} />
                <span className="badge status-ready">Вымышленный профиль</span>
              </div>
              <h2>
                <NavigationLink
                  className="teacher-profile-link"
                  prefetch={false}
                  href={`/dashboard/teachers/${encodeURIComponent(teacher.id)}`}
                >
                  {teacher.name} <ArrowUpRight size={16} aria-hidden="true" />
                </NavigationLink>
              </h2>
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
              {role === "student" && (
                <NavigationLink
                  className="button secondary teacher-write"
                  role="button"
                  prefetch={false}
                  href={`/dashboard/chats?compose=${encodeURIComponent(teacher.id)}`}
                >
                  <MessageSquare size={16} aria-hidden="true" />
                  Написать преподавателю
                </NavigationLink>
              )}
            </article>
          ))}
        </div>
      ) : (
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
