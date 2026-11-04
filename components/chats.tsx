"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Info, MessageSquare, Plus } from "lucide-react";
import type { StaffTeacherThread, Teacher, TeacherThread } from "@/lib/types";
import { useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, PageTitle } from "./ui";
import {
  getData,
  TeacherAvatar,
  TeacherCompose,
  TeacherConversationView,
} from "./teacher-conversation";

export function Chats() {
  const {
    data: { user },
  } = useWorkspace();
  const params = useSearchParams();
  const threadId = params.get("thread");
  const [result, setResult] = useState<{
    teachers: Teacher[];
    threads: (TeacherThread | StaffTeacherThread)[];
    error?: string;
  }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (threadId) return;
    const controller = new AbortController();
    Promise.all([
      getData<Teacher[]>("/api/teachers", controller.signal),
      getData<(TeacherThread | StaffTeacherThread)[]>(
        user.role === "staff" ? "/api/staff/teacher-threads" : "/api/teacher-threads",
        controller.signal,
      ),
    ])
      .then(([teachers, threads]) => setResult({ teachers, threads }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setResult({ teachers: [], threads: [], error: error.message });
      });
    return () => controller.abort();
  }, [threadId, user.role, retry]);
  if (threadId) return <TeacherConversationView key={threadId} id={threadId} />;
  const composeTeacher = result?.teachers.find((teacher) => teacher.id === params.get("compose"));
  return (
    <>
      <PageTitle
        title="Чаты"
        description={
          user.role === "staff"
            ? "Обращения студентов и ответы сотрудника."
            : "Переписка с преподавателями по учебным вопросам."
        }
      >
        {user.role === "student" && (
          <Link href="#new-chat" className="button primary">
            <Plus size={17} aria-hidden="true" />
            Новый чат
          </Link>
        )}
      </PageTitle>
      <section className="existing-chats" aria-labelledby="existing-chats-title">
        <div className="section-head">
          <h2 id="existing-chats-title">
            {user.role === "staff" ? "Входящие обращения" : "Ваши чаты"}
          </h2>
          {result && !result.error && <span className="count-bubble">{result.threads.length}</span>}
        </div>
        {!result ? (
          <div className="panel loading-state" role="status">
            <span className="spinner" />
            Загружаем чаты…
          </div>
        ) : result.error ? (
          <div className="panel" role="alert">
            <p className="form-error">{result.error}</p>
            <button className="button secondary" onClick={() => setRetry((n) => n + 1)}>
              Попробовать ещё раз
            </button>
          </div>
        ) : result.threads.length ? (
          <div className="chat-cards">
            {result.threads.map((thread) => {
              const teacher = result.teachers.find((item) => item.id === thread.teacherId);
              return (
                <Link
                  key={thread.id}
                  className="panel chat-card"
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
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="panel">
            <EmptyState
              title="Чатов пока нет"
              text={
                user.role === "staff"
                  ? "Обращения студентов появятся в этом разделе."
                  : "Выберите преподавателя ниже, чтобы начать переписку."
              }
            />
          </div>
        )}
      </section>
      {user.role === "student" && (
        <section id="new-chat" className="new-chat-section" aria-labelledby="new-chat-title">
          <div className="section-head">
            <h2 id="new-chat-title">Начать новый чат</h2>
            <Link href="/dashboard/teachers" className="text-link">
              Каталог преподавателей
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <p className="panel-description">Выберите преподавателя и укажите тему обращения.</p>
          <div className="chat-teacher-picker">
            {result?.teachers.map((teacher) => (
              <Link
                href={`/dashboard/chats?compose=${encodeURIComponent(teacher.id)}`}
                key={teacher.id}
                className="panel chat-teacher-option"
              >
                <TeacherAvatar teacher={teacher} />
                <span>
                  <strong>{teacher.name}</strong>
                  <small>{teacher.subjects.join(" · ")}</small>
                </span>
                <Plus size={18} aria-hidden="true" />
              </Link>
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
      {composeTeacher && user.role === "student" && (
        <TeacherCompose key={composeTeacher.id} teacher={composeTeacher} />
      )}
    </>
  );
}
