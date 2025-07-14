# 🚀 Быстрый старт

## Запуск за 3 минуты

### 1. Клонирование

```bash
git clone <repository-url>
cd parcel-delivery-app
```

### 2. Запуск

```bash
./start.sh
```

### 3. Проверка

- Frontend: http://localhost:5173
- Backend: http://localhost:8000/api/health

## Что получили

✅ **Полноценный бэкенд** на Express.js с:

- PostgreSQL для данных
- Redis для кэширования
- JWT аутентификация
- Telegram WebApp интеграция
- Rate limiting
- Валидация данных

✅ **Готовый фронтенд** на React с:

- TypeScript
- Tailwind CSS
- Telegram Mini App интеграция
- Адаптивный дизайн

✅ **Docker контейнеризация** с:

- Автоматическая сборка
- Health checks
- Персистентные данные
- Сетевая изоляция

## API Endpoints

### Аутентификация

- `POST /api/auth/login` - Вход через Telegram
- `GET /api/auth/me` - Текущий пользователь

### Заявки

- `GET /api/parcel-requests` - Список заявок
- `POST /api/parcel-requests` - Создание заявки
- `PUT /api/parcel-requests/:id` - Обновление заявки

## Полезные команды

```bash
# Логи
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Очистка
docker-compose down -v
```

## Настройка для продакшна

1. Отредактируйте `backend/.env`
2. Настройте `BOT_TOKEN` для Telegram
3. Измените `JWT_SECRET` на безопасный
4. Настройте домен в `FRONTEND_URL`

## Структура проекта

```
├── src/                    # React фронтенд
├── backend/               # Express бэкенд
│   ├── src/
│   │   ├── routes/        # API роуты
│   │   ├── middleware/    # Middleware
│   │   └── database/      # Миграции
├── docker-compose.yml     # Docker конфигурация
└── start.sh              # Скрипт запуска
```

## Технологии

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, PostgreSQL, Redis
- **Auth**: JWT, Telegram WebApp API
- **Infrastructure**: Docker, Docker Compose

## Поддержка

- 📖 [Полная документация](README.md)
- 🚀 [Инструкции по развертыванию](DEPLOYMENT.md)
- 🐛 [Создать Issue](https://github.com/your-repo/issues)
