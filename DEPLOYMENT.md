# 🚀 Инструкции по развертыванию

## Локальная разработка

### Быстрый запуск

```bash
# Клонирование репозитория
git clone <repository-url>
cd parcel-delivery-app

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

## Продакшн развертывание

### 1. Подготовка сервера

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Настройка переменных окружения

Создайте файл `backend/.env`:

```env
# Продакшн настройки
NODE_ENV=production
PORT=8000

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

### 3. Настройка Nginx (опционально)

Создайте файл `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Запуск в продакшне

```bash
# Создание продакшн docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Или с переменными окружения
NODE_ENV=production docker-compose up -d
```

## Мониторинг и логи

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Мониторинг ресурсов

```bash
# Использование ресурсов
docker stats

# Проверка здоровья сервисов
curl http://localhost:8000/api/health
```

### Резервное копирование

```bash
# Резервное копирование базы данных
docker-compose exec postgres pg_dump -U postgres parcel_delivery > backup.sql

# Восстановление
docker-compose exec -T postgres psql -U postgres parcel_delivery < backup.sql
```

## Обновление приложения

```bash
# Остановка
docker-compose down

# Обновление кода
git pull origin main

# Пересборка и запуск
docker-compose up --build -d
```

## Безопасность

### SSL/TLS сертификаты

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com
```

### Firewall

```bash
# Настройка UFW
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Масштабирование

### Горизонтальное масштабирование

```bash
# Масштабирование backend
docker-compose up -d --scale backend=3

# Масштабирование с балансировщиком
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### Вертикальное масштабирование

Обновите `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.5"
        reservations:
          memory: 512M
          cpus: "0.25"
```

## Troubleshooting

### Проблемы с подключением к БД

```bash
# Проверка подключения
docker-compose exec backend node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err || res.rows[0]);
  pool.end();
});
"
```

### Проблемы с Redis

```bash
# Проверка Redis
docker-compose exec redis redis-cli ping

# Очистка кэша
docker-compose exec redis redis-cli FLUSHALL
```

### Проблемы с памятью

```bash
# Очистка неиспользуемых образов
docker system prune -a

# Очистка томов
docker volume prune
```

## CI/CD

### GitHub Actions

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.4
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /path/to/app
            git pull origin main
            docker-compose down
            docker-compose up --build -d
```

## Производительность

### Оптимизация PostgreSQL

```sql
-- Настройка производительности
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

### Оптимизация Redis

```bash
# Настройка Redis
docker-compose exec redis redis-cli CONFIG SET maxmemory 256mb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Логирование

### Централизованное логирование

```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Мониторинг с Prometheus

```yaml
# Добавьте в docker-compose.yml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
```
