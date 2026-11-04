# Публикация: Vercel или самостоятельный сервер

Приложение проверено локально. Исходники: [AyanamiFRei/mgimo-vibecode-orbita](https://github.com/AyanamiFRei/mgimo-vibecode-orbita). Подключённых аккаунтов хостинга нет; публичный адрес самого приложения пока не создан.

## Vercel + удалённый libSQL

1. Импортируйте [репозиторий проекта](https://github.com/AyanamiFRei/mgimo-vibecode-orbita). В нём есть package-lock.json; `.env.local`, `data`, node_modules и .next исключены.
2. Создайте удалённую libSQL-совместимую БД, например через Turso. Скопируйте URL и токен в безопасное место. Файловый `file:` URL для Vercel не подходит и блокируется приложением.
3. В локальном `.env.local` временно укажите удалённые `DATABASE_URL=libsql://…` и `DATABASE_AUTH_TOKEN=…`, затем выполните `npm run db:setup`. Это создаст вымышленные аккаунты и начальные данные в удалённой БД. Не публикуйте этот файл.
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
