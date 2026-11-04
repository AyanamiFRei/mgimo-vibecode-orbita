"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  UserRound,
  Check,
  Clock3,
  CircleDashed,
  CircleX,
  FileText,
} from "lucide-react";
import type { ClassItem, RequestStatus, RequestType, StudentRequest } from "@/lib/types";

export const requestTitles: Record<RequestType, string> = {
  study: "Справка об обучении",
  scholarship: "Справка о стипендии",
  transcript: "Выписка об успеваемости",
  application: "Заявление в деканат",
};
export const statusTitles: Record<RequestStatus, string> = {
  submitted: "Отправлена",
  processing: "В работе",
  ready: "Готова",
  rejected: "Отклонена",
};
const statusIcons = {
  submitted: CircleDashed,
  processing: Clock3,
  ready: Check,
  rejected: CircleX,
};
export function Status({ status }: { status: RequestStatus }) {
  const Icon = statusIcons[status];
  return (
    <span className={`badge status-${status}`}>
      <Icon size={13} aria-hidden="true" />
      {statusTitles[status]}
    </span>
  );
}
export function DateText({
  value,
  options,
}: {
  value: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  return (
    <>
      {new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        day: "numeric",
        month: "long",
        ...options,
      }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))}
    </>
  );
}
export function SectionHead({
  title,
  href,
  link = "Все",
}: {
  title: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {href && (
        <Link className="text-link" href={href}>
          {link}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Check size={25} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Lesson({ lesson, index }: { lesson: ClassItem; index: number }) {
  return (
    <article className={`lesson ${lesson.changed ? "lesson-changed" : ""}`}>
      <div className="lesson-time">
        <strong>{lesson.startTime}</strong>
        <span>{lesson.endTime}</span>
      </div>
      <div className={`lesson-line line-${index % 3}`} />
      <div className="lesson-info">
        <div className="lesson-tags">
          <span className={`lesson-type type-${lesson.type}`}>
            {
              { lecture: "Лекция", seminar: "Семинар", practice: "Практика", exam: "Экзамен" }[
                lesson.type
              ]
            }
          </span>
          {lesson.changed && <span className="changed-label">Есть изменение</span>}
        </div>
        <h3>{lesson.subject}</h3>
        <div className="lesson-meta">
          <span>
            <UserRound size={13} aria-hidden="true" />
            {lesson.teacherId ? (
              <Link href={`/dashboard/teachers?teacher=${encodeURIComponent(lesson.teacherId)}`}>
                {lesson.teacher}
              </Link>
            ) : (
              lesson.teacher
            )}
          </span>
          <span>
            <MapPin size={13} aria-hidden="true" />
            {lesson.room} · {lesson.building}
          </span>
        </div>
        {lesson.changed && <p className="change-note">{lesson.changeNote}</p>}
      </div>
    </article>
  );
}
export function RequestSummary({ request }: { request: StudentRequest }) {
  return (
    <Link
      className="request-summary"
      href={`/dashboard/documents?id=${encodeURIComponent(request.id)}`}
    >
      <span className={`document-icon ${request.status === "ready" ? "document-ready" : ""}`}>
        <FileText size={20} aria-hidden="true" />
      </span>
      <span className="request-summary-text">
        <strong>{request.title}</strong>
        <small>
          № {request.number} · <DateText value={request.createdAt} />
        </small>
      </span>
      <Status status={request.status} />
    </Link>
  );
}
