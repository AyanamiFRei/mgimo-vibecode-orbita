export default function Loading() {
  return (
    <section className="dashboard-loading" role="status">
      <p>Загружаем раздел…</p>
      <div className="panel dashboard-loading-rows" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
