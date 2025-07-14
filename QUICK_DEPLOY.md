# 🚀 Быстрое развертывание на VPS

## Вариант 1: Автоматическое развертывание (рекомендуется)

### 1. Подготовка VPS

```bash
# Подключение к VPS
ssh root@your-server-ip

# Скачивание скрипта развертывания
wget https://raw.githubusercontent.com/your-repo/main/deploy.sh
chmod +x deploy.sh
```

### 2. Запуск автоматического развертывания

```bash
# Для домена
sudo ./deploy.sh your-domain.com

# Или для IP адреса
sudo ./deploy.sh your-server-ip
```

## Вариант 2: Ручное развертывание

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Клонирование проекта

```bash
mkdir -p /opt/parcel-delivery
cd /opt/parcel-delivery
git clone <your-repository-url> .
```

### 3. Настройка конфигурации

```bash
# Создание .env файла
cp backend/env.example backend/.env

# Редактирование конфигурации
nano backend/.env
```

### 4. Запуск приложения

```bash
# Запуск через Docker Compose
docker-compose up -d

# Проверка статуса
docker-compose ps
```

## Проверка работы

```bash
# Проверка backend
curl http://localhost:8000/api/health

# Проверка frontend
curl http://localhost:5173
```

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Обновление
git pull origin main
docker-compose up --build -d
```

## Настройка домена (опционально)

### 1. Установка Nginx

```bash
sudo apt install -y nginx
```

### 2. Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/parcel-delivery
```

Содержимое:

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

### 3. Активация

```bash
sudo ln -s /etc/nginx/sites-available/parcel-delivery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL сертификат

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Проблемы с Docker

```bash
# Проверка статуса Docker
sudo systemctl status docker

# Перезапуск Docker
sudo systemctl restart docker
```

### Проблемы с портами

```bash
# Проверка занятых портов
sudo netstat -tlnp

# Остановка сервисов на портах
sudo fuser -k 8000/tcp
sudo fuser -k 5173/tcp
```

### Проблемы с памятью

```bash
# Очистка Docker
docker system prune -a

# Проверка использования ресурсов
docker stats
```

## Безопасность

### Настройка Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Регулярные обновления

```bash
# Создание скрипта обновления
cat > update.sh << 'EOF'
#!/bin/bash
cd /opt/parcel-delivery
git pull origin main
docker-compose up --build -d
EOF

chmod +x update.sh
```

## Мониторинг

### Создание скрипта мониторинга

```bash
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== Статус сервисов ==="
docker-compose ps

echo "=== Использование ресурсов ==="
docker stats --no-stream

echo "=== Health Check ==="
curl -f http://localhost:8000/api/health || echo "Backend недоступен"
EOF

chmod +x monitor.sh
```

Теперь ваш проект развернут и готов к использованию! 🎉
