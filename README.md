# Corp Messenger — Enterprise Edition

Корпоративный мессенджер с системой комнат (каналов), прямыми сообщениями (DM), реалтайм-общением, RBAC-правами и аудитом действий.

## Стек технологий

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, Socket.IO Client
- **Backend:** Node.js, Express, TypeScript, Socket.IO, Zod, JWT, bcrypt
- **Database:** Prisma ORM (SQLite для локальной разработки, PostgreSQL для Docker/Production)
- **Infra:** Docker Compose (App + PostgreSQL + Redis)

## Быстрый старт (локальная разработка)

1. Установите зависимости:
   ```bash
   npm run install:all
   ```
2. Подготовьте переменные окружения (`.env` уже создан для dev, шаблон в `.env.example`):
   ```bash
   cp .env.example .env
   ln -sf ../.env server/.env
   ```
3. Инициализируйте базу данных и тестовые данные:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```
4. Запустите проект (backend `:3001` + frontend `:5173`):
   ```bash
   npm run dev
   ```

Откройте `http://localhost:5173` в браузере.

### Демо-доступ по умолчанию (после `npm run db:seed`)

- **Admin:** `admin@corp.com` / `admin123` (роль `admin`, автоматически добавлен в `#general`)

## Запуск в Docker (Production / PostgreSQL)

```bash
docker compose up --build
```

Приложение будет доступно по адресу `http://localhost:3001`.

## Основные возможности

- **Аутентификация:** Регистрация, вход, JWT Access + Refresh tokens (с автообновлением и отзывом при деактивации), rate limiting, bcrypt (cost 12).
- **Комнаты (каналы):** Публичные и приватные каналы, `#general` по умолчанию, управление участниками, архивирование, настройки комнаты.
- **Прямые сообщения (DM):** Приватные диалоги 1-на-1 между сотрудниками.
- **Realtime:** Мгновенная доставка сообщений, редактирование, удаление, закрепление, ответы (reply), индикатор набора текста (`typing`), онлайн-статусы (`online / away / dnd / offline`), счётчики непрочитанных сообщений.
- **Поиск:** Поиск по сообщениям внутри комнаты и поиск пользователей.
- **Админ-панель (`owner` / `admin`):** Управление пользователями (роли `owner`, `admin`, `moderator`, `member`, `guest`, блокировка/разблокировка), статистика системы, журнал аудита (`AuditLog`).

