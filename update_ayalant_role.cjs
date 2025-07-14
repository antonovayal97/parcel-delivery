const { Pool } = require("pg");

// Конфигурация базы данных
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "parcel_delivery",
  user: "postgres",
  password: "postgres",
});

async function updateAyalantRole() {
  try {
    console.log("🔍 Ищу пользователя ayalant...");

    // Ищем пользователя по username
    const userResult = await pool.query(
      "SELECT id, username, first_name, last_name, credits, role FROM users WHERE username = $1",
      ["ayalant"]
    );

    if (userResult.rows.length === 0) {
      console.log("❌ Пользователь ayalant не найден");
      console.log('💡 Сначала создайте пользователя с username = "ayalant"');
      return;
    }

    const user = userResult.rows[0];
    console.log(`✅ Пользователь найден:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Имя: ${user.first_name} ${user.last_name}`);
    console.log(`   Текущие кредиты: ${user.credits}`);
    console.log(`   Текущая роль: ${user.role}`);

    if (user.role === "admin") {
      console.log("🎉 Пользователь ayalant уже является администратором!");
      console.log("✅ Он может создавать заявки бесплатно");
      return;
    }

    console.log("\n🔄 Обновляю роль на admin...");

    // Обновляем роль на admin
    const updateResult = await pool.query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      ["admin", user.id]
    );

    console.log("✅ Роль успешно обновлена!");
    console.log(`🎉 Пользователь ayalant теперь администратор`);
    console.log(`💰 Может создавать заявки БЕСПЛАТНО`);
    console.log(`📊 Новые данные пользователя:`);
    console.log(`   ID: ${updateResult.rows[0].id}`);
    console.log(`   Username: ${updateResult.rows[0].username}`);
    console.log(`   Роль: ${updateResult.rows[0].role}`);
    console.log(`   Кредиты: ${updateResult.rows[0].credits}`);
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

// Запускаем скрипт
updateAyalantRole();
