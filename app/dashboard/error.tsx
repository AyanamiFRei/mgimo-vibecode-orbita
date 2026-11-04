"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <h1>Кабинет пока недоступен</h1>
      <p>Проверьте подключение и попробуйте загрузить страницу ещё раз.</p>
      <button className="button primary" onClick={reset}>
        Попробовать ещё раз
      </button>
    </div>
  );
}
