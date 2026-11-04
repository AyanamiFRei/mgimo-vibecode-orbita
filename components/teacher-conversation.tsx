"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock3, Info, MapPin, MessageSquare, Send, X } from "lucide-react";
import type { Teacher, TeacherConversation, TeacherMessage } from "@/lib/types";
import { apiMutation, useWorkspace } from "./workspace-provider";
import { DateText, PageTitle } from "./ui";
import { AutoResizeTextarea } from "./auto-resize-textarea";

export async function getData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message || "Не удалось загрузить данные. Попробуй ещё раз.");
  return body.data;
}
export function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  return (
    <span className={`teacher-avatar avatar-${teacher.avatarColor}`} aria-hidden="true">
      {teacher.name
        .split(" ")
        .map((n) => n[0])
        .join("")}
    </span>
  );
}

export function TeacherCompose({ teacher }: { teacher: Teacher }) {
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
    router.replace("/dashboard/chats");
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
      router.replace(`/dashboard/chats?thread=${encodeURIComponent(conversation.thread.id)}`);
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
        <AutoResizeTextarea
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

export function TeacherConversationView({ id }: { id: string }) {
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
      <Link className="back-link" href="/dashboard/chats">
        <ArrowLeft size={17} aria-hidden="true" />
        Все чаты
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
                <AutoResizeTextarea
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
