import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createClient } from "redis";
import { Pool } from "pg";

// Импорт роутов
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import parcelRoutes from "./routes/parcelRequests.js";
import creditRoutes from "./routes/credits.js";
import adminStatsRouter from "./routes/adminStats.js";
import adminAuthRouter from "./routes/adminAuth.js";

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Подключение к Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

// Подключение к PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "parcel_delivery",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
  // Настройки для высоких нагрузок
  max: parseInt(process.env.DB_POOL_MAX) || 50, // Максимум соединений
  min: parseInt(process.env.DB_POOL_MIN) || 10, // Минимум соединений
  idleTimeoutMillis: 30000, // 30 секунд
  connectionTimeoutMillis: 2000, // 2 секунды
  acquireTimeoutMillis: 5000, // 5 секунд
  reapIntervalMillis: 1000, // Проверка каждую секунду
  createTimeoutMillis: 3000, // Таймаут создания соединения
  destroyTimeoutMillis: 5000, // Таймаут уничтожения соединения
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://383c38297b01.ngrok-free.app",
      "https://3da717f601a7.ngrok-free.app",
    ],
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting для высоких нагрузок
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: parseInt(process.env.RATE_LIMIT_MAX) || 2000, // 2000 запросов с одного IP
  message: "Слишком много запросов с этого IP, попробуйте позже.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});
app.use("/api/", limiter);

// Глобальные переменные для доступа к БД и Redis
app.locals.pool = pool;
app.locals.redis = redisClient;

// Роуты
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/parcel-requests", parcelRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/admin", adminAuthRouter);
app.use("/api/admin", adminStatsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      redis: redisClient.isReady ? "connected" : "disconnected",
    },
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Внутренняя ошибка сервера",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Маршрут не найден" });
});

// Запуск сервера
const startServer = async () => {
  try {
    await redisClient.connect();
    await pool.query("SELECT NOW()"); // Проверка подключения к БД

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Ошибка запуска сервера:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Получен SIGTERM, закрытие сервера...");
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Получен SIGINT, закрытие сервера...");
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

export default app;
