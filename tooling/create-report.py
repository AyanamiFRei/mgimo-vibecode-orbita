"""Recreate the contest process PDF from real Playwright screenshots."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/orbita-process.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Body", str(FONT / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Bold", str(FONT / "arialbd.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold")
GREEN, INK, MUTED, LINE = map(HexColor, ["#285340", "#263b33", "#66735f", "#e1e8d9"])
W, H = 595.28, 841.89
c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle("Орбита - процесс создания конкурсного прототипа")
c.setAuthor("Команда прототипа Орбита / Codex")
page = 0
y = 0

def clean(text):
    return text.replace("—", "-").replace("–", "-").replace("‑", "-")

def para(text, size=10.5, color=INK, space=11, bold=False):
    global y
    style = ParagraphStyle("p", fontName="Bold" if bold else "Body", fontSize=size,
                           leading=size * 1.48, textColor=color)
    p = Paragraph(clean(text), style)
    _, height = p.wrap(W - 76, 750)
    if y - height < 55:
        raise ValueError(f"Page {page} text overflow: {text[:50]}")
    p.drawOn(c, 38, y - height)
    y -= height + space

def heading(text):
    para(text, size=14, bold=True, space=13)

def start(label, title):
    global page, y
    if page:
        c.showPage()
    page += 1
    c.setFillColor(HexColor("#f7f8f3")); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GREEN); c.roundRect(38, H-55, 22, 22, 7, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#d9edb8")); c.circle(49, H-44, 6, stroke=1, fill=0)
    c.ellipse(41, H-48, 57, H-40, stroke=1, fill=0)
    c.setFont("Bold", 12); c.setFillColor(GREEN); c.drawString(68, H-48, "ОРБИТА")
    c.setFont("Body", 8); c.setFillColor(MUTED); c.drawRightString(W-38, H-46, clean(label))
    c.setStrokeColor(LINE); c.line(38, 45, W-38, 45)
    c.setFont("Body", 8); c.setFillColor(MUTED)
    c.drawString(38, 29, "Конкурсный концепт · Все данные вымышлены · 04.11.2026")
    c.drawRightString(W-38, 29, f"{page} / 9")
    y = H - 96
    para(title, 25, space=23, bold=True)

def screenshot(name, caption, maxheight=270):
    global y
    file = ROOT / "docs/screenshots" / name
    reader = ImageReader(str(file))
    iw, ih = reader.getSize()
    width = min(W-76, maxheight * iw / ih)
    height = width * ih / iw
    if y-height-25 < 55:
        raise ValueError(f"Page {page} image overflow: {name}")
    x = (W-width)/2
    c.setFillColor(white); c.roundRect(x-3, y-height-3, width+6, height+6, 7, fill=1, stroke=0)
    c.drawImage(reader, x, y-height, width, height, mask="auto")
    y -= height + 12
    para(escape(caption), 8, MUTED, space=16)

start("ИДЕЯ И ЗАДАЧА", "Учёба в твоём ритме.")
para("Рабочий прототип цифрового деканата вымышленного <b>Университета новых горизонтов</b>. Неофициальный конкурсный проект; все имена, оценки и документы придуманы.", 12, space=19)
heading("Один кабинет вместо разрозненных систем")
para("Из конкурсного ТЗ: студент ищет расписание на сайте, оценки в другой системе, объявления в чатах, справки через очередь. Мы собрали пять обязательных сценариев и вывели ближайший шаг на главную. Интервью со студентами не проводились - это гипотеза из задания.")
para("<b>Ядро:</b> вход и профиль; день и неделя расписания; оценки и зачёты; онлайн-заявки со статусом; новости и персональные уведомления. Дополнение - очередь сотрудника, история обработки, поиск и демонстрационный документ.")
screenshot("login-desktop.png", "Реальный экран входа. Три открытых тестовых аккаунта и явное указание на концепт.", 245)
para("Дизайн: спокойный зелёный, светлый фон, собственный SVG-знак и композиция орбит. Официальные логотипы, сторонние фотографии и web-шрифты не использовались.", 10, MUTED)

start("АРХИТЕКТУРА И БЕЗОПАСНОСТЬ", "Понятно снаружи. Надёжно внутри.")
para("Стек: <b>Next.js App Router + React + TypeScript + NextAuth + libSQL/SQLite</b>. Один Node.js проект: локальный файл на VPS или внешняя libSQL БД для Vercel. Миграция и вымышленные данные создаются явной командой, не при каждом запросе.")
heading("Как проходит запрос")
para("Браузер → защищённая cookie NextAuth → серверная сессия → актуальная роль из БД → CampusService → параметризованный SQL. Клиент получает безопасные DTO, без хешей паролей и ключей.", 12, GREEN, space=19)
heading("Почему студент не видит чужие данные")
para("Сервер берёт владельца из проверенной сессии, а не из формы. В выборке есть user_id. Чужая и отсутствующая заявка отвечают одинаковым 404. Студент не может читать очередь деканата или менять статус. Роль и блокировка перепроверяются по БД.")
para("<b>Пароли:</b> bcrypt, 12 раундов. <b>Сессия:</b> HttpOnly cookie, JWT до 8 часов. <b>Секреты:</b> только серверное окружение, не исходники и не браузер. Демопароль публичен намеренно и не является инфраструктурным секретом.")
para("<b>Мутации:</b> проверка канонического Origin, размер JSON, Zod и лимиты в постоянной БД. <b>Персональные ответы:</b> private/no-store. <b>Документ:</b> проверка владельца/сотрудника, экранирование текста, пометка «ОБРАЗЕЦ».")
heading("Настоящий путь заявки")
para("Отправлена → В работе → Готова. Возможен отказ с объяснением. Статус, история и уведомление сохраняются одной транзакцией. Повтор статуса не дублирует событие. Для локального SQLite общая очередь записей предотвращает конфликт параллельных транзакций.")
para("Это демонстрация: нет интеграции с настоящим вузом, электронной подписи или официальных справок. Расписание и оценки вымышлены.", 10, MUTED)

start("ИИ-ИНСТРУМЕНТЫ И ПРОЦЕСС", "Код написан агентами.")
para("Пользователь предоставил ТЗ, выбрал вымышленный вуз, подготовку инструкций хостинга и потребовал <b>Astra с xhigh effort</b> для архитектуры и важного кода. Ручной код и интервью не выполнялись.")
heading("Кто что делал")
para("<b>Codex Desktop / основной агент:</b> интеграция, React/CSS/SVG, браузерные проверки, инструкции и этот отчёт. <b>ECC Architect:</b> предварительный план до уточнения модели. <b>GPT-6 Astra xhigh / ECC Architect:</b> архитектура, модель данных, контракты и проверки. Роль read-only, поэтому реализация передана отдельному worker.")
para("<b>GPT-6 Astra xhigh / worker:</b> NextAuth, libSQL, бизнес-правила, API, seed и серверные тесты. <b>ECC Code Reviewer:</b> независимое ревью и повторная проверка исправлений. Агентам назначены отдельные файловые зоны; чужие изменения сохранялись.")
heading("Навыки и инструменты")
para("ECC: backend-patterns, frontend-patterns, coding-standards, security-review, tdd-workflow, verification-loop. Codex Hyper: схема контрактов и независимой проверки; делегирование записи Astra выполнено по запросу пользователя. web-design-guidelines: актуальные правила Vercel для доступности и форм.")
para("npm, TypeScript, ESLint и Prettier; Vitest/V8; Playwright/Chromium; официальная документация Next.js, NextAuth, libSQL; Python/reportlab и Poppler для PDF. Библиотеки: React, Next.js, NextAuth, libSQL, bcryptjs, Zod, Lucide. AI API внутри приложения нет; Figma и генераторы изображений не использовались.")
heading("Порядок работы")
para("ТЗ и уточнения → архитектурные контракты → тесты RED → сервер и UI → GREEN → независимое ревью → исправления → браузерная production-проверка → материалы для жюри. Полная детализация этапов и ключевые постановки сохранены в docs/process.md и docs/prompts.md.")

start("ПРОМПТЫ И ИСПРАВЛЕНИЯ", "Проверять результат - часть работы.")
heading("Ключевые реальные постановки")
para("Пользователь: «для плана архитектуры и написания важного кода используй astra на xhigh effort». Архитектору: «Need tenant ownership server-side, password hashes, durable notifications/requests, deployment Vercel or Docker».", 10)
para("Astra worker: «You OWN only lib/**, scripts/**, tests/**, app/api/** … Write meaningful tests FIRST run red then implement green». Reviewer: «Read-only required code review … responsive 360, accessible keyboard focus, no real data … exact file:line reproducible findings».", 10)
heading("Какие ошибки нашли и исправили")
para("<b>Функции:</b> сервер выдавал только текущую неделю; ссылки уведомлений не содержали /dashboard; средний балл не учитывал текстовый формат оценок; все карточки документов открывали один тип. Исправлены диапазон, адреса, итоговые оценки и URL типа.")
para("<b>Надёжность:</b> успешная заявка зависела от следующего refresh, что могло провоцировать повторную отправку. Ответ POST теперь обновляет локальные данные сразу. Конкурентный тест выявил TRANSACTION_ACTIVE - добавлена очередь записей и регрессия.")
para("<b>Доступность:</b> невидимое мобильное меню попадало в Tab; мелкий текст был бледным. Добавлены inert, ловушка фокуса, Escape, возврат фокуса, усиленный контраст и reduced motion. Черновик сохраняется при переходе назад.")
heading("Доказательства и пределы")
para("<b>54/54</b> серверных теста; <b>96,74%</b> строк и <b>92,42%</b> ветвей в lib/API. <b>19/19</b> E2E: desktop, 360×800 и WebKit iPhone SE, реальные cookie и БД. Сборка, типы, lint - PASS. Production npm audit - 0. Dev-аудит отмечает 16 moderate-связей minimatch/ESLint; несовместимый downgrade не применялся.")
para("Скриншоты ниже - реальные захваты Playwright рабочей реализации. Ранние Figma-макеты не существовали и не имитируются; неудачные варианты описаны по журналу проверок.", 10, MUTED)

start("РАБОЧИЙ ИНТЕРФЕЙС · DESKTOP", "Всё нужное - на одной орбите.")
screenshot("dashboard-desktop-viewport.png", "Главная: пары, средний балл, документы и ближайшие задачи.", 260)
screenshot("schedule-desktop.png", "Расписание: дни недели, занятия, преподаватели и выделенный перенос аудитории.", 260)

start("МОБИЛЬНЫЕ СЦЕНАРИИ", "360 пикселей. Те же возможности.")
para("Проверены вход, расписание, оценки, отправка заявки, чтение уведомлений и очередь сотрудника. Горизонтального переполнения в проверенных сценариях нет; меню управляется клавиатурой.", 11, space=19)
top = y
for filename, x, caption in [
    ("dashboard-mobile-viewport.png", 55, "Главная, экран 360 px"),
    ("request-form-mobile.png", 318, "Онлайн-заявка и черновик"),
]:
    reader = ImageReader(str(ROOT / "docs/screenshots" / filename))
    iw, ih = reader.getSize(); width = 210; height = width * ih / iw
    c.setFillColor(white); c.roundRect(x-4, top-height-4, width+8, height+8, 12, fill=1, stroke=0)
    c.drawImage(reader, x, top-height, width, height, mask="auto")
    c.setFillColor(MUTED); c.setFont("Body", 9); c.drawString(x, top-height-22, caption)
y = top - 210*800/360 - 45
para("Успешная отправка сохраняется в БД. Сотрудник обновляет статус в отдельной сессии; студент видит уведомление и историю. Чужая заявка и её документ недоступны второму студенту.", 10, MUTED)

start("ЗАПУСК И ПЕРЕДАЧА ЖЮРИ", "Готово к локальной демонстрации.")
heading("Тестовые аккаунты")
para("<b>student1</b> - Алиса Миронова, БИ-23-01.<br/><b>student2</b> - Марк Северин, МО-24-02.<br/><b>dean</b> - София Берегова, сотрудник деканата.<br/>Общий открытый демопароль: <b>OrbitDemo2026!</b>", 12, space=23)
heading("Два пути публикации")
para("<b>Vercel:</b> репозиторий + удалённый libSQL/Turso, подготовка БД отдельной командой, серверные DATABASE_URL/DATABASE_AUTH_TOKEN/NEXTAUTH_SECRET/NEXTAUTH_URL. Файловая SQLite на Vercel запрещена.")
para("<b>VPS:</b> Docker Compose + постоянный volume SQLite + HTTPS reverse proxy. Можно запустить обычный Node.js standalone. Инструкция, Dockerfile и compose.yaml включены в исходники.")
heading("Что ещё делает владелец")
para("Аккаунтов хостинга сейчас нет; подготовлены инструкции. Публичный сайт не опубликован. Репозиторий: <b>github.com/AyanamiFRei/mgimo-vibecode-orbita</b>. Нужно подключить хостинг, настроить секреты, проверить доступность из России без VPN и обеспечить работу до <b>28 ноября 2026 года</b>.")
para("Docker daemon локально не работал: контейнерная сборка не считается проверенной. Production standalone Node.js проверен E2E. Публичная сеть, удалённый Turso и Vercel не проверялись.", 10, MUTED)
heading("Что входит в передачу")
para("Исходный код, lockfile и шаблон CI; README; архитектура и безопасность; инструкции Vercel/VPS; процесс и промпты; этот PDF и скриншоты; сценарий видео на 4-5 минут. Видео и отправка конкурсной работы в этом сеансе не выполнялись.")
para("Лицензии: код MIT; разрешительные лицензии npm-библиотек зафиксированы в THIRD_PARTY_NOTICES.md и docs/dependency-licenses.json. Официальные логотипы и реальные персональные данные не использованы.", 10, MUTED)
start("ВТОРАЯ ИТЕРАЦИЯ · НОВЫЕ СЦЕНАРИИ", "Свой аккаунт. Живое общение.")
heading("Уточнение регистрации")
para("Пользователь сначала предложил реальную почту, затем изменил пункт: «добавь тогда регистрацию без подтверждения, с вымышленными данными». Поэтому SMTP и реальные персональные поля не добавлены. Можно выбрать персонажа и направление, придумать отдельные логин и пароль. Роль, ФИО, номер и учебные записи назначает сервер; чужие заявки не копируются.")
heading("Исправление iPhone SE")
para("Скриншот показал склеивание слов из-за скрытого br. Новый тест сначала воспроизвёл переполнение (RED), затем проверил блоки заголовка при 320/375 px и шрифте 150%. Отдельный прогон WebKit с профилем iPhone SE прошёл. Это эмуляция движка и экрана, а не заявление о тесте на физическом устройстве.")
heading("Преподаватели и обращения")
para("Добавлен каталог шести вымышленных преподавателей, дисциплины, кабинеты и часы консультаций. Студент создаёт личное обращение. Сотрудник отвечает от своего имени, а не выдаёт себя за реального преподавателя. Системное уведомление помечено демо; письма внешним людям не отправляются.")
para("Переписка сохраняется, чужой студент получает 404. Ответ, счётчик непрочитанности и уведомление атомарны. Эти сценарии пройдены через интерфейс на desktop и мобильном экране. Каталог ограничен, диалог отображает последние 100 сообщений.")
heading("Кто реализовал расширение")
para("Архитектор Astra xhigh уточнил контракты; Astra xhigh worker написал регистрацию, календарь и диалоги с тестами. Основной агент добавил UI и E2E. ECC reviewer нашёл и помог исправить валидацию паролей, login pattern, устаревший список диалогов и скрытую подпись учебной субботы.")

start("КАЛЕНДАРЬ И ПУБЛИКАЦИЯ", "Два семестра. Проверяемые правила.")
para("Осень: <b>01.09.2026-31.01.2027</b>, сессия 11-30 января. Весна: <b>01.02.2027-30.06.2027</b>, сессия 7-30 июня. Границы семестров, каникулы и сами занятия - политика вымышленного вуза. Интерфейс загружает выбранную неделю, а не весь учебный год.")
heading("Что учтено в календаре")
para("Государственные праздники и переносы выходных. В частности, 20 февраля 2027 - учебная суббота по плану понедельника, 22 февраля - выходной. Нет пар 4 ноября/31 декабря 2026, в новогодние праздники, 23 февраля, 8 марта, 1/9 мая, 12 июня и в перенесённые 3/10 мая, 14 июня 2027.")
para("Источники: постановление Правительства РФ от 24.09.2025 №1466 (официальный PDF); постановление от 17.09.2026 №1187 (текст акта в правовой базе, официальный адрес не загрузился); статья 112 ТК РФ; календарь 2027 для пятидневной недели. Полные ссылки и границы политики - docs/calendar.md.", 10, MUTED)
heading("Публичный GitHub")
para("Пользователь разрешил публичную публикацию и задал имя <b>mgimo-vibecode-orbita</b>. GitHub CLI уже был авторизован как AyanamiFRei. Репозиторий создаёт агент; перед отправкой проверяет staged-файлы. Секреты .env, рабочие SQLite, зависимости и временные результаты исключены. Для Git используется noreply-адрес.")
para("Исходники: <b>https://github.com/AyanamiFRei/mgimo-vibecode-orbita</b>. OAuth-токен не имеет workflow scope, поэтому CI сохранён шаблоном в tooling/github-actions, без активации. Публикация исходников не означает публикацию приложения: Vercel/VPS и проверка доступности остаются отдельным шагом владельца.")
para("Итог расширения: 54 серверных и 19 браузерных проверок, включая WebKit. Отчёт актуализирован по результатам этой итерации. Непроверенные внешние среды и известный dev-аудит сохранены в docs/verification.md.", 11, GREEN)
c.save()
print(OUT)
