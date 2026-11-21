import type { PrintableDocument } from "@/lib/types";

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

export function renderDocument({ request, student }: PrintableDocument): string {
  const text = escapeHtml;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${text(request.title)} · ${text(request.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f5f1; color: #263b33; font: 16px/1.55 Arial, sans-serif; }
  main { max-width: 760px; margin: 40px auto; padding: 40px 48px; background: white; border: 1px solid #d8dfd7; overflow-wrap: anywhere; }
  header { padding-bottom: 20px; border-bottom: 2px solid #29503e; }
  header p { margin: 4px 0 0; }
  .brand { color: #29503e; font-size: 18px; font-weight: 600; }
  .notice { margin: 24px 0; padding: 12px 16px; border-left: 3px solid #496b3c; background: #eff2e8; font-size: 14px; }
  h1 { margin: 0; font-size: 28px; line-height: 1.25; }
  dt, .muted { color: #4f6054; }
  .muted { margin-top: 4px; font-size: 14px; }
  dl { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 8px 24px; margin: 20px 0; }
  dd { margin: 0; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d8dfd7; }
  @media screen and (max-width: 600px) {
    main { margin: 8px; padding: 24px 20px; }
    dl { display: block; }
    dd { margin-bottom: 12px; }
  }
  @page { margin: 18mm; }
  @media print {
    body { color: #111; background: white; font-size: 11pt; }
    main { max-width: none; margin: 0; padding: 0; border: 0; }
    header, footer { border-color: #555; }
    .brand, dt, .muted { color: inherit; }
    .notice { border: 1pt solid #333; background: white; break-inside: avoid; }
    .hint { display: none; }
  }
</style></head><body><main>
<header><div class="brand">Орбита / Цифровой деканат</div><p>Университет новых горизонтов</p></header>
<div class="notice"><strong>ОБРАЗЕЦ · НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ ДОКУМЕНТОМ</strong><br>Конкурсный прототип. Университет, люди и учебные данные вымышлены. Документ не имеет юридической силы.</div>
<h1>${text(request.title)}</h1><p class="muted">№ ${text(request.number)} · ${text(new Date(request.updatedAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }))}</p>
<p>Демонстрационный документ сформирован по заявке студента:</p>
<dl><dt>ФИО</dt><dd>${text(student.name)}</dd><dt>Факультет</dt><dd>${text(student.faculty)}</dd><dt>Направление</dt><dd>${text(student.program)}</dd><dt>Курс / группа</dt><dd>${text(String(student.year))} / ${text(student.group)}</dd><dt>Номер студента</dt><dd>${text(student.studentNumber)}</dd><dt>Назначение</dt><dd>${text(request.purpose)}</dd></dl>
${request.staffComment ? `<p>${text(request.staffComment)}</p>` : ""}
<footer><strong>Студенческий офис · Орбита</strong><p class="muted">Демонстрационная версия. Подпись и печать не требуются.</p><p class="hint muted">Чтобы сохранить PDF, выберите в браузере «Печать» → «Сохранить как PDF».</p></footer>
</main></body></html>`;
}
