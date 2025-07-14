import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "parcel_delivery",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  try {
    console.log("🔄 Начинаем миграцию базы данных...");

    // Создание таблицы истории транзакций с кредитами
    console.log("📊 Создание таблицы credit_transactions...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('add', 'deduct', 'refund')),
        description TEXT,
        related_request_id INTEGER REFERENCES parcel_requests(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создание индексов для оптимизации
    console.log("🔍 Создание индексов для credit_transactions...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
    `);

    // Добавление тестовых транзакций (если таблица пустая и есть пользователи)
    console.log("📝 Проверка существующих пользователей...");
    const existingUsers = await pool.query("SELECT id FROM users LIMIT 2");

    if (existingUsers.rows.length > 0) {
      console.log("📝 Добавление тестовых транзакций...");
      const existingTransactions = await pool.query(
        "SELECT COUNT(*) FROM credit_transactions"
      );

      if (parseInt(existingTransactions.rows[0].count) === 0) {
        const userId1 = existingUsers.rows[0].id;
        const userId2 =
          existingUsers.rows.length > 1 ? existingUsers.rows[1].id : userId1;

        await pool.query(
          `
          INSERT INTO credit_transactions (user_id, amount, type, description) VALUES
            ($1, 50, 'add', 'Пополнение кредитов администратором'),
            ($2, 30, 'add', 'Пополнение кредитов администратором');
        `,
          [userId1, userId2]
        );

        console.log(
          `✅ Добавлено ${existingUsers.rows.length} тестовых транзакций`
        );
      }
    } else {
      console.log(
        "⚠️ Пользователи не найдены, тестовые транзакции не добавлены"
      );
    }

    console.log("✅ Миграция успешно завершена!");
  } catch (error) {
    console.error("❌ Ошибка миграции:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function removeDimensionsColumn() {
  const { Pool } = await import("pg");
  const pool = new Pool({
    host: process.env.PGHOST || "postgres", // Используем имя сервиса Docker
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || "parcel_delivery",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "password", // Правильный пароль из docker-compose
  });
  try {
    await pool.query(
      "ALTER TABLE parcel_requests DROP COLUMN IF EXISTS dimensions;"
    );
    console.log("✅ Столбец dimensions удалён из parcel_requests");
  } catch (e) {
    console.error("❌ Ошибка при удалении столбца dimensions:", e.message);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  removeDimensionsColumn();
}

// Запуск миграции
migrate().catch((error) => {
  console.error("Ошибка выполнения миграции:", error);
  process.exit(1);
});
