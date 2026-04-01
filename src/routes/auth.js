import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";
import {
  authenticateToken,
  blacklistedAccessTokens,
  blacklistedRefreshTokens,
} from "../middleware/auth.js";

const router = express.Router();
const ACCESS_SECRET = process.env.JWT_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

// Simpan refresh token aktif
let refreshTokens = [];

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoint autentikasi pengguna (Admin & Kasir)
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login dan dapatkan Access Token & Refresh Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login berhasil
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User tidak ditemukan" });

    const user = result.rows[0];
    if (!user.active)
      return res.status(403).json({ message: "User dinonaktifkan" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ message: "Password salah" });

    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    refreshTokens.push(refreshToken);

    res.json({
      message: "Login berhasil",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Perbarui Access Token menggunakan Refresh Token
 *     description: Gunakan refresh token dari hasil login untuk mendapatkan access token baru.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token baru berhasil dibuat
 *       403:
 *         description: Refresh token tidak valid
 */
router.post("/refresh-token", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: "Token tidak ditemukan" });

  // Cek apakah token valid dan belum di-blacklist
  if (!refreshTokens.includes(token) || blacklistedRefreshTokens.includes(token)) {
    return res.status(403).json({ message: "Refresh token tidak valid" });
  }

  jwt.verify(token, REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token kadaluarsa" });

    const newAccessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Token baru berhasil dibuat",
      accessToken: newAccessToken,
    });
  });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout dan hapus refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logout berhasil
 */
router.post("/logout", (req, res) => {
  const { accessToken, refreshToken } = req.body;

  if (!accessToken && !refreshToken) {
    return res.status(400).json({ message: "Access token dan refresh token wajib dikirim" });
  }

  // Masukkan ke blacklist
  if (accessToken) blacklistedAccessTokens.push(accessToken);
  if (refreshToken) blacklistedRefreshTokens.push(refreshToken);

  // Hapus dari daftar refresh aktif
  refreshTokens = refreshTokens.filter((t) => t !== refreshToken);

  res.json({ message: "Logout berhasil. Semua token telah dinonaktifkan." });
});

export default router;