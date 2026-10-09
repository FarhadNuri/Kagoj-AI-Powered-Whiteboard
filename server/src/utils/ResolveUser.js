import { query } from "../config/db.js";
import * as neonAuth from "../config/neonAuth.js";
import ApiError from "./apiError.js";

export const resolveUserFromToken = async (token) => {
  const parts = String(token).split(".");
  let email = "";
  let name = "";

  // 1. If it's a signed JWT (3 parts)
  if (parts.length === 3) {
    try {
      const claims = await neonAuth.verify(token);
      email = String(claims.email || "").trim().toLowerCase();
      name = String(claims.name || claims.email || "User").trim();
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      throw ApiError.unauthorized("Invalid or expired token");
    }
  } else {
    // 2. If it's an opaque session token, query neon_auth schema
    try {
      const sessionRes = await query(
        `SELECT u.name, u.email
         FROM neon_auth."session" s
         JOIN neon_auth."user" u ON s."userId" = u.id
         WHERE s.token = $1 AND s."expiresAt" > NOW()`,
        [token]
      );

      if (sessionRes.rows.length === 0) {
        throw ApiError.unauthorized("Invalid or expired session token");
      }

      email = String(sessionRes.rows[0].email || "").trim().toLowerCase();
      name = String(sessionRes.rows[0].name || email || "User").trim();
    } catch (dbErr) {
      console.error("DB neon_auth session lookup error:", dbErr.message);
      throw ApiError.unauthorized("Invalid or expired token");
    }
  }

  if (!email) {
    throw ApiError.unauthorized("User has no email associated with this token");
  }

  // 3. Upsert user into your custom `public.users` table
  const { rows } = await query(
    `INSERT INTO users (name, email)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email, name`,
    [name, email]
  );

  return { id: rows[0].id, email: rows[0].email, name: rows[0].name };
};