import { ArrowUpRight, Info, MessageSquare, Plus } from "lucide-react";
import type { Role, StaffTeacherThread, Teacher, TeacherThread } from "@/lib/types";
import { DateText, EmptyState, PageTitle } from "./ui";
import { TeacherAvatar, TeacherCompose } from "./teacher-conversation";
import { NavigationLink } from "./navigation-link";

export function Chats({
  teachers,
  threads,
  role,
  compose,
}: {
  teachers: Teacher[];
  threads: (TeacherThread | StaffTeacherThread)[];
  role: Role;
  compose?: string;
}) {
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const composeTeacher = compose && teachersById.get(compose);
  return (
    <>
      <PageTitle
        title="Чаты"
        description={
          role === "staff"
            ? "Обращения студентов и ответы сотрудника."
            : "Переписка с преподавателями по учебным вопросам."
        }
      >
        {role === "student" && (
          <a href="#new-chat" className="button primary">
            <Plus size={17} aria-hidden="true" />
            Новый чат
          </a>
        )}
      </PageTitle>
      <section className="existing-chats" aria-labelledby="existing-chats-title">
        <div className="section-head">
          <h2 id="existing-chats-title">{role === "staff" ? "Входящие обращения" : "Ваши чаты"}</h2>
          <span className="count-bubble">{threads.length}</span>
        </div>
        {threads.length ? (
          <div className="chat-cards">
            {threads.map((thread) => {
              const teacher = teachersById.get(thread.teacherId);
              return (
                <NavigationLink
                  key={thread.id}
                  className="panel chat-card"
                  prefetch={false}
                  href={`/dashboard/chats?thread=${encodeURIComponent(thread.id)}`}
                >
                  <div className="chat-card-heading">
                    {teacher ? (
                      <TeacherAvatar teacher={teacher} />
                    ) : (
                      <span className="document-icon">
                        <MessageSquare size={22} aria-hidden="true" />
                      </span>
                    )}
                    <span className="chat-card-person">
                      <strong>{teacher?.name || "Преподаватель"}</strong>
                      {"student" in thread && (
                        <small>
                          {thread.student.name} · {thread.student.group}
                        </small>
                      )}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="badge status-ready">{thread.unreadCount} новых</span>
                    )}
                  </div>
                  <h3>{thread.subject}</h3>
                  <p>{thread.lastMessage || "Сообщений пока нет"}</p>
                  <div className="chat-card-footer">
                    <DateText
                      value={thread.updatedAt}
                      options={{
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }}
                    />
                    <span>
                      Открыть диалог
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </span>
                  </div>
                </NavigationLink>
              );
            })}
          </div>
        ) : (
          <div className="panel">
            <EmptyState
              title="Чатов пока нет"
              text={
                role === "staff"
                  ? "Обращения студентов появятся в этом разделе."
                  : "Выберите преподавателя ниже, чтобы начать переписку."
              }
            />
          </div>
        )}
      </section>
      {role === "student" && (
        <section id="new-chat" className="new-chat-section" aria-labelledby="new-chat-title">
          <div className="section-head">
            <h2 id="new-chat-title">Начать новый чат</h2>
            <NavigationLink href="/dashboard/teachers" className="text-link">
              Каталог преподавателей
              <ArrowUpRight size={15} aria-hidden="true" />
            </NavigationLink>
          </div>
          <p className="panel-description">Выберите преподавателя и укажите тему обращения.</p>
          <div className="chat-teacher-picker">
            {teachers.map((teacher) => (
              <NavigationLink
                href={`/dashboard/chats?compose=${encodeURIComponent(teacher.id)}`}
                key={teacher.id}
                className="panel chat-teacher-option"
                prefetch={false}
              >
                <TeacherAvatar teacher={teacher} />
                <span>
                  <strong>{teacher.name}</strong>
                  <small>{teacher.subjects.join(" · ")}</small>
                </span>
                <Plus size={18} aria-hidden="true" />
              </NavigationLink>
            ))}
          </div>
        </section>
      )}
      <div className="info-strip">
        <Info size={17} aria-hidden="true" />
        <span>
          Все участники вымышленные. В прототипе отвечает тестовый сотрудник деканата; внешние
          письма не отправляются.
        </span>
      </div>
      {composeTeacher && role === "student" && (
        <TeacherCompose key={composeTeacher.id} teacher={composeTeacher} />
      )}
    </>
  );
}
