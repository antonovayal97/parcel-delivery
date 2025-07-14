import express from "express";
import { body, validationResult, query } from "express-validator";
import {
  authenticateToken,
  requireRole,
  cacheMiddleware,
} from "../middleware/auth.js";

const router = express.Router();

// Валидация данных заявки
const parcelRequestValidation = [
  body("type")
    .isIn(["send", "receive"])
    .withMessage('Тип должен быть "send" или "receive"'),
  body("fromCity").notEmpty().withMessage("Город отправления обязателен"),
  body("toCity").notEmpty().withMessage("Город назначения обязателен"),
  body("description").notEmpty().withMessage("Описание посылки обязательно"),
  body("weight")
    .isFloat({ min: 0.1 })
    .withMessage("Вес посылки должен быть минимум 0.1 кг"),
  body("contactName").notEmpty().withMessage("Имя контакта обязательно"),
  body("userId").notEmpty().withMessage("ID пользователя обязателен"),
  body("tripDate")
    .optional()
    .custom((value) => {
      if (value && value !== "") {
        if (!Date.parse(value)) {
          throw new Error("Неверный формат даты поездки");
        }
      }
      return true;
    })
    .withMessage("Неверный формат даты поездки"),
];

// GET /api/parcel-requests - Получение всех заявок (с пагинацией)
router.get(
  "/",
  authenticateToken,
  cacheMiddleware(60), // увеличиваем кэширование до 1 минуты
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Номер страницы должен быть положительным числом"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Лимит должен быть от 1 до 100"),
    query("status")
      .optional()
      .custom((value) => {
        if (value) {
          const statuses = value.split(",").map((s) => s.trim());
          const validStatuses = [
            "pending",
            "accepted",
            "completed",
            "cancelled",
          ];
          for (const status of statuses) {
            if (!validStatuses.includes(status)) {
              throw new Error(`Неверный статус: ${status}`);
            }
          }
        }
        return true;
      })
      .withMessage("Неверный статус"),
    query("type")
      .optional()
      .isIn(["send", "receive"])
      .withMessage("Неверный тип заявки"),
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
      const { status, type } = req.query;

      const pool = req.app.locals.pool;

      // Формируем условия WHERE
      const whereConditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (status) {
        // Поддерживаем множественные статусы через запятую
        if (status.includes(",")) {
          const statuses = status.split(",").map((s) => s.trim());
          const placeholders = statuses
            .map((_, index) => `$${paramIndex + index}`)
            .join(",");
          whereConditions.push(`status IN (${placeholders})`);
          queryParams.push(...statuses);
          paramIndex += statuses.length;
        } else {
          whereConditions.push(`status = $${paramIndex++}`);
          queryParams.push(status);
        }
      }

      if (type) {
        whereConditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Получаем общее количество заявок
      const countQuery = `SELECT COUNT(*) FROM parcel_requests ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Получаем заявки с пагинацией
      const requestsQuery = `
        SELECT pr.*, u.username, u.first_name, u.last_name 
        FROM parcel_requests pr
        LEFT JOIN users u ON pr.user_id = u.id
        ${whereClause}
        ORDER BY pr.created_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      const requestsResult = await pool.query(requestsQuery, [
        ...queryParams,
        limit,
        offset,
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        current_page: page,
        data: requestsResult.rows,
        first_page_url: `/api/parcel-requests?page=1&limit=${limit}`,
        from: offset + 1,
        last_page: totalPages,
        last_page_url: `/api/parcel-requests?page=${totalPages}&limit=${limit}`,
        next_page_url:
          page < totalPages
            ? `/api/parcel-requests?page=${page + 1}&limit=${limit}`
            : null,
        path: "/api/parcel-requests",
        per_page: limit,
        prev_page_url:
          page > 1
            ? `/api/parcel-requests?page=${page - 1}&limit=${limit}`
            : null,
        to: Math.min(offset + limit, total),
        total,
      });
    } catch (error) {
      console.error("Ошибка получения заявок:", error);
      res.status(500).json({ message: "Ошибка получения списка заявок" });
    }
  }
);

// POST /api/parcel-requests - Создание новой заявки
router.post(
  "/",
  authenticateToken,
  parcelRequestValidation,
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
        type,
        fromCity,
        toCity,
        description,
        weight,
        contactName,
        userId,
        tripDate,
      } = req.body;

      const pool = req.app.locals.pool;

      // Проверяем, что пользователь создает заявку для себя
      if (req.user.id !== parseInt(userId) && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Недостаточно прав для создания заявки" });
      }

      // Проверяем баланс кредитов пользователя и его роль
      const userResult = await pool.query(
        "SELECT credits, role FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // БЕСПЛАТНОЕ СОЗДАНИЕ ДЛЯ ВСЕХ
      await pool.query(
        `INSERT INTO credit_transactions (user_id, amount, type, description) 
         VALUES ($1, $2, 'deduct', $3)`,
        [
          userId,
          0,
          `Бесплатное создание заявки на ${
            type === "send" ? "отправку" : "получение"
          }`,
        ]
      );

      // Создаем новую заявку
      const newRequest = await pool.query(
        `INSERT INTO parcel_requests (
          type, from_city, to_city, description, weight,
          contact_name, user_id, trip_date, status, dimensions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          type,
          fromCity,
          toCity,
          description,
          weight,
          contactName,
          userId,
          tripDate || null, // Используем null для пустых дат
          "pending",
          req.body.dimensions || "", // Добавляем dimensions, если не передано — пустая строка
        ]
      );

      // Обновляем транзакцию с ID заявки
      await pool.query(
        `UPDATE credit_transactions 
         SET related_request_id = $1 
         WHERE id = (
           SELECT id FROM credit_transactions 
           WHERE user_id = $2 AND type = 'deduct' AND related_request_id IS NULL 
           ORDER BY created_at DESC LIMIT 1
         )`,
        [newRequest.rows[0].id, userId]
      );

      // Получаем полные данные заявки с информацией о пользователе
      const fullRequest = await pool.query(
        `SELECT pr.*, u.username, u.first_name, u.last_name 
         FROM parcel_requests pr
         LEFT JOIN users u ON pr.user_id = u.id
         WHERE pr.id = $1`,
        [newRequest.rows[0].id]
      );

      // Очищаем кэш для списков заявок и кредитов
      const redis = req.app.locals.redis;
      try {
        // Очищаем все кэши, связанные с заявками
        const keys = await redis.keys("cache:GET:/api/parcel-requests*");
        if (keys.length > 0) {
          await redis.del(keys);
        }

        // Очищаем кэш кредитов пользователя
        const creditCacheKeys = await redis.keys(
          `cache:GET:/api/credits/balance/${userId}*`
        );
        if (creditCacheKeys.length > 0) {
          await redis.del(creditCacheKeys);
        }
        const userCacheKeys = await redis.keys(
          `cache:GET:/api/users/${userId}*`
        );
        if (userCacheKeys.length > 0) {
          await redis.del(userCacheKeys);
        }
      } catch (error) {
        console.error("Ошибка очистки кэша:", error);
      }

      res.status(201).json(fullRequest.rows[0]);
    } catch (error) {
      console.error("Ошибка создания заявки:", error);
      res.status(500).json({ message: "Ошибка создания заявки" });
    }
  }
);

// GET /api/parcel-requests/:id - Получение заявки по ID
router.get(
  "/:id",
  authenticateToken,
  cacheMiddleware(120),
  async (req, res) => {
    // увеличиваем кэширование до 2 минут
    try {
      const { id } = req.params;
      const pool = req.app.locals.pool;

      const result = await pool.query(
        `SELECT pr.*, u.username, u.first_name, u.last_name 
         FROM parcel_requests pr
         LEFT JOIN users u ON pr.user_id = u.id
         WHERE pr.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Заявка не найдена" });
      }

      // Проверяем права доступа
      const request = result.rows[0];
      if (req.user.role !== "admin" && req.user.id !== request.user_id) {
        return res
          .status(403)
          .json({ message: "Недостаточно прав для просмотра этой заявки" });
      }

      res.json(request);
    } catch (error) {
      console.error("Ошибка получения заявки:", error);
      res.status(500).json({ message: "Ошибка получения данных заявки" });
    }
  }
);

// PUT /api/parcel-requests/:id - Обновление заявки
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.app.locals.pool;

    // Получаем текущую заявку
    const currentRequest = await pool.query(
      "SELECT * FROM parcel_requests WHERE id = $1",
      [id]
    );

    if (currentRequest.rows.length === 0) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    const request = currentRequest.rows[0];

    // Проверяем права доступа
    if (req.user.role !== "admin" && req.user.id !== request.user_id) {
      return res
        .status(403)
        .json({ message: "Недостаточно прав для редактирования этой заявки" });
    }

    const {
      type,
      fromCity,
      toCity,
      description,
      weight,
      contactName,
      status,
      tripDate,
    } = req.body;

    // Формируем запрос для обновления
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      updateValues.push(type);
    }
    if (fromCity !== undefined) {
      updateFields.push(`from_city = $${paramIndex++}`);
      updateValues.push(fromCity);
    }
    if (toCity !== undefined) {
      updateFields.push(`to_city = $${paramIndex++}`);
      updateValues.push(toCity);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description);
    }
    if (weight !== undefined) {
      updateFields.push(`weight = $${paramIndex++}`);
      updateValues.push(weight);
    }
    if (contactName !== undefined) {
      updateFields.push(`contact_name = $${paramIndex++}`);
      updateValues.push(contactName);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);

      // Если заявка отменяется, просто очищаем кэш кредитов (возврата не делаем)
      if (status === "cancelled") {
        const redis = req.app.locals.redis;
        try {
          const creditCacheKeys = await redis.keys(
            `cache:GET:/api/credits/balance/${request.user_id}*`
          );
          if (creditCacheKeys.length > 0) {
            await redis.del(creditCacheKeys);
          }
          const userCacheKeys = await redis.keys(
            `cache:GET:/api/users/${request.user_id}*`
          );
          if (userCacheKeys.length > 0) {
            await redis.del(userCacheKeys);
          }
        } catch (error) {
          console.error("Ошибка очистки кэша:", error);
        }
      }
    }
    if (tripDate !== undefined) {
      updateFields.push(`trip_date = $${paramIndex++}`);
      updateValues.push(tripDate);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "Нет данных для обновления" });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE parcel_requests SET ${updateFields.join(
        ", "
      )} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    // Получаем обновленную заявку с информацией о пользователе
    const updatedRequest = await pool.query(
      `SELECT pr.*, u.username, u.first_name, u.last_name 
         FROM parcel_requests pr
         LEFT JOIN users u ON pr.user_id = u.id
         WHERE pr.id = $1`,
      [id]
    );

    // Очищаем кэш для списков заявок
    const redis = req.app.locals.redis;
    try {
      // Очищаем все кэши, связанные с заявками
      const keys = await redis.keys("cache:GET:/api/parcel-requests*");
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error("Ошибка очистки кэша:", error);
    }

    res.json(updatedRequest.rows[0]);
  } catch (error) {
    console.error("Ошибка обновления заявки:", error);
    res.status(500).json({ message: "Ошибка обновления заявки" });
  }
});

// DELETE /api/parcel-requests/:id - Удаление заявки
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.app.locals.pool;

    // Получаем заявку для проверки прав
    const request = await pool.query(
      "SELECT * FROM parcel_requests WHERE id = $1",
      [id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    // Проверяем права доступа
    if (req.user.role !== "admin" && req.user.id !== request.rows[0].user_id) {
      return res
        .status(403)
        .json({ message: "Недостаточно прав для удаления этой заявки" });
    }

    // Удаляем заявку
    await pool.query("DELETE FROM parcel_requests WHERE id = $1", [id]);

    // Очищаем кэш для списков заявок
    const redis = req.app.locals.redis;
    try {
      // Очищаем все кэши, связанные с заявками
      const keys = await redis.keys("cache:GET:/api/parcel-requests*");
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error("Ошибка очистки кэша:", error);
    }

    res.json({ message: "Заявка успешно удалена" });
  } catch (error) {
    console.error("Ошибка удаления заявки:", error);
    res.status(500).json({ message: "Ошибка удаления заявки" });
  }
});

// GET /api/parcel-requests/user/:userId - Получение заявок пользователя
router.get(
  "/user/:userId",
  authenticateToken,
  cacheMiddleware(60), // увеличиваем кэширование до 1 минуты
  async (req, res) => {
    try {
      const { userId } = req.params;
      const pool = req.app.locals.pool;

      // Проверяем права доступа
      if (req.user.role !== "admin" && req.user.id !== parseInt(userId)) {
        return res.status(403).json({
          message: "Недостаточно прав для просмотра заявок этого пользователя",
        });
      }

      const result = await pool.query(
        `SELECT pr.*, u.username, u.first_name, u.last_name 
         FROM parcel_requests pr
         LEFT JOIN users u ON pr.user_id = u.id
         WHERE pr.user_id = $1
         ORDER BY pr.created_at DESC`,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Ошибка получения заявок пользователя:", error);
      res.status(500).json({ message: "Ошибка получения заявок пользователя" });
    }
  }
);

// GET /api/parcel-requests/status/:status - Получение заявок по статусу
router.get(
  "/status/:status",
  authenticateToken,
  cacheMiddleware(60), // увеличиваем кэширование до 1 минуты
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

      const { status } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const pool = req.app.locals.pool;

      // Получаем общее количество заявок с данным статусом
      const countResult = await pool.query(
        "SELECT COUNT(*) FROM parcel_requests WHERE status = $1",
        [status]
      );
      const total = parseInt(countResult.rows[0].count);

      // Получаем заявки с пагинацией
      const requestsResult = await pool.query(
        `SELECT pr.*, u.username, u.first_name, u.last_name 
         FROM parcel_requests pr
         LEFT JOIN users u ON pr.user_id = u.id
         WHERE pr.status = $1
         ORDER BY pr.created_at DESC 
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      res.json({
        current_page: page,
        data: requestsResult.rows,
        first_page_url: `/api/parcel-requests/status/${status}?page=1&limit=${limit}`,
        from: offset + 1,
        last_page: totalPages,
        last_page_url: `/api/parcel-requests/status/${status}?page=${totalPages}&limit=${limit}`,
        next_page_url:
          page < totalPages
            ? `/api/parcel-requests/status/${status}?page=${
                page + 1
              }&limit=${limit}`
            : null,
        path: `/api/parcel-requests/status/${status}`,
        per_page: limit,
        prev_page_url:
          page > 1
            ? `/api/parcel-requests/status/${status}?page=${
                page - 1
              }&limit=${limit}`
            : null,
        to: Math.min(offset + limit, total),
        total,
      });
    } catch (error) {
      console.error("Ошибка получения заявок по статусу:", error);
      res.status(500).json({ message: "Ошибка получения заявок по статусу" });
    }
  }
);

export default router;
