import express from "express";
import pool from "../db/pool.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Mengelola kategori elektronik (Admin)
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Ambil semua kategori elektronik
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar semua kategori elektronik berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Laptop
 *       401:
 *         description: Token tidak valid
 *       500:
 *         description: Kesalahan server
 */
router.get("/", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Ambil detail kategori berdasarkan ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kategori
 *     responses:
 *       200:
 *         description: Detail kategori berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       404:
 *         description: Kategori tidak ditemukan
 */
router.get("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM categories WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Tambah kategori elektronik baru
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: PC
 *     responses:
 *       201:
 *         description: Kategori berhasil ditambahkan
 *       400:
 *         description: Data tidak valid
 */
router.post("/", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json({ message: "Kategori berhasil ditambahkan", category: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update kategori elektronik berdasarkan ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kategori
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: PC
 *     responses:
 *       200:
 *         description: Kategori berhasil diperbarui
 *       404:
 *         description: Kategori tidak ditemukan
 */
router.put("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query(
      "UPDATE categories SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    res.json({ message: "Kategori berhasil diperbarui", category: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Hapus kategori elektronik berdasarkan ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kategori
 *     responses:
 *       200:
 *         description: Kategori berhasil dihapus
 *       404:
 *         description: Kategori tidak ditemukan
 *       409:
 *         description: Tidak bisa dihapus karena masih digunakan oleh produk
 */
router.delete("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    // Periksa apakah kategori masih digunakan oleh produk
    const productCheck = await pool.query("SELECT * FROM products WHERE category_id = $1", [id]);
    if (productCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Kategori tidak bisa dihapus karena masih digunakan oleh produk.",
      });
    }

    const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Kategori tidak ditemukan" });

    res.json({ message: "Kategori berhasil dihapus" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;