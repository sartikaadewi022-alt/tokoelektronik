import express from "express";
import pool from "../db/pool.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Mengelola transaksi pembelian elektronik (Kasir)
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Ambil semua transaksi
 *     description: Ambil semua data transaksi (hanya kasir)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar transaksi berhasil diambil
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
 *                   customer:
 *                     type: string
 *                     example: Budi Santoso
 *                   total_harga:
 *                     type: number
 *                     example: 250000
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-10-14T09:00:00.000Z"
 *       401:
 *         description: Token tidak valid
 *       500:
 *         description: Kesalahan server
 */
router.get("/", authenticateToken, authorizeRole(["kasir"]), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         t.id,
         c.nama AS customer,
         SUM(ti.quantity * p.price) AS total_harga,
         t.created_at
       FROM transactions t
       JOIN customers c ON t.customer_id = c.id
       JOIN transaction_items ti ON ti.transaction_id = t.id
       JOIN products p ON ti.product_id = p.id
       GROUP BY t.id, c.nama, t.created_at
       ORDER BY t.id DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Ambil transaksi dengan ID yang ditentukan
 *     description: Ambil detail transaksi berdasarkan ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID transaksi
 *     responses:
 *       200:
 *         description: Detail transaksi berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 3
 *                 customer:
 *                   type: string
 *                   example: Siti Aminah
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product:
 *                         type: string
 *                         example: Laskar Pelangi
 *                       quantity:
 *                         type: integer
 *                         example: 2
 *                       price:
 *                         type: number
 *                         example: 85000
 *                 total_harga:
 *                   type: number
 *                   example: 170000
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.get("/:id", authenticateToken, authorizeRole(["kasir"]), async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await pool.query(
      `SELECT t.id, c.nama AS customer, t.created_at
       FROM transactions t
       JOIN customers c ON t.customer_id = c.id
       WHERE t.id = $1`,
      [id]
    );
    if (transaction.rows.length === 0)
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });

    const items = await pool.query(
      `SELECT p.title AS product, ti.quantity, ti.price
       FROM transaction_items ti
       JOIN products p ON ti.product_id = p.id
       WHERE ti.transaction_id = $1`,
      [id]
    );

    const total_harga = items.rows.reduce((sum, item) => sum + item.quantity * item.price, 0);

    res.json({
      id: transaction.rows[0].id,
      customer: transaction.rows[0].customer,
      created_at: transaction.rows[0].created_at,
      total_harga,
      items: items.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Simpan transaksi baru
 *     description: Tambah transaksi baru oleh kasir atau admin
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 2
 *                     quantity:
 *                       type: integer
 *                       example: 3
 *     responses:
 *       201:
 *         description: Transaksi berhasil dibuat
 *       400:
 *         description: Stok tidak cukup atau data tidak valid
 */
router.post("/", authenticateToken, authorizeRole(["kasir"]), async (req, res) => {
  const { customer_id, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const transaction = await client.query(
      `INSERT INTO transactions (customer_id, created_at)
       VALUES ($1, NOW()) RETURNING id`,
      [customer_id]
    );

    const transaction_id = transaction.rows[0].id;

    for (const item of items) {
      const { product_id, quantity } = item;
      const product = await client.query("SELECT price, stock FROM products WHERE id=$1", [product_id]);
      if (product.rows.length === 0) throw new Error("Produk tidak ditemukan");

      const price = product.rows[0].price;
      const stock = product.rows[0].stock;
      if (stock < quantity) throw new Error(`Stok tidak cukup untuk produk ID ${product_id}`);

      await client.query(
        `INSERT INTO transaction_items (transaction_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [transaction_id, product_id, quantity, price]
      );
      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [quantity, product_id]);
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Transaksi berhasil dibuat", transaction_id });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Ubah transaksi yang ada dengan ID yang ditentukan
 *     description: Update transaksi (ubah customer atau item transaksi)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID transaksi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 2
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 3
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       200:
 *         description: Transaksi berhasil diperbarui
 *       400:
 *         description: Data tidak valid
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.put("/:id", authenticateToken, authorizeRole(["kasir"]), async (req, res) => {
  const { id } = req.params;
  const { customer_id, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    if (customer_id) {
      await client.query(`UPDATE transactions SET customer_id = $1 WHERE id = $2`, [customer_id, id]);
    }

    const oldItems = await client.query(`SELECT * FROM transaction_items WHERE transaction_id = $1`, [id]);
    for (const item of oldItems.rows) {
      await client.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [item.quantity, item.product_id]);
    }

    await client.query("DELETE FROM transaction_items WHERE transaction_id = $1", [id]);

    for (const item of items) {
      const { product_id, quantity } = item;
      const product = await client.query("SELECT price, stock FROM products WHERE id=$1", [product_id]);
      if (product.rows.length === 0) throw new Error("Produk tidak ditemukan");

      const price = product.rows[0].price;
      const stock = product.rows[0].stock;
      if (stock < quantity) throw new Error(`Stok tidak cukup untuk produk ID ${product_id}`);

      await client.query(
        `INSERT INTO transaction_items (transaction_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [id, product_id, quantity, price]
      );
      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [quantity, product_id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Transaksi berhasil diperbarui" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/:id", authenticateToken, authorizeRole(["kasir"]), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const items = await client.query("SELECT * FROM transaction_items WHERE transaction_id = $1", [id]);
    for (const item of items.rows) {
      await client.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [item.quantity, item.product_id]);
    }

    const deleteTrans = await client.query("DELETE FROM transactions WHERE id = $1 RETURNING *", [id]);
    if (deleteTrans.rows.length === 0)
      throw new Error("Transaksi tidak ditemukan");

    await client.query("DELETE FROM transaction_items WHERE transaction_id = $1", [id]);
    await client.query("COMMIT");

    res.json({ message: "Transaksi berhasil dihapus" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router; 