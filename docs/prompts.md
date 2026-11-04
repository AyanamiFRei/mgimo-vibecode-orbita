# Ключевые постановки задач AI-агентам

Ниже сохранены существенные фрагменты фактических запросов этой сессии. Многоточие обозначает сокращение, а не пропущенный пользовательский ответ. Полный диалог остаётся в чате Codex; вымышленные интервью или внешние диалоги не добавлены.

## 1. Пользователь → основной агент

> Используя агентов и скиллы из пака ECC для планирования архитектуры и разработки все системы, а так же $web-design-guidelines для более корректного дизайна выполни данное тз. Стек выбери самостоятельно, желательно построить все так, чтобы было возможно использовать serverless системы на nextjs типа vercel и nextauth … сохрани возможность загрузить на нормальный хостинг.

Полное ТЗ требовало профиль, расписание, оценки, заявки, уведомления; два тестовых студента; защиту чужих данных; мобильный экран от 360 px; только вымышленные данные; пометку неофициального концепта; процесс создания с промптами и скриншотами.

## 2. Уточнения пользователя

> Сделать вымышленный университет.

> Пока нет, подготовить инструкции.

> для плана архитектуры и написания важного кода используй astra на xhigh effort

## 3. Основной агент → ECC Architect

> Read-only architecture/planning task. Empty project … Propose concise executable architecture Next.js App Router + TypeScript + NextAuth credentials + @libsql/client (local SQLite, remote Turso for serverless), student dashboard five core sections, two fictional student accounts, optional staff for actual request lifecycle. Need tenant ownership server-side, password hashes, durable notifications/requests, deployment Vercel or Docker. Identify failure modes and acceptance tests … Root sole writer.

Этот предварительный шаг начался до требования Astra. После уточнения архитектура перепроверена Astra xhigh.

## 4. Основной агент → Astra xhigh / ECC Architect

> You own architecture and IMPORTANT SERVER CODE implementation … Fictional university 'Университет новых горизонтов', app 'Орбита'. Next.js App Router TS, next-auth v4 Credentials/JWT, @libsql/client … Need tests first meaningful security/service integration. Design contracts QUICKLY send to root … Critical: server-side owner checks, current role DB reload, hashed passwords, durable DB rate limit, origin validation mutations, validation, request status transactional event+notification, no secrets exposed.

Ответ роли: ограничение read-only запрещает ей запись. После этого код передан Astra xhigh worker; Architect оставлен для контрактов и проверки проектных решений.

## 5. Основной агент → Astra xhigh / worker

> Implement IMPORTANT SERVER CODE … You OWN only lib/**, scripts/**, tests/**, app/api/**, types/**, vitest.config.ts. Not alone, root writing UI/config; don't revert others … Use Node runtime, parameterized SQL, server ownership, role reload, origin guard, durable DB login+API rate limiting, transactions for status+notification events, safe responses no hashes … Write meaningful tests FIRST run red then implement green.

Конкретные контракты: Workspace с текущим user, classes, grades, requests, notifications, deadlines; POST заявки принимает type/purpose/comment; статус меняет только staff; GET чужой заявки возвращает 404; POST прочитанности меняет только свои уведомления.

## 6. Основной агент → ECC Code Reviewer

> Read-only required code review … use web-design-guidelines mandatory fetch latest … Done when login 2 accounts role boundaries, own schedule/grades/notifications/requests, persistent create/status lifecycle staff, downloadable watermark, responsive 360, accessible keyboard focus, no real data … No edits; return exact file:line reproducible findings prioritized.

## 7. Корректировка по результатам ревью

> Review concrete bugs fix within your owned files please: service getWorkspace only current-week classes => ±week UI empty … Notification hrefs … need '/dashboard/*' … Seed grade mapping … avg always —. Please seed meaningful passed numeric grades … Existing DB seeded so … don't overwrite requests.

После исправлений reviewer повторно проверил диапазон, ссылки, оценки и полномочия. Дополнительно обнаружен конкурентный TRANSACTION_ACTIVE; worker сначала добавил падающий тест, затем сериализовал локальные записи сервиса и лимитера.

## 8. Интеграция и проверка

> Browser real sign-in/ownership/staff transitions/HTML/read persistence passed desktop; mobile core passed. Финальный прогон повторю after rebuild.

Финальные результаты следует брать из `verification.md`, а не из промежуточных сообщений: проверки и исходники менялись в процессе.

## 9. Вторая итерация — уточнения пользователя

> Немного исправь мобильную версию. На iphone se работает странно заголовок.

> Добавь регистрацию реального аккаунта и возможность подтверждения по почте, если это не нарушает тз.

После указания на ограничение конкурсного ТЗ пользователь заменил этот пункт:

> добавь тогда регистрацию без подтверждения, с вымышленными данными

Дополнительные запросы:

> Сделай расписание заполненным, заполни 2 семестра (текущий и следующий) с учетом праздников и официальных выходных

> Добавь список преподов и «связь» с ним

> публичный, без секретов и базы, назови mgimo-vibecode-orbita

## 10. Основной агент → Astra xhigh, продолжение

> User finalclarification signup WITHOUT email verification only fictional profiles … New signup role alwaysstudent server assigned and generatedstudentnumber … no realPII … empty ownrequests … ClassItem.type also 'exam' … private teacher messages … staff can answer from existingdean UI … no automatedanswer masqueradingrealstaff.

Переданы проверенные переносы: 20 февраля 2027 года — рабочая суббота, 22 февраля — выходной; правовой источник и календарь. Зоны записи остались разделены: worker — lib/API/tests, root — интерфейс/E2E/документы/публикация.

## 11. Основной агент → ECC reviewer

> Check newsignupUI security/validation/accessibility … original screenshot bug … first regression recorded RED … Need finalsecurity+semestermigration+signupreview … sourceGitinitialized but notstageduntilchecks.

В ответ выявлены и исправлены зависшая ошибка повтора пароля, несовпадение login pattern, устаревший список диалогов и скрытая подпись учебной субботы. Проверка WebKit и увеличенного шрифта добавлена к Chromium-сценариям.
