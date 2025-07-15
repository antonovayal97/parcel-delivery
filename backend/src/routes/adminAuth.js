const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Получаем логин и пароль из .env
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "yourpassword";

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ message: "Неверный логин или пароль" });
  }

  // Генерируем JWT
  const token = jwt.sign(
    { username: adminUsername, role: "admin" },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "12h" }
  );

  res.json({ token });
});

module.exports = router;
