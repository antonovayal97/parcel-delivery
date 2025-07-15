import express from "express";
const router = express.Router();
import { authenticateToken, requireRole } from "../middleware/auth.js";

router.get(
  "/stats",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;

      // Количество пользователей
      const usersResult = await pool.query("SELECT COUNT(*) FROM users");
      const users = parseInt(usersResult.rows[0].count);

      // Количество заявок/посылок
      const parcelsResult = await pool.query(
        "SELECT COUNT(*) FROM parcel_requests"
      );
      const parcels = parseInt(parcelsResult.rows[0].count);

      res.json({
        users,
        parcels,
      });
    } catch (error) {
      console.error("Ошибка получения статистики:", error);
      res.status(500).json({ message: "Ошибка получения статистики" });
    }
  }
);

export default router;
