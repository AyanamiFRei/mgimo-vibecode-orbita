import { Brand } from "./brand";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-story-body">
          <span className="login-kicker">ТВОЙ УНИВЕРСИТЕТ. ТВОЯ ОРБИТА.</span>
          <h1>
            <span>Больше жизни.</span>
            <span>Меньше</span>
            <em>формальностей.</em>
          </h1>
          <p>
            Расписание, оценки и деканат —<br />в одном пространстве, в твоём ритме.
          </p>
          <div className="login-pills">
            <span>
              <Check size={15} aria-hidden="true" />
              Без очередей
            </span>
            <span>
              <Check size={15} aria-hidden="true" />
              Всегда под рукой
            </span>
          </div>
        </div>
        <div className="login-orbit" aria-hidden="true">
          <div />
          <div />
          <span>✳</span>
        </div>
        <span className="login-university">
          УНИВЕРСИТЕТ НОВЫХ ГОРИЗОНТОВ
          <ArrowUpRight size={17} aria-hidden="true" />
        </span>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <span className="badge concept-badge">КОНКУРСНЫЙ ПРОТОТИП</span>
          <h2>{title}</h2>
          <p className="login-description">{description}</p>
          {children}
          <div className="login-disclaimer">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Это неофициальный концепт вымышленного университета. Все студенты, преподаватели и
              данные придуманы. Не вводи настоящие персональные данные.
            </p>
          </div>
        </div>
        <footer>Орбита © 2026 · Сделано с заботой о студентах</footer>
      </section>
    </main>
  );
}
