# 🚚 Международная Доставка Посылок

Веб-приложение для управления международными отправлениями посылок с интеграцией Telegram Bot.

## 🌟 Особенности

- 📱 **Telegram Bot интеграция** - создание заявок через Telegram
- 🌍 **Международная доставка** - поддержка различных стран и городов
- 🔐 **Система аутентификации** - JWT токены и роли пользователей
- 💳 **Система кредитов** - внутренняя валюта для оплаты услуг
- 📊 **Панель администратора** - управление заявками и пользователями
- 🎨 **Современный UI** - React + TypeScript + Tailwind CSS
- 🐳 **Docker контейнеризация** - легкое развертывание
- 🗄️ **PostgreSQL + Redis** - надежное хранение данных

## 🏗️ Архитектура

### Frontend

- **React 18** с TypeScript
- **Vite** для быстрой сборки
- **Tailwind CSS** для стилизации
- **React Router** для навигации
- **Axios** для HTTP запросов

### Backend

- **Node.js** с Express
- **PostgreSQL** для основной базы данных
- **Redis** для кэширования и сессий
- **JWT** для аутентификации
- **Telegram Bot API** интеграция

### Инфраструктура

- **Docker** контейнеризация
- **Docker Compose** для оркестрации
- **Nginx** как reverse proxy
- **SSL/TLS** сертификаты

## 🚀 Быстрый старт

### Локальная разработка

```bash
# Клонирование репозитория
git clone https://github.com/your-username/parcel-delivery.git
cd parcel-delivery

# Запуск через скрипт
./start.sh
```

### Ручной запуск

```bash
# 1. Настройка переменных окружения
cp backend/env.example backend/.env
# Отредактируйте backend/.env

# 2. Запуск через Docker Compose
docker-compose up --build -d

# 3. Проверка работы
curl http://localhost:8000/api/health
```

## 📦 Развертывание на VPS

### Автоматическое развертывание

```bash
# Загрузка кода на VPS
./upload-code.sh your-vps-ip root your-domain.com
```

### Ручное развертывание

```bash
# На VPS
git clone https://github.com/your-username/parcel-delivery.git /opt/parcel-delivery
cd /opt/parcel-delivery
sudo ./deploy.sh your-domain.com
```

Подробные инструкции по развертыванию: [VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md)

## 🔧 Конфигурация

### Переменные окружения

Создайте файл `backend/.env`:

```env
# Настройки сервера
PORT=8000
NODE_ENV=production

# База данных
DB_HOST=postgres
DB_PORT=5432
DB_NAME=parcel_delivery
DB_USER=postgres
DB_PASSWORD=your-secure-password

# Redis
REDIS_URL=redis://redis:6379

# Безопасность
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
BOT_TOKEN=your-telegram-bot-token

# CORS
FRONTEND_URL=https://your-domain.com
```

### Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен бота
3. Добавьте токен в переменную `BOT_TOKEN`

## 📱 API Endpoints

### Аутентификация

- `POST /api/auth/register` - регистрация пользователя
- `POST /api/auth/login` - вход в систему
- `GET /api/auth/profile` - получение профиля

### Заявки на доставку

- `GET /api/parcel-requests` - список заявок
- `POST /api/parcel-requests` - создание заявки
- `PUT /api/parcel-requests/:id` - обновление заявки
- `DELETE /api/parcel-requests/:id` - удаление заявки

### Кредиты

- `GET /api/credits/balance` - баланс кредитов
- `POST /api/credits/add` - пополнение кредитов
- `POST /api/credits/spend` - трата кредитов

### Пользователи

- `GET /api/users` - список пользователей (admin)
- `PUT /api/users/:id` - обновление пользователя
- `DELETE /api/users/:id` - удаление пользователя

## 🗄️ База данных

### Основные таблицы

- **users** - пользователи системы
- **parcel_requests** - заявки на доставку
- **credits** - транзакции кредитов
- **cities** - города для доставки

### Миграции

```bash
# Запуск миграций
cd backend
node database/migrate.js
```

## 🔐 Роли пользователей

- **user** - обычный пользователь
- **admin** - администратор системы
- **ayalant** - специальная роль для партнеров

## 🐳 Docker

### Сборка образов

```bash
# Backend
docker build -t parcel-backend ./backend

# Frontend
docker build -t parcel-frontend .
```

### Запуск контейнеров

```bash
# Разработка
docker-compose up -d

# Продакшн
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Мониторинг

### Health Check

```bash
curl http://localhost:8000/api/health
```

### Логи

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
```

### Метрики

```bash
# Использование ресурсов
docker stats

# Дисковое пространство
df -h
```

## 🔄 Обновление

### Автоматическое обновление

```bash
# На VPS
cd /opt/parcel-delivery
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

### GitHub Actions

Создайте `.github/workflows/deploy.yml` для автоматического развертывания.

## 🛡️ Безопасность

- JWT токены для аутентификации
- Хеширование паролей
- CORS настройки
- Rate limiting
- SSL/TLS сертификаты
- Firewall настройки

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тестирование API
curl http://localhost:8000/api/health
```

## 📝 Документация

- [Инструкции по развертыванию](./VPS_DEPLOYMENT.md)
- [Быстрое развертывание](./QUICK_DEPLOY.md)
- [Доставка кода через Git](./GIT_DEPLOYMENT.md)
- [API документация](./CREDITS_API.md)

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 📞 Поддержка

Если у вас есть вопросы или проблемы:

- Создайте Issue в GitHub
- Обратитесь к документации
- Проверьте логи приложения

---

**Сделано с ❤️ для международной доставки посылок**
