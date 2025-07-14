import express from "express";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { validateTelegramData, authenticateToken } from "../middleware/auth.js";
import multer from "multer";
import crypto from "crypto";

const upload = multer();

const router = express.Router();

// Валидация данных входа
const loginValidation = [
  body("telegram_user")
    .isJSON()
    .withMessage("Данные пользователя Telegram должны быть в формате JSON"),
  body("init_data").notEmpty().withMessage("Данные инициализации обязательны"),
];

// POST /api/auth/login - Вход через Telegram
router.post("/login", upload.none(), loginValidation, async (req, res) => {
  let debug = {};
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Ошибка валидации",
        errors: errors.array(),
      });
    }

    const { telegram_user, init_data } = req.body;
    const userData = JSON.parse(telegram_user);

    // --- Формируем debug до валидации ---
    try {
      const urlParams = new URLSearchParams(init_data);
      const hash = urlParams.get("hash");
      urlParams.delete("hash");
      const params = Array.from(urlParams.entries()).sort();
      const dataCheckString = params
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
      const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(process.env.BOT_TOKEN || "")
        .digest();
      const calculatedHash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");
      debug = {
        init_data,
        data_check_string: dataCheckString,
        hash,
        calculated_hash: calculatedHash,
        secret_key_hex: secretKey.toString("hex"),
        bot_token: (process.env.BOT_TOKEN || "").slice(0, 8) + "...",
      };
    } catch (e) {
      debug = { error: e.message };
    }
    // --- Конец debug ---

    // Валидируем данные Telegram (может выбросить ошибку)
    validateTelegramData(init_data);

    const pool = req.app.locals.pool;
    const redis = req.app.locals.redis;

    // Проверяем существование пользователя
    let user = await pool.query("SELECT * FROM users WHERE telegram_id = $1", [
      userData.id,
    ]);

    if (user.rows.length === 0) {
      // Создаем нового пользователя
      const newUser = await pool.query(
        `INSERT INTO users (
          telegram_id, username, first_name, last_name, 
          phone, credits, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
        RETURNING *`,
        [
          userData.id,
          userData.username || null,
          userData.first_name || null,
          userData.last_name || null,
          userData.phone_number || null,
          100, // Начальные кредиты
        ]
      );
      user = newUser;
    }

    const userRecord = user.rows[0];

    // Создаем JWT токен
    const token = jwt.sign(
      {
        id: userRecord.id,
        telegram_id: userRecord.telegram_id,
        role: userRecord.role || "user",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Сохраняем токен в Redis для отслеживания сессий
    await redis.setEx(`session:${userRecord.id}`, 7 * 24 * 60 * 60, token);

    // Обновляем время последнего входа
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      userRecord.id,
    ]);

    res.json({
      message: "Успешная авторизация",
      user: {
        id: userRecord.id,
        telegram_id: userRecord.telegram_id,
        username: userRecord.username,
        first_name: userRecord.first_name,
        last_name: userRecord.last_name,
        phone: userRecord.phone,
        credits: userRecord.credits,
        role: userRecord.role,
      },
      token,
      debug,
    });
  } catch (error) {
    console.error("Ошибка авторизации:", error);
    res.status(500).json({
      message: "Ошибка авторизации",
      error: error.message,
      debug,
    });
  }
});

// POST /api/auth/logout - Выход
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const redis = req.app.locals.redis;

    // Удаляем сессию из Redis
    await redis.del(`session:${req.user.id}`);

    res.json({ message: "Успешный выход из системы" });
  } catch (error) {
    console.error("Ошибка выхода:", error);
    res.status(500).json({ message: "Ошибка при выходе из системы" });
  }
});

// GET /api/auth/me - Получение текущего пользователя
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const result = await pool.query(
      "SELECT id, telegram_id, username, first_name, last_name, phone, credits, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка получения пользователя:", error);
    res.status(500).json({ message: "Ошибка получения данных пользователя" });
  }
});

// POST /api/auth/refresh - Обновление токена
router.post("/refresh", authenticateToken, async (req, res) => {
  try {
    const redis = req.app.locals.redis;

    // Проверяем существование сессии в Redis
    const sessionToken = await redis.get(`session:${req.user.id}`);

    if (!sessionToken) {
      return res.status(401).json({ message: "Сессия истекла" });
    }

    // Создаем новый токен
    const newToken = jwt.sign(
      {
        id: req.user.id,
        telegram_id: req.user.telegram_id,
        role: req.user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Обновляем сессию в Redis
    await redis.setEx(`session:${req.user.id}`, 7 * 24 * 60 * 60, newToken);

    res.json({
      message: "Токен обновлен",
      token: newToken,
    });
  } catch (error) {
    console.error("Ошибка обновления токена:", error);
    res.status(500).json({ message: "Ошибка обновления токена" });
  }
});

export default router;
