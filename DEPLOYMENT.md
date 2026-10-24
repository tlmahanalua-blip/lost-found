# Обновление сайта на Vercel

В этой версии есть настоящая регистрация, вход, база данных, контакты и сохранение фотографий. Старого размещения только HTML/CSS/JS уже недостаточно: нужны также серверные файлы и подключение базы.

## 1. Проверь работу на ноутбуке

Установи Node.js 22 (22.13 или новее). Распакуй архив. Открой PowerShell **в папке, где лежит `package.json`**, и выполни:

```powershell
npm ci
npm start
```

Открой http://localhost:8000. Сервер сам создаст `data/lost-found.db`. Создай аккаунт, добавь объявление с контактами и фото. Данные сохранятся в SQLite после перезапуска. Не запускай эту версию через `python -m http.server`: Python будет показывать файлы, но не запустит API регистрации.

Для остановки нажми Ctrl+C. Для запуска снова используй `npm start`.

## 2. Создай базу для Vercel

Обычный локальный файл `.db` нельзя использовать как постоянную общую базу внутри Vercel Functions. Поэтому на ноутбуке используется SQLite-файл, а для Vercel — удалённая SQLite-совместимая база **Turso libSQL**.

1. Открой Turso: https://turso.tech .
2. Создай базу **libSQL**, совместимую с `@libsql/client`. Если предлагается выбор движка между Turso и libSQL, выбери **libSQL** для этого проекта.
3. Скопируй URL базы вида `libsql://...`.
4. Создай database auth token для этой базы. Это именно токен доступа к базе, не общий токен управления аккаунтом.
5. Сохрани URL и токен у себя. Не вставляй токен в код, HTML, чат или публичный GitHub.

Документация подключения: https://docs.turso.tech/sdk/ts/reference .

Создание аккаунта/базы и выбор тарифа выполняешь ты. Никакие платные ресурсы автоматически не создаются этим кодом.

## 3. Загрузи полный проект

В репозитории, подключённом к твоему Vercel-проекту, должны находиться **все** файлы из распакованной папки, включая:

```text
api/
lib/
public/
scripts/
tests/
database/
package.json
package-lock.json
vercel.json
server.js
```

Не загружай только `public/` и не используй старую `dist/` как корень проекта. Не загружай `node_modules`, настоящую `.env` или локальную `data/` с пользовательскими данными. В репозиторий можно добавить безопасный шаблон `.env.example`.

## 4. Настройки Vercel

В настройках проекта проверь:

| Настройка | Значение |
| --- | --- |
| Root Directory | Папка, где лежат `package.json` и `vercel.json` |
| Framework Preset | Other |
| Node.js Version | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `public` |

`vercel.json` уже содержит настройки сборки и output directory. Удали старые ручные overrides, которые указывают на `dist`. Серверная функция находится в `api/index.js` и обслуживает `/api/index`.

## 5. Environment Variables

Добавь в Vercel следующие **серверные** переменные:

| Name | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | URL твоей libSQL-базы |
| `TURSO_AUTH_TOKEN` | Database auth token |
| `APP_ORIGIN` | Необязательно: основной адрес сайта, например `https://your-project.vercel.app` |
| `ADMIN_EMAILS` | Необязательно: email твоего уже зарегистрированного аккаунта для координатора |

Выбери Production и, если нужна тестовая версия, Preview. Не используй переменные с префиксами `NEXT_PUBLIC_` или `VITE_` для токена. **Не задавай `DATABASE_URL=file:...` на Vercel.**

При обновлении существующей базы версии 2 сначала создай резервную копию средствами её провайдера. Версия 3 переносит таблицы в схему users / categories / items; локальная файловая копия на Vercel не создаётся.

После сохранения переменных запусти **Redeploy**. Таблицы создаются автоматически при первом API-запросе; вручную выполнять SQL не требуется. Сборка не требует доступа к базе. Локальная команда npm start подключает учебные 102 записи только к настроенной у неё базе. Для переноса в удалённую базу из частной папки проекта настрой TURSO_DATABASE_URL / TURSO_AUTH_TOKEN в .env и выполни npm.cmd run db:coursework. Учебный файл database/assignment3-original.db исключён из git; публиковать его отдельно не требуется.

Для координатора: сначала зарегистрируй свой аккаунт, убедись, что это твой email, затем добавь его в `ADMIN_EMAILS` и передеплой. Несколько адресов разделяются запятыми. Email в этой учебной версии не подтверждается, поэтому не назначай права адресу, аккаунт которого ещё не создала сама.

## 6. Проверка после деплоя

1. Открой сайт и дождись надписи **CONNECTED**.
2. Нажми **Create account**, введи имя, email и пароль минимум из 10 символов.
3. В **Report an item** выбери **Lost** или **Found**, добавь название, категорию, дату и время, место и описание.
4. Добавь фото. Введи имя и email контактного лица; телефон и Telegram можно оставить пустыми.
5. Подтверди согласие на показ контактов зарегистрированным пользователям и отсутствие приватных ID-данных в описании/фото.
6. Опубликуй объявление. Открой **My reports** и проверь контакты и фото.
7. Открой сайт в другом браузере: объявление видно всем, контакты доступны после входа. Другой зарегистрированный пользователь может отправить claim.
8. В **Manage reports** автор видит заявки на свои вещи. Только автор или координатор может отметить вещь возвращённой.

Новые данные теперь общие для пользователей, а не хранятся только в браузере. Фото сохраняется в базе. Пароли хранятся в виде salted scrypt hashes; cookie сессии HttpOnly, SameSite=Lax и Secure на Vercel.

## Если не работает

- **OFFLINE / Database is not configured:** проверь обе `TURSO_*` переменные, тип базы libSQL и сделай Redeploy.
- **Страница есть, кнопки входа не работают:** проверь, что загружены `api/`, `lib/` и `package.json`, а не только статические файлы.
- **Всё ещё используется старый сайт:** проверь Root Directory и Output Directory (`public`, не `dist`).
- **npm не распознано:** установи Node.js, закрой PowerShell и открой его заново.
- **Данные на ноутбуке не видны на Vercel:** локальный SQLite и удалённая база — разные базы. Автоматического переноса нет.
- **Сброс пароля:** в текущей версии не реализован. Запомни пароль тестового аккаунта.

Не публикуй личные данные в учебном проекте без согласия. Указанные контакты показываются любому вошедшему пользователю; аккаунты не подтверждают принадлежность к университету.

## English quick setup

1. Deploy the **entire project**, including `api/` and `lib/`, to your existing Vercel repository.
2. Use Framework Other, Node 22.x, install `npm ci`, build `npm run build`, output `public`.
3. Create a **Turso libSQL** database. Set server-only `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel; redeploy.
4. Database tables initialise automatically on the first request. Register an account and publish a report.
5. For local use: `npm ci`, then `npm start`; open http://localhost:8000. This creates a local SQLite database.

No live deployment or remote database was created as part of preparing this ZIP. Automated local API/database tests passed; browser visual QA was interrupted.

Official references: https://vercel.com/kb/guide/is-sqlite-supported-in-vercel and https://docs.turso.tech/sdk/ts/reference .
