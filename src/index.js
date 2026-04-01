import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// 🔗 Import semua route
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import categoryRoutes from "./routes/categories.js";
import productRoutes from "./routes/products.js";
import transactionRoutes from "./routes/transactions.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 2000;

// 🧱 Middleware
app.use(cors());
app.use(express.json());

// 📘 Konfigurasi Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Toko Elektronik",
      version: "1.0.0",
      description: "Dokumentasi Toko Elektronik by Sartika Dewi Bonowati XI RPL C",
      contact: {
        name: "Admin",
        email: "admin@tokoelektronik.com",
      },
    },
    servers: [
      {
        url: "http://localhost:2000",
        description: "Local Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    "./src/routes/transactions.js",
    "./src/routes/products.js",
    "./src/routes/categories.js",
    "./src/routes/users.js",
    "./src/routes/auth.js",
  ],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 🛣️ Daftarkan semua route
app.use("/auth", authRoutes);
app.use("/", userRoutes); // includes /profile, /register, /deactivate-user
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/transactions", transactionRoutes);

// 🏠 Default route
app.get("/", (req, res) => {
  res.send("✅ Toko Elektronik berjalan! Buka dokumentasi di /docs");
});

// 🚀 Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📘 Swagger Docs: http://localhost:${PORT}/docs`);
});