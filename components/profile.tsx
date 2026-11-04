"use client";
import { UserRound, ShieldCheck, GraduationCap } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { PageTitle } from "./ui";
export function Profile() {
  const {
    data: { user },
  } = useWorkspace();
  return (
    <>
      <PageTitle
        eyebrow="ТВОЁ ПРОСТРАНСТВО"
        title="Профиль"
        description="Всё, что университет знает о тебе — в одном месте."
      />
      <div className="profile-grid">
        <section className="panel profile-card">
          <span className="avatar avatar-large">{user.firstName.slice(0, 1)}</span>
          <h2>{user.name}</h2>
          <span className="badge status-ready">
            <GraduationCap size={15} aria-hidden="true" />
            {user.role === "student" ? "Студент" : "Сотрудник деканата"}
          </span>
          <p>{user.faculty}</p>
          <span className="supporting-note">Вымышленный тестовый профиль</span>
        </section>
        <section className="panel">
          <h2>
            <UserRound size={20} aria-hidden="true" />
            Основные сведения
          </h2>
          <dl className="detail-list">
            {[
              { label: "ФИО", value: user.name },
              { label: "Факультет", value: user.faculty },
              { label: "Направление", value: user.program },
              { label: "Курс", value: String(user.year) },
              { label: "Группа", value: user.group },
              { label: "Номер студенческого", value: user.studentNumber },
              { label: "Электронная почта", value: user.email },
              { label: "Логин", value: user.login },
            ].map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <div className="info-strip">
        <ShieldCheck size={19} aria-hidden="true" />
        <span>
          Данные профиля доступны только после входа. В прототипе редактирование учебных сведений
          отключено.
        </span>
      </div>
    </>
  );
}
