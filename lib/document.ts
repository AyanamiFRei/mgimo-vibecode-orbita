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
<style>body{font-family:Arial,sans-serif;color:#242138;margin:0;background:#f5f3f8;line-height:1.7}main{max-width:720px;margin:48px auto;padding:48px;background:white;border:1px solid #e7e2ef}.brand{font-weight:800;letter-spacing:.12em;color:#7658b1}.notice{padding:16px;border:2px solid #7658b1;color:#61448f;font-size:13px;margin:28px 0}h1{font-size:26px;line-height:1.3}dl{display:grid;grid-template-columns:170px 1fr;gap:10px}dt{color:#6c667a}dd{margin:0}.muted{color:#6c667a;font-size:13px}footer{margin-top:40px;border-top:1px solid #e7e2ef;padding-top:16px}@media(max-width:600px){main{padding:24px;margin:12px}dl{display:block}dd{margin-bottom:12px}}@media print{body{background:white}main{border:0;margin:0;max-width:none;padding:24px}.hint{display:none}}</style></head><body><main>
<div class="brand">ОРБИТА / ЦИФРОВОЙ ДЕКАНАТ</div><p>Университет новых горизонтов</p>
<div class="notice"><strong>ОБРАЗЕЦ · НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ ДОКУМЕНТОМ</strong><br>Конкурсный прототип. Университет, люди и учебные данные вымышлены. Документ не имеет юридической силы.</div>
<h1>${text(request.title)}</h1><p class="muted">№ ${text(request.number)} · ${text(new Date(request.updatedAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }))}</p>
<p>Демонстрационный документ сформирован по заявке студента:</p>
<dl><dt>ФИО</dt><dd>${text(student.name)}</dd><dt>Факультет</dt><dd>${text(student.faculty)}</dd><dt>Направление</dt><dd>${text(student.program)}</dd><dt>Курс / группа</dt><dd>${student.year} / ${text(student.group)}</dd><dt>Номер студента</dt><dd>${text(student.studentNumber)}</dd><dt>Назначение</dt><dd>${text(request.purpose)}</dd></dl>
${request.staffComment ? `<p>${text(request.staffComment)}</p>` : ""}
<footer><strong>Студенческий офис · Орбита</strong><p class="muted">Демонстрационная версия. Подпись и печать не требуются.</p><p class="hint muted">Чтобы сохранить PDF, выберите в браузере «Печать» → «Сохранить как PDF».</p></footer>
</main></body></html>`;
}
