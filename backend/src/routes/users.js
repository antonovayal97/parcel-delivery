import express from "express";
import { body, validationResult, query } from "express-validator";
import {
  authenticateToken,
  requireRole,
  cacheMiddleware,
} from "../middleware/auth.js";

const router = express.Router();

// Валидация данных пользователя
const userValidation = [
  body("username")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Имя пользователя должно содержать минимум 3 символа"),
  body("first_name")
    .optional()
    .notEmpty()
    .withMessage("Имя не может быть пустым"),
  body("last_name")
    .optional()
    .notEmpty()
    .withMessage("Фамилия не может быть пустой"),
  body("phone")
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Неверный формат телефона"),
  body("credits")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Кредиты должны быть положительным числом"),
];

// GET /api/users - Получение списка пользователей (с пагинацией)
router.get(
  "/",
  authenticateToken,
  requireRole(["admin"]),
  cacheMiddleware(60),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Номер страницы должен быть положительным числом"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Лимит должен быть от 1 до 100"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const pool = req.app.locals.pool;

      // Получаем общее количество пользователей
      const countResult = await pool.query("SELECT COUNT(*) FROM users");
      const total = parseInt(countResult.rows[0].count);

      // Получаем пользователей с пагинацией
      const usersResult = await pool.query(
        `SELECT id, telegram_id, username, first_name, last_name, phone, 
         credits, role, created_at, last_login 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      res.json({
        current_page: page,
        data: usersResult.rows,
        first_page_url: `/api/users?page=1&limit=${limit}`,
        from: offset + 1,
        last_page: totalPages,
        last_page_url: `/api/users?page=${totalPages}&limit=${limit}`,
        next_page_url:
          page < totalPages
            ? `/api/users?page=${page + 1}&limit=${limit}`
            : null,
        path: "/api/users",
        per_page: limit,
        prev_page_url:
          page > 1 ? `/api/users?page=${page - 1}&limit=${limit}` : null,
        to: Math.min(offset + limit, total),
        total,
      });
    } catch (error) {
      console.error("Ошибка получения пользователей:", error);
      res
        .status(500)
        .json({ message: "Ошибка получения списка пользователей" });
    }
  }
);

// POST /api/users - Создание нового пользователя
router.post(
  "/",
  authenticateToken,
  requireRole(["admin"]),
  userValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        });
      }

      const {
        telegram_id,
        username,
        first_name,
        last_name,
        phone,
        credits = 100,
      } = req.body;

      const pool = req.app.locals.pool;

      // Проверяем уникальность telegram_id
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE telegram_id = $1",
        [telegram_id]
      );

      if (existingUser.rows.length > 0) {
        return res
          .status(400)
          .json({ message: "Пользователь с таким Telegram ID уже существует" });
      }

      // Создаем нового пользователя
      const newUser = await pool.query(
        `INSERT INTO users (
          telegram_id, username, first_name, last_name, phone, credits, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
        RETURNING *`,
        [telegram_id, username, first_name, last_name, phone, credits]
      );

      res.status(201).json(newUser.rows[0]);
    } catch (error) {
      console.error("Ошибка создания пользователя:", error);
      res.status(500).json({ message: "Ошибка создания пользователя" });
    }
  }
);

// GET /api/users/:id - Получение пользователя по ID
router.get(
  "/:id",
  authenticateToken,
  cacheMiddleware(300),
  async (req, res) => {
    try {
      const { id } = req.params;
      const pool = req.app.locals.pool;

      // Проверяем права доступа (пользователь может видеть только свой профиль, админ - любой)
      if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
        return res
          .status(403)
          .json({ message: "Недостаточно прав для просмотра этого профиля" });
      }

      const result = await pool.query(
        `SELECT id, telegram_id, username, first_name, last_name, phone, 
         credits, role, created_at, last_login 
         FROM users WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Ошибка получения пользователя:", error);
      res.status(500).json({ message: "Ошибка получения данных пользователя" });
    }
  }
);

// PUT /api/users/:id - Обновление пользователя
router.put("/:id", authenticateToken, userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Ошибка валидации",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const pool = req.app.locals.pool;

    // Проверяем права доступа
    if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
      return res
        .status(403)
        .json({
          message: "Недостаточно прав для редактирования этого профиля",
        });
    }

    const { username, first_name, last_name, phone, credits } = req.body;

    // Формируем запрос для обновления
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updateFields.push(`username = $${paramIndex++}`);
      updateValues.push(username);
    }
    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex++}`);
      updateValues.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
      updateValues.push(last_name);
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(phone);
    }
    if (credits !== undefined && req.user.role === "admin") {
      updateFields.push(`credits = $${paramIndex++}`);
      updateValues.push(credits);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "Нет данных для обновления" });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(
        ", "
      )} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка обновления пользователя:", error);
    res.status(500).json({ message: "Ошибка обновления пользователя" });
  }
});

// DELETE /api/users/:id - Удаление пользователя
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const pool = req.app.locals.pool;

      // Проверяем существование пользователя
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Удаляем пользователя
      await pool.query("DELETE FROM users WHERE id = $1", [id]);

      res.json({ message: "Пользователь успешно удален" });
    } catch (error) {
      console.error("Ошибка удаления пользователя:", error);
      res.status(500).json({ message: "Ошибка удаления пользователя" });
    }
  }
);

// GET /api/users/telegram/:telegramId - Получение пользователя по Telegram ID
router.get(
  "/telegram/:telegramId",
  authenticateToken,
  cacheMiddleware(300),
  async (req, res) => {
    try {
      const { telegramId } = req.params;
      const pool = req.app.locals.pool;

      const result = await pool.query(
        `SELECT id, telegram_id, username, first_name, last_name, phone, 
         credits, role, created_at, last_login 
         FROM users WHERE telegram_id = $1`,
        [telegramId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Ошибка получения пользователя по Telegram ID:", error);
      res.status(500).json({ message: "Ошибка получения данных пользователя" });
    }
  }
);

export default router;
