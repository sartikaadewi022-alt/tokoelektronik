import express from "express";
import pool from "../db/pool.js";
import bcrypt from "bcrypt";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

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
 *   name: User Management
 *   description: Mengelola akun pengguna (Admin)
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Ambil profil pengguna yang sedang login
 *     description: Ambil profil user berdasarkan token JWT yang digunakan saat login.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil pengguna berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: admin
 *                 role:
 *                   type: string
 *                   example: admin
 *                 active:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Token tidak valid atau belum login
 *       404:
 *         description: User tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.get("/profile", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role, active FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "User tidak ditemukan" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Simpan pengguna baru
 *     description: Tambah pengguna baru (hanya bisa dilakukan oleh admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: kasir1
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [admin, kasir]
 *                 example: kasir
 *     responses:
 *       201:
 *         description: Pengguna baru berhasil ditambahkan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User berhasil didaftarkan
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     username:
 *                       type: string
 *                       example: kasir1
 *                     role:
 *                       type: string
 *                       example: kasir
 *       400:
 *         description: Username sudah digunakan atau data tidak valid
 *       500:
 *         description: Kesalahan server
 */
router.post("/register", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const userExist = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userExist.rows.length > 0)
      return res.status(400).json({ message: "Username sudah digunakan" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password, role, active) VALUES ($1, $2, $3, TRUE) RETURNING id, username, role",
      [username, hashedPassword, role]
    );

    res.status(201).json({ message: "User berhasil didaftarkan", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /deactivate-user:
 *   put:
 *     summary: Nonaktifkan pengguna yang ada dengan ID yang ditentukan
 *     description: Nonaktifkan pengguna berdasarkan ID (hanya admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Pengguna berhasil dinonaktifkan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User berhasil dinonaktifkan
 *       404:
 *         description: User tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put("/deactivate-user", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.body;
    const result = await pool.query(
      "UPDATE users SET active = FALSE WHERE id = $1 RETURNING id, username",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "User tidak ditemukan" });
    res.json({ message: "User berhasil dinonaktifkan", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 