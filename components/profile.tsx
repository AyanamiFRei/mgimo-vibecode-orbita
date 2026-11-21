"use client";
import { Camera, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { UserAvatar } from "./user-avatar";
import { PageTitle } from "./ui";

function PhotoControls() {
  const {
    data: { user },
    setAvatarUrl,
  } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function updatePhoto(file: File | null) {
    setStatus("");
    setError("");
    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Выберите изображение JPEG, PNG или WebP.");
      return;
    }
    if (file && (!file.size || file.size > 3 * 1024 * 1024)) {
      setError("Выберите непустой файл размером до 3 МБ.");
      return;
    }
    const form = new FormData();
    if (file) form.set("photo", file);
    setPending(true);
    setStatus(file ? "Загружаем фото…" : "Удаляем фото…");
    try {
      const response = await fetch("/api/profile/avatar", {
        method: file ? "PUT" : "DELETE",
        body: file ? form : undefined,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message || "Не удалось изменить фото. Попробуйте ещё раз.");
        setStatus("");
        return;
      }
      setAvatarUrl(result.data.avatarUrl);
      setStatus(file ? "Фото сохранено." : "Фото удалено.");
    } catch {
      setStatus("");
      setError("Не удалось получить ответ сервера. Обновите страницу и проверьте фото.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="profile-photo-controls">
      <div className="profile-photo-actions">
        <input
          ref={input}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Выбрать фото"
          disabled={pending}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void updatePhoto(file);
          }}
        />
        <button
          type="button"
          className="button primary small"
          aria-describedby="profile-photo-help"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          <Camera size={16} aria-hidden="true" />
          {user.avatarUrl ? "Изменить фото" : "Загрузить фото"}
        </button>
        {user.avatarUrl && (
          <button
            type="button"
            className="text-button"
            disabled={pending}
            onClick={() => void updatePhoto(null)}
          >
            Удалить фото
          </button>
        )}
      </div>
      <small id="profile-photo-help">
        JPEG, PNG или WebP до 3 МБ. Для демопрофиля подойдёт иллюстрация.
      </small>
      <div role="status">{status}</div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Profile() {
  const {
    data: { user },
  } = useWorkspace();
  return (
    <>
      <PageTitle title="Профиль" />
      <div className="profile-grid">
        <section className="panel profile-card">
          <UserAvatar user={user} large />
          <h2>{user.name}</h2>
          <span className="profile-role">
            {user.role === "student" ? "Студент" : "Сотрудник деканата"}
          </span>
          <p>{user.faculty}</p>
          <span className="supporting-note">Вымышленный тестовый профиль</span>
          <PhotoControls />
        </section>
        <section className="panel">
          <h2>Основные сведения</h2>
          <dl className="detail-list">
            {[
              { label: "ФИО", value: user.name },
              { label: "Факультет", value: user.faculty },
              { label: "Направление", value: user.program },
              { label: "Курс", value: String(user.year) },
              { label: "Группа", value: user.group },
              { label: "Номер студенческого", value: user.studentNumber },
              { label: "Электронная почта", value: user.email },
              { label: "Логин", value: user.login },
            ].map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <div className="info-strip">
        <ShieldCheck size={19} aria-hidden="true" />
        <span>
          Профиль виден только после входа. В демоверсии учебные сведения можно только
          просматривать.
        </span>
      </div>
    </>
  );
}
