#!/bin/bash

# 🚀 Скрипт автоматического развертывания на VPS
# Использование: ./deploy.sh [domain]

set -e

echo "🚀 Начинаем развертывание проекта на VPS"
echo "=========================================="

# Проверка аргументов
DOMAIN=${1:-"localhost"}
echo "🌐 Домен: $DOMAIN"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Проверка прав администратора
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами администратора (sudo)"
fi

log "Обновление системы..."
apt update && apt upgrade -y

log "Установка необходимых пакетов..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release nginx ufw

# Установка Docker
log "Установка Docker..."
if ! command -v docker &> /dev/null; then
    # Удаление старых версий
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Установка зависимостей
    apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Добавление GPG ключа Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Добавление репозитория Docker
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Обновление и установка Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io
    
    # Добавление пользователя в группу docker
    usermod -aG docker $SUDO_USER
else
    log "Docker уже установлен"
fi

# Установка Docker Compose
log "Установка Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose уже установлен"
fi

# Создание директории проекта
log "Создание директории проекта..."
mkdir -p /opt/parcel-delivery
cd /opt/parcel-delivery

# Копирование файлов проекта (если скрипт запущен из директории проекта)
if [ -f "docker-compose.yml" ]; then
    log "Копирование файлов проекта..."
    cp -r . /opt/parcel-delivery/
else
    warning "Файлы проекта не найдены в текущей директории"
    log "Пожалуйста, скопируйте файлы проекта в /opt/parcel-delivery/"
fi

# Настройка переменных окружения
log "Настройка переменных окружения..."
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/env.example" ]; then
        cp backend/env.example backend/.env
        log "Файл .env создан из примера"
    else
        error "Файл env.example не найден"
    fi
fi

# Генерация случайных паролей
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Обновление .env файла
log "Обновление конфигурации..."
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" backend/.env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
sed -i "s/NODE_ENV=.*/NODE_ENV=production/" backend/.env
sed -i "s/FRONTEND_URL=.*/FRONTEND_URL=https:\/\/$DOMAIN/" backend/.env

# Создание продакшн docker-compose
log "Создание продакшн конфигурации..."
cat > docker-compose.prod.yml << 'EOF'
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
EOF

# Настройка Nginx
log "Настройка Nginx..."
cat > /etc/nginx/sites-available/parcel-delivery << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/api/health;
        proxy_set_header Host \$host;
    }

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
EOF

# Активация конфигурации Nginx
ln -sf /etc/nginx/sites-available/parcel-delivery /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Настройка Firewall
log "Настройка Firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 8000
ufw --force enable

# Создание systemd сервиса
log "Создание systemd сервиса..."
cat > /etc/systemd/system/parcel-delivery.service << 'EOF'
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
EOF

# Активация автозапуска
systemctl enable parcel-delivery.service

# Создание скрипта резервного копирования
log "Создание скрипта резервного копирования..."
cat > /opt/parcel-delivery/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Резервное копирование базы данных
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres parcel_delivery > $BACKUP_DIR/db_backup_$DATE.sql

# Резервное копирование файлов
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /opt/parcel-delivery

echo "Резервное копирование завершено: $BACKUP_DIR"
EOF

chmod +x /opt/parcel-delivery/backup.sh

# Создание скрипта обновления
log "Создание скрипта обновления..."
cat > /opt/parcel-delivery/update.sh << 'EOF'
#!/bin/bash
cd /opt/parcel-delivery

# Остановка
docker-compose -f docker-compose.prod.yml down

# Обновление кода (если используется git)
# git pull origin main

# Пересборка и запуск
docker-compose -f docker-compose.prod.yml up --build -d

echo "Обновление завершено"
EOF

chmod +x /opt/parcel-delivery/update.sh

# Запуск приложения
log "Запуск приложения..."
cd /opt/parcel-delivery
docker-compose -f docker-compose.prod.yml up -d

# Ожидание запуска сервисов
log "Ожидание запуска сервисов..."
sleep 30

# Проверка статуса
log "Проверка статуса сервисов..."
docker-compose -f docker-compose.prod.yml ps

# Проверка health check
log "Проверка health check..."
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    log "✅ Backend API работает"
else
    warning "❌ Backend API не отвечает"
fi

# Настройка SSL (если домен не localhost)
if [ "$DOMAIN" != "localhost" ]; then
    log "Настройка SSL сертификата..."
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
fi

log "🎉 Развертывание завершено!"
echo ""
echo "📱 Frontend: http://$DOMAIN"
echo "🔧 Backend API: http://$DOMAIN/api"
echo "📊 Health Check: http://$DOMAIN/health"
echo ""
echo "📋 Полезные команды:"
echo "  cd /opt/parcel-delivery"
echo "  docker-compose -f docker-compose.prod.yml logs -f    # Просмотр логов"
echo "  docker-compose -f docker-compose.prod.yml down       # Остановка"
echo "  ./update.sh                                          # Обновление"
echo "  ./backup.sh                                          # Резервное копирование"
echo ""
echo "🔐 Пароли сохранены в /opt/parcel-delivery/backend/.env"
echo "" 