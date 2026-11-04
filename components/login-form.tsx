"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [login, setLogin] = useState("");
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        login: form.get("login"),
        password: form.get("password"),
        redirect: false,
      });
      if (result?.error || !result?.ok) {
        setError("Не удалось войти. Проверь логин и пароль или попробуй чуть позже.");
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Нет связи с сервером. Проверь подключение и попробуй ещё раз.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form className="login-form" onSubmit={submit}>
        <label htmlFor="login">Логин</label>
        <input
          id="login"
          name="login"
          autoComplete="username"
          spellCheck={false}
          required
          maxLength={80}
          placeholder="Например, student1…"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          aria-describedby={error ? "login-error" : undefined}
        />
        <label htmlFor="password">Пароль</label>
        <div className="password-field">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={128}
            placeholder="Введи пароль…"
          />
          <button
            className="icon-button"
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          >
            {show ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        {error && (
          <p id="login-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary login-submit" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" />
              Входим…
            </>
          ) : (
            <>
              Войти в кабинет
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        Новый аккаунт: <Link href="/register">Создать аккаунт</Link>
      </p>
      <details className="demo-accounts" open>
        <summary>Тестовые аккаунты для знакомства</summary>
        <p>Выбери логин и введи общий демопароль:</p>
        <div className="demo-logins">
          {[
            { login: "student1", label: "Студент 1" },
            { login: "student2", label: "Студент 2" },
            { login: "dean", label: "Деканат" },
          ].map((a) => (
            <button
              key={a.login}
              type="button"
              onClick={() => {
                setLogin(a.login);
                document.getElementById("password")?.focus();
              }}
            >
              <strong>{a.label}</strong>
              <span>{a.login}</span>
            </button>
          ))}
        </div>
        <p className="demo-password">
          Пароль: <code>OrbitDemo2026!</code>
        </p>
      </details>
    </>
  );
}
