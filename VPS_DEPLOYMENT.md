# 🚀 Развертывание проекта на VPS

## Предварительные требования

- VPS с Ubuntu 20.04+ или Debian 11+
- Минимум 2GB RAM, 20GB дискового пространства
- Доступ по SSH
- Домен (опционально, но рекомендуется)

## Шаг 1: Подготовка сервера

### Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### Установка необходимых пакетов

```bash
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### Установка Docker

```bash
# Удаление старых версий
sudo apt remove docker docker-engine docker.io containerd runc

# Установка зависимостей
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Добавление GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновление и установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
```

### Установка Docker Compose

```bash
# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker-compose --version
```

### Установка Nginx (опционально)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Шаг 2: Клонирование проекта

```bash
# Создание директории для проекта
mkdir -p /opt/parcel-delivery
cd /opt/parcel-delivery

# Клонирование репозитория (замените на ваш URL)
git clone <your-repository-url> .
```

## Шаг 3: Настройка переменных окружения

### Создание продакшн конфигурации

```bash
# Копирование примера конфигурации
cp backend/env.example backend/.env

# Редактирование конфигурации
nano backend/.env
```

### Настройка backend/.env для продакшна:

```env
# Продакшн настройки
NODE_ENV=production
PORT=8000

# База данных
DB_HOST=postgres
DB_PORT=5432
DB_NAME=parcel_delivery
DB_USER=postgres
DB_PASSWORD=your-super-secure-password-here

# Redis
REDIS_URL=redis://redis:6379

# Безопасность
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
BOT_TOKEN=your-telegram-bot-token

# CORS
FRONTEND_URL=https://your-domain.com

# Настройки безопасности
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Шаг 4: Создание продакшн docker-compose

Создайте файл `docker-compose.prod.yml`:

```bash
nano docker-compose.prod.yml
```

Содержимое файла:

```yaml
version: "3.8"

services:
  # PostgreSQL база данных
  postgres:
    image: postgres:15-alpine
    container_name: parcel_delivery_postgres_prod
    environment:
      POSTGRES_DB: parcel_delivery
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - parcel_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis кэш
  redis:
    image: redis:7-alpine
    container_name: parcel_delivery_redis_prod
    volumes:
      - redis_data:/data
    networks:
      - parcel_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: parcel_delivery_backend_prod
    env_file:
      - ./backend/.env
    environment:
      - NODE_ENV=production
      - PORT=8000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=parcel_delivery
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - BOT_TOKEN=${BOT_TOKEN}
      - FRONTEND_URL=${FRONTEND_URL}
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - parcel_network
    restart: unless-stopped

  # Frontend (React приложение)
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: parcel_delivery_frontend_prod
    environment:
      - VITE_API_URL=${FRONTEND_URL}/api
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - parcel_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  parcel_network:
    driver: bridge
```

## Шаг 5: Настройка Nginx (рекомендуется)

### Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/parcel-delivery
```

Содержимое конфигурации:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/api/health;
        proxy_set_header Host $host;
    }

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
```

### Активация конфигурации

```bash
sudo ln -s /etc/nginx/sites-available/parcel-delivery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Шаг 6: Настройка SSL (рекомендуется)

### Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Получение SSL сертификата

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Шаг 7: Настройка Firewall

```bash
# Установка UFW
sudo apt install -y ufw

# Настройка правил
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 8000

# Активация firewall
sudo ufw enable
```

## Шаг 8: Запуск приложения

### Первый запуск

```bash
# Перезагрузка для применения изменений группы docker
sudo reboot

# После перезагрузки
cd /opt/parcel-delivery

# Запуск в продакшне
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

### Проверка работы

```bash
# Проверка backend
curl http://localhost:8000/api/health

# Проверка frontend
curl http://localhost:3000

# Проверка через домен (если настроен)
curl https://your-domain.com/api/health
```

## Шаг 9: Настройка автозапуска

### Создание systemd сервиса

```bash
sudo nano /etc/systemd/system/parcel-delivery.service
```

Содержимое:

```ini
[Unit]
Description=Parcel Delivery Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/parcel-delivery
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### Активация автозапуска

```bash
sudo systemctl enable parcel-delivery.service
sudo systemctl start parcel-delivery.service
```

## Шаг 10: Мониторинг и обслуживание

### Просмотр логов

```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Обновление приложения

```bash
cd /opt/parcel-delivery

# Остановка
docker-compose -f docker-compose.prod.yml down

# Обновление кода
git pull origin main

# Пересборка и запуск
docker-compose -f docker-compose.prod.yml up --build -d
```

### Резервное копирование

```bash
# Создание скрипта резервного копирования
nano backup.sh
```

Содержимое скрипта:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Резервное копирование базы данных
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres parcel_delivery > $BACKUP_DIR/db_backup_$DATE.sql

# Резервное копирование файлов
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /opt/parcel-delivery

echo "Резервное копирование завершено: $BACKUP_DIR"
```

```bash
chmod +x backup.sh
```

## Полезные команды

### Управление сервисами

```bash
# Запуск
docker-compose -f docker-compose.prod.yml up -d

# Остановка
docker-compose -f docker-compose.prod.yml down

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Просмотр статуса
docker-compose -f docker-compose.prod.yml ps
```

### Очистка Docker

```bash
# Очистка неиспользуемых образов
docker system prune -a

# Очистка томов
docker volume prune
```

### Мониторинг ресурсов

```bash
# Использование ресурсов
docker stats

# Проверка дискового пространства
df -h

# Проверка памяти
free -h
```

## Troubleshooting

### Проблемы с подключением к БД

```bash
# Проверка подключения
docker-compose -f docker-compose.prod.yml exec backend node -e "
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
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Проблемы с Nginx

```bash
# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx

# Просмотр логов
sudo tail -f /var/log/nginx/error.log
```

## Безопасность

### Регулярные обновления

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление Docker образов
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Мониторинг безопасности

```bash
# Проверка открытых портов
sudo netstat -tlnp

# Проверка процессов
ps aux | grep docker
```

Теперь ваш проект развернут на VPS и готов к использованию! 🎉
