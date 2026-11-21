"use client";
import { useCallback, useEffect, useState } from "react";
import type { StudentRequest, RequestStatus } from "@/lib/types";
import { apiMutation } from "./workspace-provider";
import { DateText, EmptyState, PageTitle, Status } from "./ui";
import { RefreshCw } from "lucide-react";
type QueueItem = StudentRequest & { student: { id: string; name: string; group: string } };
export function Staff() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/staff/requests", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || "Не удалось загрузить очередь");
    setItems(json.data);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/staff/requests", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error?.message || "Не удалось загрузить очередь");
        if (active) setItems(json.data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function update(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setPending(id);
    setError("");
    setNotice("");
    const form = new FormData(e.currentTarget);
    try {
      await apiMutation(
        `/api/requests/${encodeURIComponent(id)}`,
        { status: form.get("status") as RequestStatus, comment: form.get("comment") },
        "PATCH",
      );
      await load();
      setNotice("Статус обновлён. Студент получил уведомление.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setPending("");
    }
  }
  return (
    <>
      <PageTitle title="Очередь деканата">
        <button
          className="text-button"
          onClick={() => {
            setLoading(true);
            load()
              .catch((e) => setError(e.message))
              .finally(() => setLoading(false));
          }}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Обновить очередь
        </button>
      </PageTitle>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {!loading && (
        <div className="queue-summary">
          <span>
            Активные{" "}
            <strong>
              {items.filter((r) => r.status === "submitted" || r.status === "processing").length}
            </strong>
          </span>
          <span>
            Готовые <strong>{items.filter((r) => r.status === "ready").length}</strong>
          </span>
        </div>
      )}
      {loading ? (
        <p role="status">Загружаем очередь…</p>
      ) : items.length ? (
        <div className="staff-queue">
          {items.map((r) => (
            <article key={r.id} className="panel staff-request">
              <div className="section-head">
                <span className="staff-request-number">№ {r.number}</span>
                <Status status={r.status} />
              </div>
              <h2>{r.title}</h2>
              <p className="staff-student">
                {r.student.name} · {r.student.group}
              </p>
              <dl className="detail-list compact">
                <div>
                  <dt>Назначение</dt>
                  <dd>{r.purpose}</dd>
                </div>
                {r.comment && (
                  <div>
                    <dt>Комментарий</dt>
                    <dd>{r.comment}</dd>
                  </div>
                )}
                <div>
                  <dt>Срок</dt>
                  <dd>
                    <DateText value={r.dueAt} />
                  </dd>
                </div>
              </dl>
              {(r.status === "submitted" || r.status === "processing") && (
                <form className="staff-form" onSubmit={(e) => update(e, r.id)}>
                  <div className="staff-fields">
                    <div className="staff-field">
                      <label htmlFor={`status-${r.id}`}>Новый статус</label>
                      <select
                        id={`status-${r.id}`}
                        name="status"
                        defaultValue={r.status === "submitted" ? "processing" : "ready"}
                      >
                        {r.status === "submitted" ? (
                          <option value="processing">В работе</option>
                        ) : (
                          <option value="ready">Готова</option>
                        )}
                        <option value="rejected">Отклонена</option>
                      </select>
                    </div>
                    <div className="staff-field">
                      <label htmlFor={`comment-${r.id}`}>Ответ студенту</label>
                      <textarea
                        id={`comment-${r.id}`}
                        name="comment"
                        autoComplete="off"
                        rows={2}
                        maxLength={1500}
                        placeholder="При отказе укажи причину"
                      />
                    </div>
                  </div>
                  <button className="button primary" disabled={Boolean(pending)}>
                    {pending === r.id ? "Сохраняем…" : "Обновить статус"}
                  </button>
                </form>
              )}
              {r.staffComment && <p className="staff-comment">{r.staffComment}</p>}
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <EmptyState title="Заявок пока нет" text="Новые обращения студентов появятся здесь." />
        </section>
      )}
    </>
  );
}
