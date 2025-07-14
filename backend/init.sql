-- Создание базы данных (если не существует)
-- CREATE DATABASE parcel_delivery;

-- Подключение к базе данных
\c parcel_delivery;

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(20),
  credits INTEGER DEFAULT 100,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Создание таблицы заявок на доставку
CREATE TABLE IF NOT EXISTS parcel_requests (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('send', 'receive')),
  from_city VARCHAR(255) NOT NULL,
  to_city VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  weight DECIMAL(8,2) NOT NULL,
  dimensions VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы истории транзакций с кредитами
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('add', 'deduct', 'refund')),
  description TEXT,
  related_request_id INTEGER REFERENCES parcel_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_parcel_requests_user_id ON parcel_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_parcel_requests_status ON parcel_requests(status);
CREATE INDEX IF NOT EXISTS idx_parcel_requests_created_at ON parcel_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcel_requests_updated_at 
  BEFORE UPDATE ON parcel_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Создание тестовых данных
INSERT INTO users (telegram_id, username, first_name, last_name, phone, credits, role) VALUES
  (123456789, 'test_user1', 'Иван', 'Иванов', '+79001234567', 150, 'user'),
  (987654321, 'test_user2', 'Мария', 'Петрова', '+79009876543', 200, 'user'),
  (555666777, 'admin', 'Администратор', 'Системы', '+79005556677', 1000, 'admin')
ON CONFLICT (telegram_id) DO NOTHING;

-- Создание тестовых заявок
INSERT INTO parcel_requests (type, from_city, to_city, description, weight, dimensions, contact_name, user_id, trip_date, status) VALUES
  ('send', 'Москва', 'Бангкок', 'Электроника и одежда', 2.5, '30x20x15 см', 'Иван Иванов', 1, '2024-02-15', 'pending'),
  ('receive', 'Бангкок', 'Санкт-Петербург', 'Сувениры и косметика', 1.8, '25x18x12 см', 'Мария Петрова', 2, '2024-02-20', 'accepted'),
  ('send', 'Казань', 'Пхукет', 'Книги и подарки', 3.2, '35x25x20 см', 'Иван Иванов', 1, '2024-02-25', 'completed'),
  ('receive', 'Паттайя', 'Екатеринбург', 'Тропические фрукты', 4.0, '40x30x25 см', 'Мария Петрова', 2, '2024-03-01', 'cancelled'),
  ('send', 'Новосибирск', 'Чиангмай', 'Медикаменты и витамины', 1.5, '20x15x10 см', 'Иван Иванов', 1, '2024-03-05', 'pending')
ON CONFLICT DO NOTHING;

-- Создание тестовых транзакций с кредитами
INSERT INTO credit_transactions (user_id, amount, type, description, related_request_id) VALUES
  (1, 10, 'deduct', 'Создание заявки на отправку', 1),
  (2, 10, 'deduct', 'Создание заявки на получение', 2),
  (1, 10, 'deduct', 'Создание заявки на отправку', 3),
  (2, 10, 'deduct', 'Создание заявки на получение', 4),
  (1, 10, 'deduct', 'Создание заявки на отправку', 5),
  (1, 50, 'add', 'Пополнение кредитов администратором', NULL),
  (2, 30, 'add', 'Пополнение кредитов администратором', NULL)
ON CONFLICT DO NOTHING; 