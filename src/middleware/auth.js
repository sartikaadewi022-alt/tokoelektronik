import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

// === Token blacklist (disimpan sementara di memori) ===
export let blacklistedAccessTokens = [];
export let blacklistedRefreshTokens = [];

/**
 * Middleware untuk verifikasi token akses (access token)
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  // Periksa apakah token sudah di-blacklist
  if (blacklistedAccessTokens.includes(token)) {
    return res.status(403).json({ message: "Token tidak valid (sudah logout)" });
  }

  jwt.verify(token, ACCESS_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token tidak valid" });
    req.user = user;
    next();
  });
}

/**
 * Middleware untuk membatasi role pengguna
 */
export function authorizeRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    next();
  };
}

/**
 * Fungsi opsional untuk menambahkan token ke daftar blacklist
 */
export function addToBlacklist(accessToken, refreshToken) {
  if (accessToken) blacklistedAccessTokens.push(accessToken);
  if (refreshToken) blacklistedRefreshTokens.push(refreshToken);
} 