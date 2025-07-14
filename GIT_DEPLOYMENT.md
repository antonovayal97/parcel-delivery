# 📦 Доставка кода через Git

## Вариант 1: Прямое клонирование

### На VPS:

```bash
# Клонирование репозитория
git clone https://github.com/your-username/your-repo.git /opt/parcel-delivery
cd /opt/parcel-delivery

# Запуск развертывания
sudo ./deploy.sh your-domain.com
```

### Если репозиторий приватный:

```bash
# Создание SSH ключа на VPS
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Добавление ключа в GitHub/GitLab
cat ~/.ssh/id_rsa.pub
# Скопируйте этот ключ в настройки SSH ключей вашего аккаунта

# Клонирование через SSH
git clone git@github.com:your-username/your-repo.git /opt/parcel-delivery
```

## Вариант 2: GitHub Actions (автоматическое развертывание)

### Создание workflow файла `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/parcel-delivery
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up --build -d
```

### Настройка секретов в GitHub:

1. Перейдите в Settings → Secrets and variables → Actions
2. Добавьте секреты:
   - `HOST` - IP адрес вашего VPS
   - `USERNAME` - имя пользователя на VPS
   - `SSH_KEY` - приватный SSH ключ

## Вариант 3: Webhook развертывание

### На VPS создайте webhook endpoint:

```bash
# Установка webhook
wget https://github.com/adnanh/webhook/releases/download/2.8.0/webhook-linux-amd64.tar.gz
tar -xzf webhook-linux-amd64.tar.gz
sudo mv webhook-linux-amd64/webhook /usr/local/bin/

# Создание конфигурации webhook
mkdir -p /opt/webhooks
```

### Создайте файл `/opt/webhooks/hooks.json`:

```json
[
  {
    "id": "deploy",
    "execute-command": "/opt/parcel-delivery/deploy-webhook.sh",
    "command-working-directory": "/opt/parcel-delivery"
  }
]
```

### Создайте скрипт `/opt/parcel-delivery/deploy-webhook.sh`:

```bash
#!/bin/bash
cd /opt/parcel-delivery
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

### Запуск webhook:

```bash
webhook -hooks /opt/webhooks/hooks.json -port 9000
```

### В GitHub добавьте webhook:

- URL: `http://your-vps-ip:9000/hooks/deploy`
- Content type: `application/json`
- Secret: ваш секретный ключ

## Вариант 4: Ручная загрузка файлов

### Через SCP:

```bash
# Сжатие проекта
tar -czf project.tar.gz .

# Загрузка на VPS
scp project.tar.gz root@your-vps-ip:/opt/

# На VPS:
cd /opt
tar -xzf project.tar.gz
mv project parcel-delivery
cd parcel-delivery
sudo ./deploy.sh your-domain.com
```

### Через rsync:

```bash
# Синхронизация файлов
rsync -avz --exclude 'node_modules' --exclude '.git' ./ root@your-vps-ip:/opt/parcel-delivery/
```

## Вариант 5: Docker Registry

### Сборка и загрузка образов:

```bash
# Сборка образов
docker build -t your-registry/parcel-backend:latest ./backend
docker build -t your-registry/parcel-frontend:latest .

# Загрузка в registry
docker push your-registry/parcel-backend:latest
docker push your-registry/parcel-frontend:latest
```

### На VPS:

```bash
# Создание docker-compose.prod.yml с образами из registry
version: "3.8"
services:
  backend:
    image: your-registry/parcel-backend:latest
    # ... остальная конфигурация

  frontend:
    image: your-registry/parcel-frontend:latest
    # ... остальная конфигурация
```

## 🔄 Обновление кода

### Автоматическое обновление через cron:

```bash
# Создание скрипта обновления
cat > /opt/parcel-delivery/auto-update.sh << 'EOF'
#!/bin/bash
cd /opt/parcel-delivery
git fetch origin
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    git pull origin main
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up --build -d
    echo "$(date): Обновление завершено" >> /var/log/parcel-update.log
fi
EOF

chmod +x /opt/parcel-delivery/auto-update.sh

# Добавление в cron (обновление каждые 5 минут)
echo "*/5 * * * * /opt/parcel-delivery/auto-update.sh" | crontab -
```

### Ручное обновление:

```bash
cd /opt/parcel-delivery
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

## 🛡️ Безопасность

### SSH ключи:

```bash
# Генерация ключей
ssh-keygen -t rsa -b 4096

# Копирование на VPS
ssh-copy-id root@your-vps-ip
```

### Ограничение доступа:

```bash
# Настройка firewall только для необходимых портов
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📊 Мониторинг развертывания

### Создание скрипта мониторинга:

```bash
cat > /opt/parcel-delivery/monitor-deploy.sh << 'EOF'
#!/bin/bash
echo "=== Статус развертывания ==="
echo "Время: $(date)"
echo "Git статус:"
git status --porcelain
echo "Docker статус:"
docker-compose -f docker-compose.prod.yml ps
echo "Health check:"
curl -f http://localhost:8000/api/health || echo "Backend недоступен"
EOF

chmod +x /opt/parcel-delivery/monitor-deploy.sh
```

## 🚨 Troubleshooting

### Проблемы с Git:

```bash
# Очистка Git
git reset --hard HEAD
git clean -fd
git pull origin main
```

### Проблемы с Docker:

```bash
# Очистка Docker
docker system prune -a
docker volume prune

# Пересборка
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Проблемы с правами:

```bash
# Исправление прав доступа
sudo chown -R $USER:$USER /opt/parcel-delivery
chmod +x /opt/parcel-delivery/*.sh
```

Выберите наиболее подходящий для вас способ доставки кода! 🎯
