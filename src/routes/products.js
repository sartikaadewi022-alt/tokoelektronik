import express from "express";
import pool from "../db/pool.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Mengelola produk/elektronik (Admin)
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Ambil semua produk
 *     description: Ambil semua data produk dari database
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar produk berhasil diambil
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
 *                   title:
 *                     type: string
 *                     example: MacBook Air M1
 *                   author:
 *                     type: string
 *                     example: Apple Inc
 *                   publisher:
 *                     type: string
 *                     example: Apple Indonesia
 *                   year:
 *                     type: integer
 *                     example: 2023
 *                   price:
 *                     type: number
 *                     example: 12999000
 *                   stock:
 *                     type: integer
 *                     example: 6
 *                   category_id:
 *                     type: integer
 *                     example: 2
 *       401:
 *         description: Token tidak valid
 *       500:
 *         description: Kesalahan server
 */
router.get("/", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Ambil produk dengan ID yang ditentukan
 *     description: Ambil data produk berdasarkan ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID produk
 *     responses:
 *       200:
 *         description: Detail produk berhasil diambil
 *       404:
 *         description: Produk tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.get("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Simpan produk baru
 *     description: Tambahkan produk baru ke database
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: MacBook Air M2
 *               author:
 *                 type: string
 *                 example: Apple Inc
 *               publisher:
 *                 type: string
 *                 example: Apple Indonesia
 *               year:
 *                 type: integer
 *                 example: 2024
 *               price:
 *                 type: number
 *                 example: 15999000
 *               stock:
 *                 type: integer
 *                 example: 10
 *               category_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Produk berhasil ditambahkan
 *       400:
 *         description: Data tidak valid
 *       500:
 *         description: Kesalahan server
 */
router.post("/", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const { title, author, publisher, year, price, stock, category_id } = req.body;
    const result = await pool.query(
      "INSERT INTO products (title, author, publisher, year, price, stock, category_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [title, author, publisher, year, price, stock, category_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Ubah produk yang ada dengan ID yang ditentukan
 *     description: Perbarui data produk berdasarkan ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID produk
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: MacBook Air M2
 *               author:
 *                 type: string
 *                 example: Apple Inc
 *               publisher:
 *                 type: string
 *                 example: Apple Indonesia
 *               year:
 *                 type: integer
 *                 example: 2024
 *               price:
 *                 type: number
 *                 example: 15999000
 *               stock:
 *                 type: integer
 *                 example: 5
 *               category_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Produk berhasil diperbarui
 *       404:
 *         description: Produk tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, publisher, year, price, stock, category_id } = req.body;
    const result = await pool.query(
      "UPDATE products SET title=$1, author=$2, publisher=$3, year=$4, price=$5, stock=$6, category_id=$7 WHERE id=$8 RETURNING *",
      [title, author, publisher, year, price, stock, category_id, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete an existing product by specified ID
 *     description: Hapus data produk berdasarkan ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID produk
 *     responses:
 *       200:
 *         description: Produk berhasil dihapus
 *       404:
 *         description: Produk tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.delete("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM products WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.json({ message: "Produk berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;