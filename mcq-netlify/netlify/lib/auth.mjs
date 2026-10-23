import crypto from "node:crypto";
import { pool } from "./db.mjs";

const TZ = "Africa/Gaborone";
const TZ_OFFSET_HOURS = 2; // Gaborone is UTC+2 all year (no daylight saving)
export const COOKIE = "sydschool_session";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

/* ---------- Calendar-year rule ---------- */
export function currentYear(date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric" }).format(date));
}

// Unix seconds for 00:00 on 1 January of the following year (local time)
export function yearEndSeconds(year) {
  return Math.floor((Date.UTC(year + 1, 0, 1) - TZ_OFFSET_HOURS * 3600 * 1000) / 1000);
}

/* ---------- Signed session token ---------- */
function secret() {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 16) throw new Error("SESSION_SECRET is missing or shorter than 16 characters");
  return s;
}
const sign = (data) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function makeToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(token) {
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p || typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

/* ---------- Password hashing (built-in scrypt) ---------- */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password, stored) {
  const [alg, saltB64, hashB64] = String(stored).split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/* ---------- Cookies ---------- */
export function getCookie(req, name) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

const FLAGS = "Path=/; HttpOnly; Secure; SameSite=Lax";
export const sessionCookie = (token, maxAgeSeconds) =>
  `${COOKIE}=${token}; Max-Age=${maxAgeSeconds}; ${FLAGS}`;
export const clearCookie = () => `${COOKIE}=; Max-Age=0; ${FLAGS}`;

/* ---------- Session checks ---------- */
const MESSAGES = {
  none: "Please log in.",
  expired: "Your credentials have expired. Please ask your teacher for new ones.",
  device: "You were signed out because this account is in use on another device. Please log in again.",
};

export function unauthorized(reason = "none") {
  return json({ error: MESSAGES[reason] || MESSAGES.none, reason }, 401, {
    "Set-Cookie": clearCookie(),
  });
}

export async function getSession(req) {
  const token = getCookie(req, COOKIE);
  if (!token) return { reason: "none" };
  const p = readToken(token);
  if (!p) return { reason: "none" };

  const { rows } = await pool.query(
    "SELECT id, username, created_year, device_id FROM users WHERE id = $1",
    [p.uid]
  );
  const u = rows[0];
  if (!u) return { reason: "none" };
  if (u.created_year !== currentYear()) return { reason: "expired" };
  if (u.device_id !== p.did) return { reason: "device" };
  return { user: u, deviceId: p.did };
}

export async function requireUser(req) {
  const s = await getSession(req);
  if (!s.user) return { response: unauthorized(s.reason) };
  return s;
}

/* ---------- Admin password ---------- */
export async function requireAdmin(req) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (real.length < 8) {
    console.error("ADMIN_PASSWORD is missing or shorter than 8 characters");
    return json({ error: "Admin password is not set up on the server yet." }, 500);
  }
  const given = req.headers.get("x-admin-password") || "";
  const h = (s) => crypto.createHash("sha256").update(s).digest();
  if (!crypto.timingSafeEqual(h(given), h(real))) {
    await sleep(600);
    return json({ error: "Wrong admin password." }, 401);
  }
  return null;
}