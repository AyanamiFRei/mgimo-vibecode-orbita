"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { apiMutation } from "./workspace-provider";

export function RegistrationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || created) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password"));
    const repeat = form.elements.namedItem("repeat") as HTMLInputElement;
    if (password !== values.get("repeat")) {
      repeat.setCustomValidity("Пароли не совпадают. Повтори пароль.");
      repeat.reportValidity();
      repeat.focus();
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError(
        "Пароль должен занимать не более 72 байт. Для кириллицы и эмодзи выбери более короткий пароль.",
      );
      return;
    }
    setPending(true);
    setError("");
    let registeredLogin = "";
    try {
      const registered = await apiMutation<{ login: string }>("/api/auth/register", {
        login: values.get("login"),
        password,
        program: values.get("program"),
        persona: values.get("persona"),
      });
      registeredLogin = registered.login;
      setCreated(registered.login);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось создать аккаунт. Попробуй ещё раз.",
      );
      setPending(false);
      return;
    }
    try {
      const result = await signIn("credentials", {
        login: registeredLogin,
        password,
        redirect: false,
      });
      if (result?.ok && !result.error) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
    } catch {
      /* Account already exists: offer normal login without repeating registration. */
    }
    setPending(false);
  }
  if (created && !pending)
    return (
      <div className="registered-state" role="status">
        <ShieldCheck size={30} aria-hidden="true" />
        <h3>Аккаунт создан</h3>
        <p>
          Логин: <strong>{created}</strong>. Автоматический вход не завершился — войди с созданным
          паролем.
        </p>
        <Link className="button primary" href="/login">
          Перейти ко входу
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    );
  return (
    <>
      <form className="login-form registration-form" onSubmit={submit}>
        <label htmlFor="register-login">Логин</label>
        <input
          id="register-login"
          name="login"
          autoComplete="username"
          spellCheck={false}
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z][a-zA-Z0-9_\-]*"
          placeholder="Например, orbit_student…"
          aria-describedby="register-login-hint"
        />
        <small id="register-login-hint" className="field-hint">
          3–32 символа, начни с латинской буквы. Далее — латиница, цифры, дефис или подчёркивание.
        </small>
        <label htmlFor="register-password">Пароль</label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          onInput={(e) => {
            const repeat = e.currentTarget.form?.elements.namedItem("repeat");
            if (repeat instanceof HTMLInputElement) repeat.setCustomValidity("");
          }}
          placeholder="Придумай отдельный демопароль…"
          aria-describedby="register-password-hint"
        />
        <small id="register-password-hint" className="field-hint">
          От 12 символов. Не используй пароль от настоящих сервисов.
        </small>
        <label htmlFor="register-repeat">Повтори пароль</label>
        <input
          id="register-repeat"
          name="repeat"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
          placeholder="Ещё раз тот же пароль…"
        />
        <label htmlFor="register-program">Учебное направление</label>
        <select id="register-program" name="program" defaultValue="business-informatics">
          <option value="business-informatics">Бизнес-информатика</option>
          <option value="international-relations">Международные отношения</option>
        </select>
        <label htmlFor="register-persona">Вымышленный персонаж</label>
        <select id="register-persona" name="persona" defaultValue="nika">
          <option value="nika">Ника — вымышленная студентка</option>
          <option value="lev">Лев — вымышленный студент</option>
          <option value="alisa">Алиса — вымышленная студентка</option>
          <option value="mark">Марк — вымышленный студент</option>
        </select>
        <label className="checkbox-label">
          <input type="checkbox" name="fictional" required />
          Использую только вымышленные данные
        </label>
        <p className="field-hint">
          Профиль и учебные данные будут созданы автоматически. Почта и подтверждение не нужны.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary login-submit" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" />
              Создаём кабинет…
            </>
          ) : (
            <>
              Создать аккаунт
              <ArrowRight size={17} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        Уже есть аккаунт? <Link href="/login">Войти в кабинет</Link>
      </p>
    </>
  );
}
