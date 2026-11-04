"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  X,
  ArrowLeft,
  Download,
  FileText,
  Clock3,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { apiMutation, useWorkspace } from "./workspace-provider";
import { DateText, EmptyState, PageTitle, requestTitles, Status, statusTitles } from "./ui";
import type { RequestType, StudentRequest } from "@/lib/types";

function RequestForm({ initialType }: { initialType: RequestType }) {
  const router = useRouter();
  const { addRequest, data } = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const draftKey = `orbita-draft:${data.user.id}:${initialType}`;
  useEffect(() => {
    dialog.current?.showModal();
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        for (const name of ["purpose", "comment"]) {
          const control = form.current?.elements.namedItem(name);
          if (
            (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) &&
            typeof draft[name] === "string"
          )
            control.value = draft[name];
        }
      }
    } catch {
      /* A draft is optional when browser storage is unavailable. */
    }
  }, [draftKey]);
  function saveDraft() {
    setDirty(true);
    if (!form.current) return;
    const values = new FormData(form.current);
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ purpose: values.get("purpose"), comment: values.get("comment") }),
      );
    } catch {
      /* Submission remains available without browser storage. */
    }
  }
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function close() {
    if (
      !pending &&
      (!dirty ||
        window.confirm("Закрыть форму? Черновик останется в этой вкладке до отправки заявки."))
    )
      router.push("/dashboard/documents");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const values = new FormData(e.currentTarget);
    try {
      const created = await apiMutation<StudentRequest>("/api/requests", {
        type: values.get("type"),
        purpose: values.get("purpose"),
        comment: values.get("comment"),
      });
      addRequest(created);
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}
      setDirty(false);
      router.replace("/dashboard/documents?sent=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить заявку");
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="request-dialog"
      aria-labelledby="request-form-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="dialog-heading">
        <span className="document-icon">
          <FileText size={23} aria-hidden="true" />
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Закрыть форму"
          onClick={close}
          disabled={pending}
        >
          <X size={22} />
        </button>
      </div>
      <h2 id="request-form-title">Создание заявки</h2>
      <p>Выбери документ и укажи, куда он нужен.</p>
      <form ref={form} className="request-form" onSubmit={submit} onChange={saveDraft}>
        <label htmlFor="request-type">Что тебе нужно?</label>
        <select id="request-type" name="type" defaultValue={initialType}>
          {Object.entries(requestTitles).map(([value, title]) => (
            <option value={value} key={value}>
              {title}
            </option>
          ))}
        </select>
        <label htmlFor="purpose">Куда нужна справка</label>
        <input
          id="purpose"
          name="purpose"
          required
          minLength={3}
          maxLength={200}
          autoComplete="off"
          placeholder="Например, по месту работы…"
        />
        <label htmlFor="comment">
          Комментарий <span className="muted">· необязательно</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={1500}
          autoComplete="off"
          placeholder="Уточни детали, если нужно…"
        />
        <p className="draft-note">
          Черновик сохраняется в этой вкладке. Можно вернуться к нему после перехода назад.
        </p>
        <div className="form-notice">
          <Clock3 size={17} aria-hidden="true" />
          <span>
            Обычно готово в течение 3 рабочих дней. В прототипе заявку обрабатывает тестовый
            сотрудник.
          </span>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" />
              Отправляем…
            </>
          ) : (
            <>
              Отправить заявку
              <ArrowRight size={17} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </dialog>
  );
}

export function Documents() {
  const { data } = useWorkspace();
  const params = useSearchParams();
  const filter = params.get("filter") || "all";
  const selected = data.requests.find((r) => r.id === params.get("id"));
  const filtered = data.requests.filter(
    (r) =>
      filter === "all" ||
      (filter === "active"
        ? r.status === "submitted" || r.status === "processing"
        : r.status === "ready"),
  );
  if (params.has("id"))
    return (
      <>
        <Link className="back-link" href="/dashboard/documents">
          <ArrowLeft size={17} aria-hidden="true" />
          Все документы
        </Link>
        {selected ? (
          <>
            <PageTitle
              eyebrow={`ЗАЯВКА № ${selected.number}`}
              title={selected.title}
              description={selected.purpose}
            >
              <Status status={selected.status} />
            </PageTitle>
            <div className="document-detail-grid">
              <section className="panel">
                <h2>Детали заявки</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Тип документа</dt>
                    <dd>{requestTitles[selected.type]}</dd>
                  </div>
                  <div>
                    <dt>Куда нужна справка</dt>
                    <dd>{selected.purpose}</dd>
                  </div>
                  <div>
                    <dt>Дата подачи</dt>
                    <dd>
                      <DateText value={selected.createdAt} />
                    </dd>
                  </div>
                  <div>
                    <dt>Плановая готовность</dt>
                    <dd>
                      <DateText value={selected.dueAt} />
                    </dd>
                  </div>
                  {selected.comment && (
                    <div>
                      <dt>Комментарий</dt>
                      <dd>{selected.comment}</dd>
                    </div>
                  )}
                  {selected.staffComment && (
                    <div>
                      <dt>Ответ деканата</dt>
                      <dd>{selected.staffComment}</dd>
                    </div>
                  )}
                </dl>
                {selected.status === "ready" && (
                  <a
                    className="button primary"
                    href={`/api/requests/${selected.id}/document`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={17} aria-hidden="true" />
                    Открыть образец справки
                  </a>
                )}
                <p className="supporting-note">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Документ доступен только владельцу заявки и сотруднику.
                </p>
              </section>
              <section className="panel">
                <h2>Путь заявки</h2>
                <ol className="timeline">
                  {selected.events.map((event) => (
                    <li key={event.id}>
                      <i />
                      <div>
                        <strong>{statusTitles[event.status]}</strong>
                        <p>{event.note}</p>
                        <small>
                          <DateText
                            value={event.createdAt}
                            options={{ hour: "2-digit", minute: "2-digit" }}
                          />
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        ) : (
          <EmptyState
            title="Заявка не найдена"
            text="Проверь ссылку или вернись к своим документам."
          />
        )}
      </>
    );
  return (
    <>
      <PageTitle
        eyebrow="СПРАВКИ И ЗАЯВЛЕНИЯ"
        title="Документы"
        description="Заказ документов, подача заявлений и отслеживание статуса."
      >
        <Link href="?new=1" className="button primary" role="button">
          <Plus size={18} aria-hidden="true" />
          Новая заявка
        </Link>
      </PageTitle>
      {params.has("sent") && (
        <div className="success-message" role="status">
          Заявка отправлена. Следи за её статусом здесь — сообщим, когда всё будет готово.
        </div>
      )}
      <div className="document-types">
        {(Object.entries(requestTitles) as [RequestType, string][]).map(([type, title]) => (
          <Link key={type} href={`?new=1&type=${type}`} className="document-type-card">
            <FileText size={22} aria-hidden="true" />
            <strong>{title}</strong>
            <span>
              Оформить онлайн
              <ArrowUpRightIcon />
            </span>
          </Link>
        ))}
      </div>
      <div className="filter-row">
        <h2>
          Твои заявки <span className="count-bubble">{data.requests.length}</span>
        </h2>
        <div className="segmented">
          {[
            { id: "all", name: "Все" },
            { id: "active", name: "В работе" },
            { id: "ready", name: "Готовые" },
          ].map((f) => (
            <Link key={f.id} className={filter === f.id ? "selected" : ""} href={`?filter=${f.id}`}>
              {f.name}
            </Link>
          ))}
        </div>
      </div>
      <section className="panel requests-list">
        {filtered.length ? (
          filtered.map((r) => (
            <Link key={r.id} href={`?id=${encodeURIComponent(r.id)}`} className="request-list-row">
              <span className={`document-icon ${r.status === "ready" ? "document-ready" : ""}`}>
                <FileText size={21} aria-hidden="true" />
              </span>
              <span className="request-list-copy">
                <strong>{r.title}</strong>
                <small>{r.purpose}</small>
                <small>
                  № {r.number} · <DateText value={r.createdAt} />
                </small>
              </span>
              <Status status={r.status} />
              <ArrowRight className="request-arrow" size={18} aria-hidden="true" />
            </Link>
          ))
        ) : (
          <EmptyState
            title="Пока нет заявок"
            text="Нажми «Новая заявка», чтобы заказать справку или обратиться в деканат."
          />
        )}
      </section>
      {params.has("new") && (
        <RequestForm
          initialType={
            Object.hasOwn(requestTitles, params.get("type") || "")
              ? (params.get("type") as RequestType)
              : "study"
          }
        />
      )}
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} className="diagonal-arrow" aria-hidden="true" />;
}
