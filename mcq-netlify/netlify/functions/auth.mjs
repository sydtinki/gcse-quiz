import { pool } from "../lib/db.mjs";
import {
  json, sleep, currentYear, yearEndSeconds, makeToken, verifyPassword,
  sessionCookie, clearCookie, getSession, unauthorized,
} from "../lib/auth.mjs";

const DEVICE_RE = /^[A-Za-z0-9-]{16,64}$/;

async function login(req) {
  let body = {};
  try { body = await req.json(); } catch { /* empty body */ }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const deviceId = String(body.deviceId ?? "");

  if (!username || !password) return json({ error: "Enter your username and password." }, 400);
  if (!DEVICE_RE.test(deviceId)) return json({ error: "Could not identify this device. Please refresh the page." }, 400);

  const { rows } = await pool.query(
    "SELECT id, username, password_hash, created_year FROM users WHERE username = $1",
    [username]
  );
  const u = rows[0];

  if (!u || !verifyPassword(password, u.password_hash)) {
    await sleep(600); // slows down password guessing
    return json({ error: "Incorrect username or password." }, 401);
  }

  const year = currentYear();
  if (u.created_year !== year) {
    return json({ error: "These credentials have expired. Please ask your teacher for new ones." }, 403);
  }

  // One device at a time: bind the account to this device (atomic).
  const bound = await pool.query(
    "UPDATE users SET device_id = $2 WHERE id = $1 AND (device_id IS NULL OR device_id = $2)",
    [u.id, deviceId]
  );
  if (bound.rowCount === 0) {
    return json({
      error: "This account is already in use on another device. Log out there first, or ask your teacher to reset it.",
    }, 403);
  }

  const exp = yearEndSeconds(u.created_year);
  const token = makeToken({ uid: u.id, did: deviceId, exp });
  const maxAge = Math.max(exp - Math.floor(Date.now() / 1000), 0);
  return json({ ok: true, username: u.username }, 200, { "Set-Cookie": sessionCookie(token, maxAge) });
}

async function logout(req) {
  const s = await getSession(req);
  if (s.user) {
    // Free the device so the account can be used elsewhere.
    await pool.query("UPDATE users SET device_id = NULL WHERE id = $1 AND device_id = $2", [s.user.id, s.deviceId]);
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}

async function me(req) {
  const s = await getSession(req);
  if (!s.user) return unauthorized(s.reason);
  return json({ username: s.user.username, validUntil: `31 December ${s.user.created_year}` });
}

export default async (req) => {
  const path = new URL(req.url).pathname;
  try {
    if (path === "/api/login" && req.method === "POST") return await login(req);
    if (path === "/api/logout" && req.method === "POST") return await logout(req);
    if (path === "/api/me" && req.method === "GET") return await me(req);
    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error. Please try again." }, 500);
  }
};

export const config = { path: ["/api/login", "/api/logout", "/api/me"] };