#!/bin/bash

echo "🚚 Запуск проекта Международная Доставка"
echo "=========================================="

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Создаем .env файл если его нет
if [ ! -f "backend/.env" ]; then
    echo "📝 Создаем файл .env из примера..."
    cp backend/env.example backend/.env
    echo "✅ Файл .env создан. Не забудьте настроить переменные окружения!"
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down

# Собираем и запускаем контейнеры
echo "🔨 Собираем и запускаем контейнеры..."
docker-compose up --build -d

# Ждем запуска сервисов
echo "⏳ Ждем запуска сервисов..."
sleep 30

# Проверяем статус сервисов
echo "🔍 Проверяем статус сервисов..."
docker-compose ps

# Проверяем health check
echo "🏥 Проверяем health check..."
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend API работает"
else
    echo "❌ Backend API не отвечает"
fi

echo ""
echo "🎉 Проект запущен!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Health Check: http://localhost:8000/api/health"
echo "🗄️ PostgreSQL: localhost:5432"
echo "🔴 Redis: localhost:6379"
echo ""
echo "📋 Полезные команды:"
echo "  docker-compose logs -f    # Просмотр логов"
echo "  docker-compose down       # Остановка"
echo "  docker-compose restart    # Перезапуск"
echo "" 