import { Brand } from "./brand";
import { Asterisk, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

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
        <Brand light caption={false} />
        <div className="login-story-body">
          <h1>
            <span>Больше жизни.</span>{" "}
            <span>
              Меньше <em>формальностей.</em>
            </span>
          </h1>
        </div>
        <div className="login-orbit" aria-hidden="true">
          <div />
          <div />
          <span>
            <Asterisk size="1em" strokeWidth={1.5} />
          </span>
        </div>
      </section>
      <section className="login-panel">
        <div className="auth-tools">
          <ThemeToggle />
        </div>
        <div className="login-form-wrap">
          <span className="badge concept-badge">Конкурсный прототип</span>
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
        <footer>Орбита © 2026 · Студенческий кабинет</footer>
      </section>
    </main>
  );
}
