import jwt from "jsonwebtoken";
import crypto from "crypto";

// Валидация Telegram WebApp данных
export const validateTelegramData = (initData) => {
  if (!initData) {
    throw new Error("Отсутствуют данные инициализации Telegram");
  }

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");

  if (!hash) {
    throw new Error("Отсутствует хеш в данных Telegram");
  }

  // Удаляем хеш из данных для проверки
  urlParams.delete("hash");

  // Сортируем параметры
  const params = Array.from(urlParams.entries()).sort();
  const dataCheckString = params
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Создаем секретный ключ
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.BOT_TOKEN || "")
    .digest();

  // Вычисляем хеш
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    throw new Error("Неверная подпись данных Telegram");
  }

  return true;
};

// Middleware для проверки JWT токена
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Токен доступа отсутствует" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your-secret-key",
    (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Недействительный токен" });
      }
      req.user = user;
      next();
    }
  );
};

// Middleware для проверки роли пользователя
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Требуется аутентификация" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    next();
  };
};

// Middleware для кэширования в Redis
export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const redis = req.app.locals.redis;

    // Создаем ключ кэша с учетом всех параметров запроса
    const cacheKey = `cache:${req.method}:${req.originalUrl}:${JSON.stringify(
      req.query
    )}:${req.user?.id || "anonymous"}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Перехватываем ответ для кэширования
      const originalSend = res.json;
      res.json = function (data) {
        redis.setEx(cacheKey, duration, JSON.stringify(data));
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Ошибка кэширования:", error);
      next();
    }
  };
};

// Middleware для rate limiting по пользователю
export const userRateLimit = (windowMs = 15 * 60 * 1000, max = 200) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const redis = req.app.locals.redis;
    const key = `ratelimit:user:${req.user.id}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }

      if (current > max) {
        return res.status(429).json({
          message: "Слишком много запросов, попробуйте позже",
        });
      }

      next();
    } catch (error) {
      console.error("Ошибка rate limiting:", error);
      next();
    }
  };
};
