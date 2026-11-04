import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-message">
      <span className="eyebrow">404 · СТРАНИЦА НЕ НАЙДЕНА</span>
      <h1>Этой страницы нет</h1>
      <p>Возможно, ссылка устарела. Всё нужное есть в твоём кабинете.</p>
      <Link className="button primary" href="/dashboard">
        Вернуться в кабинет
      </Link>
    </main>
  );
}
