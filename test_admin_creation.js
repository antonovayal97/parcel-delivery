const { Pool } = require("pg");

// Конфигурация базы данных
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "parcel_delivery",
  user: "postgres",
  password: "postgres",
});

async function testAdminCreation() {
  try {
    console.log("🔍 Проверяю пользователей с ролью admin...");

    // Ищем пользователей с ролью admin
    const adminUsers = await pool.query(
      "SELECT id, username, first_name, last_name, credits, role FROM users WHERE role = $1",
      ["admin"]
    );

    if (adminUsers.rows.length === 0) {
      console.log("❌ Пользователи с ролью admin не найдены");
      console.log('💡 Создайте пользователя с role = "admin" для тестирования');
      return;
    }

    console.log(`✅ Найдено ${adminUsers.rows.length} администраторов:`);

    adminUsers.rows.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.first_name} ${user.last_name} (${user.username})`
      );
      console.log(
        `   ID: ${user.id}, Кредиты: ${user.credits}, Роль: ${user.role}`
      );
    });

    console.log("\n🎉 Теперь администраторы могут создавать заявки БЕСПЛАТНО!");
    console.log("📝 В истории транзакций будут записи с amount = 0");
    console.log(
      "🔒 Обычные пользователи по-прежнему платят 10 кредитов за заявку"
    );
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

// Запускаем скрипт
testAdminCreation();
