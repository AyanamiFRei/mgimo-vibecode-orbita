"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, GraduationCap, TrendingUp, BookOpen } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, PageTitle } from "./ui";
export function Grades() {
  const { data } = useWorkspace();
  const params = useSearchParams();
  const filter = params.get("filter") || "all";
  const grades = data.grades.filter(
    (g) =>
      filter === "all" || (filter === "passed" ? g.status === "passed" : g.status !== "passed"),
  );
  const completed = data.grades.filter((g) => g.status === "passed");
  const numeric = completed.map((g) => Number(g.grade)).filter((g) => g > 0 && g <= 5);
  const average = numeric.length ? numeric.reduce((s, n) => s + n, 0) / numeric.length : 0;
  return (
    <>
      <PageTitle
        eyebrow="ТЕКУЩИЙ УЧЕБНЫЙ ПЕРИОД"
        title="Успеваемость"
        description="Текущие баллы, итоговые оценки, зачёты и даты экзаменов."
      />
      <div className="grade-stats">
        <div className="panel grade-stat">
          <TrendingUp size={22} aria-hidden="true" />
          <span>Средний балл</span>
          <strong>
            {average
              ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(average)
              : "—"}
            <small> / 5</small>
          </strong>
          <p>По закрытым дисциплинам с оценкой</p>
        </div>
        <div className="panel grade-stat">
          <Check size={22} aria-hidden="true" />
          <span>Закрыто дисциплин</span>
          <strong>
            {completed.length}
            <small> / {data.grades.length}</small>
          </strong>
          <p>Дисциплины с итоговой аттестацией</p>
        </div>
        <div className="panel grade-stat">
          <GraduationCap size={22} aria-hidden="true" />
          <span>Зачётные единицы</span>
          <strong>
            {completed.reduce((s, g) => s + g.credits, 0)}
            <small> з. е.</small>
          </strong>
          <p>За успешно пройденные дисциплины</p>
        </div>
      </div>
      <div className="filter-row">
        <div className="segmented">
          {[
            { id: "all", title: "Все дисциплины" },
            { id: "active", title: "В процессе" },
            { id: "passed", title: "Закрытые" },
          ].map((f) => (
            <Link key={f.id} href={`?filter=${f.id}`} className={filter === f.id ? "selected" : ""}>
              {f.title}
            </Link>
          ))}
        </div>
        <span className="muted">Текущий учебный период</span>
      </div>
      <section className="panel grade-list">
        {grades.length ? (
          grades.map((g) => (
            <article className="grade-row" key={g.id}>
              <div className="grade-subject">
                <span className="document-icon">
                  <BookOpen size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2>{g.subject}</h2>
                  <p>
                    {g.teacher} · {g.assessment}
                  </p>
                  {g.examDate && (
                    <small>
                      Контроль: <DateText value={g.examDate} />
                    </small>
                  )}
                </div>
              </div>
              <div className="grade-progress">
                <span>
                  {g.score} / {g.maxScore} баллов
                </span>
                <progress
                  value={g.score}
                  max={g.maxScore}
                  aria-label={`Баллы по дисциплине ${g.subject}`}
                />
              </div>
              <div className="grade-result">
                <strong>{g.status === "passed" ? g.grade : "—"}</strong>
                <span className={g.status === "passed" ? "positive" : "muted"}>
                  {g.status === "passed"
                    ? "Закрыто"
                    : g.status === "exam"
                      ? "К сессии"
                      : "В процессе"}
                </span>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="Здесь пока пусто" text="В этой категории пока нет дисциплин." />
        )}
      </section>
      <p className="supporting-note">
        Баллы показывают текущий прогресс, итоговые оценки — результат аттестации. В этом прототипе
        все оценки вымышлены.
      </p>
    </>
  );
}
