import Link from "next/link";
import { ArrowLeft, CalendarDays, MessageSquare } from "lucide-react";
import { TeacherAvatar } from "@/components/teacher-conversation";
import { getPageTeacher } from "./teacher";

export default async function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher, role } = await getPageTeacher((await params).id);
  const id = encodeURIComponent(teacher.id);
  return (
    <>
      <Link className="back-link" href="/dashboard/teachers">
        <ArrowLeft size={16} aria-hidden="true" /> Все преподаватели
      </Link>
      <article className="panel teacher-profile">
        <header className="teacher-profile-heading">
          <TeacherAvatar teacher={teacher} />
          <div>
            <h1>{teacher.name}</h1>
            <p>
              {teacher.title} · {teacher.department}
            </p>
          </div>
        </header>
        <p className="teacher-bio">{teacher.bio}</p>
        <dl className="teacher-profile-details">
          <div>
            <dt>Дисциплины</dt>
            <dd>
              <ul>
                {teacher.subjects.map((subject) => (
                  <li key={subject}>{subject}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Консультации</dt>
            <dd>{teacher.officeHours}</dd>
          </div>
          <div>
            <dt>Кабинет</dt>
            <dd>{teacher.office}</dd>
          </div>
        </dl>
        <div className="teacher-profile-actions">
          <Link className="button primary" href={`/dashboard/teachers/${id}/schedule`}>
            <CalendarDays size={17} aria-hidden="true" />
            Расписание преподавателя
          </Link>
          {role === "student" && (
            <Link className="button secondary" href={`/dashboard/chats?compose=${id}`}>
              <MessageSquare size={16} aria-hidden="true" />
              Написать преподавателю
            </Link>
          )}
        </div>
      </article>
    </>
  );
}
