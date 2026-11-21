import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-message">
      <span className="eyebrow">Ошибка 404</span>
      <h1>Этой страницы нет</h1>
      <p>Проверь адрес или вернись в кабинет.</p>
      <Link className="button primary" href="/dashboard">
        Вернуться в кабинет
      </Link>
    </main>
  );
}
