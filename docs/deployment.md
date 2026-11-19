# Публикация: Vercel или самостоятельный сервер

Приложение впервые опубликовано 4 ноября 2026 года: **[mgimo-vibecode-orbita.vercel.app](https://mgimo-vibecode-orbita.vercel.app)**. Исходники: [AyanamiFRei/mgimo-vibecode-orbita](https://github.com/AyanamiFRei/mgimo-vibecode-orbita).

Обновление от 19 ноября 2026 года опубликовано из коммита `aa405f6`: песочная светлая тема, важные красные акценты, профили и расписания преподавателей, фото профиля, история переходов и анимации Material 3. Deployment `dpl_kdTm5gNe4vcuQMHGPB3AU9so5kM9` имеет статус READY, Node.js 24.x, регион функций `arn1`. На production проверены новая регистрация и вход, профили, группы обеих программ в расписании, загрузка/чтение/удаление WebP-аватара из Turso и запрет чужого Origin. Временный QA-аккаунт удалён вместе с его учебными записями; все 5 существовавших аккаунтов сохранены, foreign_key_check не выявил ошибок. Три серверных узла в Москве и Санкт-Петербурге вернули HTTP 200: [отчёт от 19 ноября](https://check-host.net/check-report/5901632fkb0f). Проверка отдельных узлов не гарантирует доступ со всех домашних и мобильных операторов.

## Текущая публикация

- Vercel: проект `mgimo-vibecode-orbita`, scope `sahar8s-projects`, тариф Hobby. Native Next.js, Node.js 24.x, `npm ci`, `npm run build`; output directory определяется адаптером автоматически.
- Функции: `arn1` (Стокгольм), рядом с постоянной Turso в `aws-eu-north-1`. Регион сборочной машины может быть `iad1`: он не задаёт регион выполнения функций.
- БД: Turso Free, отдельная от локальной SQLite. Созданы схема и вымышленные начальные данные. После проверки оставлены демонстрационные заявка, переписка и отдельный вымышленный аккаунт регистрации.
- Серверные переменные production: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TRUST_PROXY=true`. Токен БД и секрет NextAuth сохранены в Vercel как Secret. Значения не публикуются в исходниках.
- Канонический origin: `https://mgimo-vibecode-orbita.vercel.app`. Preview-адреса и дополнительные aliases не предназначены для отправки форм с этим production `NEXTAUTH_URL`.
- Первоначальная публикация выполнена Vercel CLI 65.11.0 из коммита приложения `f18953d`. Автодеплой GitHub не подключён: `vercel git connect` отклонён сервисом. Исходники доступны в GitHub; репозиторий можно подключить через Settings → Git в Vercel после связывания GitHub с аккаунтом владельца.

Повторная публикация из этого checkout после изменения и проверки исходников:

```powershell
npx --yes vercel@65.11.0 deploy --prod --scope sahar8s-projects
```

В новом checkout сначала выполните `npx --yes vercel@65.11.0 login`, затем `npx --yes vercel@65.11.0 link --project mgimo-vibecode-orbita --scope sahar8s-projects --yes`. Оплаченные возможности и trial Pro не включались. Бесплатные тарифы действуют в пределах квот поставщиков: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Turso Free](https://turso.tech/pricing).

19 ноября Vercel отклонил публикацию из Git working tree: автор коммита не связан с владельцем проекта. Владелец проекта может выполнить поддерживаемую [ручную CLI-публикацию независимо от Git](https://vercel.com/docs/deployments) из чистого снимка проверенного коммита. Она использует существующие проект и production-переменные; секреты и рабочие БД в архив не входят. Для повторения из корня репозитория в PowerShell:

```powershell
$releaseCommit = git rev-parse --verify HEAD
if ($LASTEXITCODE -ne 0) { throw 'Не удалось определить проверенный коммит' }
$releaseFolder = Join-Path $env:TEMP ("orbita-release-" + [guid]::NewGuid().ToString('N'))
$releaseArchive = $releaseFolder + '.zip'
git archive --format=zip $releaseCommit --output=$releaseArchive
if ($LASTEXITCODE -ne 0) { throw 'Не удалось собрать снимок исходников' }
Expand-Archive -LiteralPath $releaseArchive -DestinationPath $releaseFolder -ErrorAction Stop
Push-Location -LiteralPath $releaseFolder -ErrorAction Stop
try {
  npx --yes vercel@65.11.0 deploy --project mgimo-vibecode-orbita --prod --yes --scope sahar8s-projects --meta "releaseCommit=$releaseCommit"
  if ($LASTEXITCODE -ne 0) { throw 'Vercel не опубликовал обновление' }
} finally {
  Pop-Location
}
```

Архив включает только уже закоммиченные файлы; `.vercelignore` дополнительно ограничивает состав загрузки. Публиковать следует после тестов и проверки staged diff.

Production-проверка прошла: вход `student1`, `student2`, `dean`; страницы кабинета; оба семестра и отсутствие занятий 4 ноября; создание заявки, статусы `processing` → `ready`, документ; 404 для чужой заявки/чата, 403 для staff API студенту и чужого Origin; создание чата, ответ сотрудника и регистрация отдельного вымышленного студента. Неавторизованный `/api/workspace` возвращает 401. Рабочая запись и чтение идут через Vercel в Turso.

Проверка HTTPS `/login` 4 ноября 2026 года с `ru1` и `ru2` Check-Host (Москва, две разные сети) дала HTTP 200 с обоих узлов: [отчёт](https://check-host.net/check-report/55935049k9fd). Это проверка серверных сетей, а не всех домашних/мобильных операторов; доступ на всех провайдерах и будущую непрерывную доступность она не гарантирует. Приёмочную проверку нужно дополнить открытием с телефона через российский мобильный интернет без VPN.

## Vercel + удалённый libSQL

Перед публикацией версии с фото профиля обязательно выполните `node --env-file=.env.turso.local --import tsx scripts/setup-db.ts` против удалённой БД. Команда добавляет `user_avatars` и согласует сгенерированное расписание; пароли, заявки, переписки и отметки прочитанности сохраняются. Эта миграция успешно выполнена 19 ноября 2026 года, неизменность этих данных проверена сравнением хешей до и после. Новых переменных окружения и отдельного файлового хранилища не требуется.

Для движения интерфейса применяется схема Standard из [Material 3](https://m3.material.io/styles/motion). Значения spring-токенов сверены с [официальным AndroidX](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt); CSS использует linear() с cubic-bezier fallback и полностью отключает движение при reduced motion.

1. Импортируйте [репозиторий проекта](https://github.com/AyanamiFRei/mgimo-vibecode-orbita). В нём есть package-lock.json; `.env.local`, `data`, node_modules и .next исключены.
2. Создайте удалённую libSQL-совместимую БД, например через Turso. Скопируйте URL и токен в безопасное место. Файловый `file:` URL для Vercel не подходит и блокируется приложением.
3. В локальном `.env.turso.local` укажите удалённые `DATABASE_URL=libsql://…` и `DATABASE_AUTH_TOKEN=…`, затем выполните `node --env-file=.env.turso.local --import tsx scripts/setup-db.ts`. Это создаст вымышленные аккаунты и начальные данные в удалённой БД, сохранив локальную SQLite-настройку. Файл исключён из Git и Vercel upload; не публикуйте его. Перед повторным seed убедитесь, что выбрана нужная БД.
4. Импортируйте репозиторий в Vercel. Framework: Next.js, Node.js 22+, install `npm ci`, build `npm run build`. Убедитесь, что Vercel применяет native Next.js адаптер, а не пытается раздавать статический HTML.
5. Задайте серверные переменные: DATABASE_URL, DATABASE_AUTH_TOKEN, NEXTAUTH_SECRET (новая случайная строка), NEXTAUTH_URL (точный production HTTPS origin). Не добавляйте NEXT_PUBLIC. Не указывайте localhost на production.
6. Выполните Deploy. Если адрес впервые станет известен после deploy, исправьте NEXTAUTH_URL и повторите deployment. После смены адреса старые preview-origin мутации намеренно отклоняются; тестируйте на каноническом домене.
7. Проверьте все 3 аккаунта, новую заявку, изоляцию и документ в двух разных браузерных сессиях. Отдельно откройте сайт из России через реальную сеть без VPN и с телефона. Успех локальной сборки не подтверждает сетевую доступность конкретного провайдера.

Тарифы, доступность регистрации и квоты определяются сервисами. Инструкции: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Turso/libSQL TypeScript](https://docs.turso.tech/sdk/ts/reference). Если удалённая БД или домен недоступны в нужной сети, используйте VPS с локальной SQLite и доступным доменом.

## VPS / Docker

Подходит сервер с Docker Compose, постоянным диском и HTTPS reverse proxy (например, Caddy/Nginx). Передайте на него исходники; создайте `.env.local` из `.env.example`.

```dotenv
NEXTAUTH_SECRET=<случайная строка минимум 32 символа>
NEXTAUTH_URL=https://your-domain.example
DATABASE_URL=file:/app/data/orbita.db
DATABASE_AUTH_TOKEN=
```

```bash
docker compose up -d --build
docker compose logs --tail=100
```

Контейнер стартует как пользователь node, запускает идемпотентный setup и standalone-сервер. Именованный volume orbita-data хранит SQLite между пересозданиями контейнера. Порт 3000 слушает только loopback хоста; reverse proxy должен направлять HTTPS-трафик на 127.0.0.1:3000. Compose рассчитан на один процесс приложения с локальной БД.

Резервируйте volume средствами хостинга или SQLite backup API при остановленной записи/согласованном snapshot. Не копируйте единственный живой файл базы посреди транзакции. Не выполняйте `docker compose down -v`, если нужно сохранить заявки.

Dockerfile подготовлен, но локально Docker daemon был недоступен; сборка контейнера не считается проверенной. Production standalone-запуск и отдельная БД проверяются E2E на обычном Node.js.

## Без Docker

Node.js 22+, `npm ci`, настройка окружения, `npm run db:setup`, `npm run build`, `npm start`. Запускайте процесс менеджером служб и сохраняйте директорию `data` вне временного checkout либо укажите абсолютный file URL. Секреты должны поступать через окружение, а не из архива исходников.

## Перед отправкой жюри

- Публичный HTTPS-адрес работает без входа в аккаунт хостинг-провайдера и без VPN из России.
- В комментарии к работе указаны адрес и student1/student2/dean с демопаролем.
- Репозиторий открыт жюри либо загружен архив исходников без .env и рабочих БД.
- Загружен PDF процесса и при желании видео до 5 минут.
- Хостинг, домен и БД остаются доступны до 28 ноября 2026 года; не удаляйте deployment после подачи.
