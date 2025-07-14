import express from "express";
import { body, validationResult, query } from "express-validator";
import {
  authenticateToken,
  requireRole,
  cacheMiddleware,
} from "../middleware/auth.js";

const router = express.Router();

// Валидация данных кредитов
const creditValidation = [
  body("amount")
    .isInt({ min: 1 })
    .withMessage("Количество кредитов должно быть положительным числом"),
  body("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID пользователя должен быть положительным числом"),
];

// GET /api/credits/balance/:userId - Получение баланса кредитов пользователя
router.get(
  "/balance/:userId",
  authenticateToken,
  cacheMiddleware(300), // кэшируем на 5 минут
  async (req, res) => {
    try {
      const { userId } = req.params;
      const pool = req.app.locals.pool;

      // Проверяем права доступа
      if (req.user.role !== "admin" && req.user.id !== parseInt(userId)) {
        return res
          .status(403)
          .json({ message: "Недостаточно прав для просмотра баланса" });
      }

      const result = await pool.query(
        "SELECT credits FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      res.json({
        userId: parseInt(userId),
        credits: result.rows[0].credits,
      });
    } catch (error) {
      console.error("Ошибка получения баланса кредитов:", error);
      res.status(500).json({ message: "Ошибка получения баланса кредитов" });
    }
  }
);

// POST /api/credits/add - Пополнение кредитов (только для админов)
router.post(
  "/add",
  authenticateToken,
  requireRole(["admin"]),
  creditValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        });
      }

      const { userId, amount } = req.body;
      const pool = req.app.locals.pool;

      // Проверяем существование пользователя
      const userResult = await pool.query(
        "SELECT id, credits FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Обновляем баланс кредитов
      const newBalance = userResult.rows[0].credits + amount;
      await pool.query(
        "UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2",
        [newBalance, userId]
      );

      // Записываем транзакцию в историю
      await pool.query(
        `INSERT INTO credit_transactions (user_id, amount, type, description) 
         VALUES ($1, $2, 'add', $3)`,
        [userId, amount, `Пополнение кредитов на ${amount} единиц`]
      );

      // Очищаем кэш
      const redis = req.app.locals.redis;
      try {
        await redis.del(`cache:GET:/api/credits/balance/${userId}`);
        await redis.del(`cache:GET:/api/users/${userId}`);
      } catch (error) {
        console.error("Ошибка очистки кэша:", error);
      }

      res.json({
        message: "Кредиты успешно пополнены",
        userId: parseInt(userId),
        addedAmount: amount,
        newBalance: newBalance,
      });
    } catch (error) {
      console.error("Ошибка пополнения кредитов:", error);
      res.status(500).json({ message: "Ошибка пополнения кредитов" });
    }
  }
);

// POST /api/credits/deduct - Списание кредитов (для создания заявок)
router.post(
  "/deduct",
  authenticateToken,
  [
    body("userId")
      .isInt({ min: 1 })
      .withMessage("ID пользователя должен быть положительным числом"),
    body("amount")
      .isInt({ min: 1 })
      .withMessage("Количество кредитов должно быть положительным числом"),
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

      const { userId, amount } = req.body;
      const pool = req.app.locals.pool;

      // Проверяем права доступа
      if (req.user.role !== "admin" && req.user.id !== parseInt(userId)) {
        return res
          .status(403)
          .json({ message: "Недостаточно прав для списания кредитов" });
      }

      // Проверяем существование пользователя и его баланс
      const userResult = await pool.query(
        "SELECT id, credits FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      const currentCredits = userResult.rows[0].credits;
      if (currentCredits < amount) {
        return res.status(400).json({
          message: "Недостаточно кредитов",
          currentCredits: currentCredits,
          requiredAmount: amount,
        });
      }

      // Списываем кредиты
      const newBalance = currentCredits - amount;
      await pool.query(
        "UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2",
        [newBalance, userId]
      );

      // Записываем транзакцию в историю
      await pool.query(
        `INSERT INTO credit_transactions (user_id, amount, type, description) 
         VALUES ($1, $2, 'deduct', $3)`,
        [userId, amount, `Списание кредитов на ${amount} единиц`]
      );

      // Очищаем кэш
      const redis = req.app.locals.redis;
      try {
        await redis.del(`cache:GET:/api/credits/balance/${userId}`);
        await redis.del(`cache:GET:/api/users/${userId}`);
      } catch (error) {
        console.error("Ошибка очистки кэша:", error);
      }

      res.json({
        message: "Кредиты успешно списаны",
        userId: parseInt(userId),
        deductedAmount: amount,
        newBalance: newBalance,
      });
    } catch (error) {
      console.error("Ошибка списания кредитов:", error);
      res.status(500).json({ message: "Ошибка списания кредитов" });
    }
  }
);

// GET /api/credits/history/:userId - История операций с кредитами (для админов)
router.get(
  "/history/:userId",
  authenticateToken,
  requireRole(["admin"]),
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

      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const pool = req.app.locals.pool;

      // Проверяем существование пользователя
      const userResult = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Получаем общее количество операций
      const countResult = await pool.query(
        "SELECT COUNT(*) FROM credit_transactions WHERE user_id = $1",
        [userId]
      );
      const total = parseInt(countResult.rows[0].count);

      // Получаем историю операций с пагинацией
      const historyResult = await pool.query(
        `SELECT id, user_id, amount, type, description, created_at 
         FROM credit_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      res.json({
        current_page: page,
        data: historyResult.rows,
        first_page_url: `/api/credits/history/${userId}?page=1&limit=${limit}`,
        from: offset + 1,
        last_page: totalPages,
        last_page_url: `/api/credits/history/${userId}?page=${totalPages}&limit=${limit}`,
        next_page_url:
          page < totalPages
            ? `/api/credits/history/${userId}?page=${page + 1}&limit=${limit}`
            : null,
        path: `/api/credits/history/${userId}`,
        per_page: limit,
        prev_page_url:
          page > 1
            ? `/api/credits/history/${userId}?page=${page - 1}&limit=${limit}`
            : null,
        to: Math.min(offset + limit, total),
        total,
      });
    } catch (error) {
      console.error("Ошибка получения истории кредитов:", error);
      res.status(500).json({ message: "Ошибка получения истории кредитов" });
    }
  }
);

export default router;
