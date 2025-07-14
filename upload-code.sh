#!/bin/bash

# 🚀 Скрипт для загрузки кода на VPS
# Использование: ./upload-code.sh [vps-ip] [username] [domain]

set -e

# Проверка аргументов
if [ $# -lt 1 ]; then
    echo "Использование: $0 <vps-ip> [username] [domain]"
    echo "Пример: $0 192.168.1.100 root mydomain.com"
    exit 1
fi

VPS_IP=$1
USERNAME=${2:-"root"}
DOMAIN=${3:-"localhost"}

echo "🚀 Загрузка кода на VPS: $VPS_IP"
echo "👤 Пользователь: $USERNAME"
echo "🌐 Домен: $DOMAIN"
echo "=========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Проверка подключения к VPS
log "Проверка подключения к VPS..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $USERNAME@$VPS_IP exit 2>/dev/null; then
    error "Не удается подключиться к VPS. Проверьте IP адрес и SSH ключи."
fi

# Создание архива проекта
log "Создание архива проекта..."
tar --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='build' -czf project.tar.gz .

# Загрузка архива на VPS
log "Загрузка архива на VPS..."
scp project.tar.gz $USERNAME@$VPS_IP:/tmp/

# Выполнение команд на VPS
log "Выполнение команд на VPS..."
ssh $USERNAME@$VPS_IP << EOF
    # Создание директории проекта
    sudo mkdir -p /opt/parcel-delivery
    cd /opt/parcel-delivery
    
    # Распаковка архива
    sudo tar -xzf /tmp/project.tar.gz
    
    # Очистка временного файла
    rm /tmp/project.tar.gz
    
    # Установка прав доступа
    sudo chown -R $USERNAME:$USERNAME /opt/parcel-delivery
    sudo chmod +x /opt/parcel-delivery/*.sh
    
    # Запуск развертывания
    cd /opt/parcel-delivery
    sudo ./deploy.sh $DOMAIN
EOF

# Очистка локального архива
rm project.tar.gz

log "✅ Код успешно загружен и развернут на VPS!"
echo ""
echo "📱 Проверьте работу приложения:"
echo "   Frontend: http://$VPS_IP:5173"
echo "   Backend: http://$VPS_IP:8000/api/health"
if [ "$DOMAIN" != "localhost" ]; then
    echo "   Домен: https://$DOMAIN"
fi
echo ""
echo "🔧 Полезные команды для управления:"
echo "   ssh $USERNAME@$VPS_IP"
echo "   cd /opt/parcel-delivery"
echo "   docker-compose -f docker-compose.prod.yml logs -f" 