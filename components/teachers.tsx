"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Info,
  MapPin,
  MessageSquare,
  Search,
  Send,
  X,
} from "lucide-react";
import type {
  StaffTeacherThread,
  Teacher,
  TeacherConversation,
  TeacherMessage,
  TeacherThread,
} from "@/lib/types";
import { apiMutation, useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, PageTitle } from "./ui";

async function getData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message || "Не удалось загрузить данные. Попробуй ещё раз.");
  return body.data;
}
function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  return (
    <span className={`teacher-avatar avatar-${teacher.avatarColor}`} aria-hidden="true">
      {teacher.name
        .split(" ")
        .map((n) => n[0])
        .join("")}
    </span>
  );
}

function Compose({ teacher }: { teacher: Teacher }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function close() {
    if (pending) return;
    const values = form.current ? new FormData(form.current) : null;
    if (
      (values?.get("body") || values?.get("subject")) &&
      !window.confirm("Закрыть обращение? Несохранённый текст будет потерян.")
    )
      return;
    router.replace("/dashboard/teachers");
  }
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const conversation = await apiMutation<TeacherConversation>("/api/teacher-threads", {
        teacherId: teacher.id,
        subject: values.get("subject"),
        body: values.get("body"),
      });
      router.replace(`/dashboard/teachers?thread=${encodeURIComponent(conversation.thread.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить обращение");
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="request-dialog teacher-compose"
      aria-labelledby="teacher-compose-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="dialog-heading">
        <TeacherAvatar teacher={teacher} />
        <button
          className="icon-button"
          aria-label="Закрыть обращение"
          disabled={pending}
          onClick={close}
        >
          <X size={21} />
        </button>
      </div>
      <h2 id="teacher-compose-title">Написать преподавателю</h2>
      <p>
        {teacher.name} · {teacher.department}
      </p>
      <div className="form-notice">
        <Info size={16} aria-hidden="true" />
        <span>
          Учебная симуляция. Обращение сохраняется в кабинете; отвечает тестовый сотрудник. Внешние
          письма не отправляются.
        </span>
      </div>
      <form className="request-form" ref={form} onSubmit={send}>
        <label htmlFor="teacher-subject">Тема обращения</label>
        <input
          id="teacher-subject"
          name="subject"
          required
          minLength={3}
          maxLength={120}
          autoComplete="off"
          placeholder="Например, вопрос по проекту…"
        />
        <label htmlFor="teacher-body">Сообщение</label>
        <textarea
          id="teacher-body"
          name="body"
          required
          minLength={3}
          maxLength={2000}
          rows={5}
          autoComplete="off"
          placeholder="Расскажи, с чем нужна помощь…"
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={pending}>
          {pending ? (
            "Отправляем…"
          ) : (
            <>
              Отправить обращение
              <Send size={16} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </dialog>
  );
}

function Conversation({ id }: { id: string }) {
  const {
    data: { user },
  } = useWorkspace();
  const [result, setResult] = useState<{
    id: string;
    data?: TeacherConversation;
    error?: string;
  }>();
  const [pending, setPending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getData<TeacherConversation>(
      `/api/teacher-threads/${encodeURIComponent(id)}/messages`,
      controller.signal,
    )
      .then((data) => {
        setResult({ id, data });
        return apiMutation(`/api/teacher-threads/${encodeURIComponent(id)}/read`, {}).catch(
          () => undefined,
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setResult({ id, error: error.message });
      });
    return () => controller.abort();
  }, [id, reload]);
  const conversation = result?.id === id ? result.data : undefined;
  const error = result?.id === id ? result.error : undefined;
  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setSendError("");
    try {
      const message = await apiMutation<TeacherMessage>(
        `/api/teacher-threads/${encodeURIComponent(id)}/messages`,
        { body: new FormData(form).get("body") },
      );
      setResult((current) =>
        current?.data
          ? {
              ...current,
              data: { ...current.data, messages: [...current.data.messages, message].slice(-100) },
            }
          : current,
      );
      form.reset();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Не удалось отправить сообщение");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Link className="back-link" href="/dashboard/teachers">
        <ArrowLeft size={17} aria-hidden="true" />
        Преподаватели и обращения
      </Link>
      {error ? (
        <section className="panel" role="alert">
          <p className="form-error">{error}</p>
          <button className="button secondary" onClick={() => setReload((n) => n + 1)}>
            Попробовать ещё раз
          </button>
        </section>
      ) : !conversation ? (
        <div className="panel loading-state" role="status">
          <span className="spinner" />
          Открываем диалог…
        </div>
      ) : (
        <>
          <PageTitle
            eyebrow="ЛИЧНОЕ ОБРАЩЕНИЕ"
            title={conversation.thread.subject}
            description={`Преподаватель: ${conversation.teacher.name}`}
          />
          <div className="conversation-grid">
            <section className="panel conversation-panel">
              <div className="conversation-heading">
                <MessageSquare size={19} aria-hidden="true" />
                <span>Переписка внутри прототипа</span>
                <button className="text-button" onClick={() => setReload((n) => n + 1)}>
                  Обновить диалог
                </button>
              </div>
              <div
                className="conversation-messages"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {conversation.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message-bubble ${message.senderRole === user.role ? "message-own" : ""} ${message.senderRole === "system" ? "message-system" : ""}`}
                  >
                    <div className="message-sender">
                      <strong>{message.senderName}</strong>
                      <span>
                        {message.senderRole === "staff"
                          ? "Сотрудник деканата"
                          : message.senderRole === "system"
                            ? "Системное сообщение"
                            : "Студент"}
                      </span>
                    </div>
                    <p>{message.body}</p>
                    <small>
                      <DateText
                        value={message.createdAt}
                        options={{ hour: "2-digit", minute: "2-digit" }}
                      />
                      {message.isSimulation && " · Демо"}
                    </small>
                  </article>
                ))}
              </div>
              <form className="reply-form" onSubmit={reply}>
                <label htmlFor="reply-body">Ответ в диалоге</label>
                <textarea
                  id="reply-body"
                  name="body"
                  required
                  minLength={3}
                  maxLength={2000}
                  rows={3}
                  autoComplete="off"
                  placeholder="Напиши сообщение…"
                />
                {sendError && (
                  <p role="alert" className="form-error">
                    {sendError}
                  </p>
                )}
                <button className="button primary" disabled={pending}>
                  {pending ? (
                    "Отправляем…"
                  ) : (
                    <>
                      Отправить ответ
                      <Send size={15} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </section>
            <aside className="panel teacher-conversation-card">
              <TeacherAvatar teacher={conversation.teacher} />
              <h2>{conversation.teacher.name}</h2>
              <p>{conversation.teacher.department}</p>
              <div className="teacher-detail">
                <Clock3 size={16} aria-hidden="true" />
                <span>{conversation.teacher.officeHours}</span>
              </div>
              <div className="teacher-detail">
                <MapPin size={16} aria-hidden="true" />
                <span>{conversation.teacher.office}</span>
              </div>
              <div className="form-notice">
                <Info size={16} aria-hidden="true" />
                <span>
                  Все участники — вымышленные. За преподавателя отвечает тестовый сотрудник от
                  собственного имени. Не отправляй настоящие персональные данные.
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

export function Teachers() {
  const {
    data: { user },
  } = useWorkspace();
  const params = useSearchParams();
  const [result, setResult] = useState<{
    teachers: Teacher[];
    threads: (TeacherThread | StaffTeacherThread)[];
    error?: string;
  }>();
  const [retry, setRetry] = useState(0);
  const threadId = params.get("thread");
  const selectedTeacher = params.get("teacher");
  const query = params.get("q") || "";
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
  }, [user.role, retry, threadId]);
  if (threadId) return <Conversation key={threadId} id={threadId} />;
  const teachers =
    result?.teachers.filter(
      (teacher) =>
        (!selectedTeacher || teacher.id === selectedTeacher) &&
        `${teacher.name} ${teacher.department} ${teacher.subjects.join(" ")}`
          .toLocaleLowerCase("ru-RU")
          .includes(query.toLocaleLowerCase("ru-RU")),
    ) || [];
  const composeTeacher = result?.teachers.find((teacher) => teacher.id === params.get("compose"));
  return (
    <>
      <PageTitle
        eyebrow="ЛЮДИ НА ТВОЕЙ ОРБИТЕ"
        title="Преподаватели"
        description="Найди преподавателя, время консультации и задай вопрос по учёбе."
      />
      <div className="info-strip">
        <Info size={18} aria-hidden="true" />
        <span>
          Вымышленный каталог. Обращения остаются внутри прототипа; на них отвечает тестовый
          сотрудник деканата.
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
      {selectedTeacher && (
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
        <>
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
                    href={`?compose=${encodeURIComponent(teacher.id)}`}
                  >
                    <MessageSquare size={16} aria-hidden="true" />
                    Написать преподавателю
                  </Link>
                )}
              </article>
            ))}
          </div>
          {!teachers.length && (
            <section className="panel">
              <EmptyState
                title="Никого не нашли"
                text="Попробуй фамилию преподавателя или название дисциплины."
              />
            </section>
          )}
          <div className="section-head teacher-threads-heading">
            <h2>{user.role === "staff" ? "Обращения студентов" : "Твои обращения"}</h2>
            <span className="count-bubble">{result.threads.length}</span>
          </div>
          <section className="panel teacher-thread-list">
            {result.threads.length ? (
              result.threads.map((thread) => (
                <Link
                  key={thread.id}
                  className="teacher-thread-row"
                  href={`?thread=${encodeURIComponent(thread.id)}`}
                >
                  <span className="document-icon">
                    <MessageSquare size={19} aria-hidden="true" />
                  </span>
                  <span className="teacher-thread-copy">
                    <strong>{thread.subject}</strong>
                    <span>
                      {"student" in thread
                        ? `${thread.student.name} · ${thread.student.group}`
                        : result.teachers.find((teacher) => teacher.id === thread.teacherId)?.name}
                    </span>
                    <small>{thread.lastMessage}</small>
                  </span>
                  <span className="teacher-thread-meta">
                    <DateText
                      value={thread.updatedAt}
                      options={{ day: "numeric", month: "short" }}
                    />
                    {thread.unreadCount > 0 && (
                      <span className="nav-count">{thread.unreadCount} новых</span>
                    )}
                  </span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              ))
            ) : (
              <EmptyState
                title="Диалоги ещё не начались"
                text={
                  user.role === "staff"
                    ? "Новые обращения студентов появятся здесь."
                    : "Выбери преподавателя и напиши о том, с чем нужна помощь."
                }
              />
            )}
          </section>
        </>
      )}
      {composeTeacher && <Compose key={composeTeacher.id} teacher={composeTeacher} />}
    </>
  );
}
