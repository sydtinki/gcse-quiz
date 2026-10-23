import { pool } from "../lib/db.mjs";
import { json, requireAdmin, hashPassword, currentYear } from "../lib/auth.mjs";

const USERNAME_RE = /^[a-z0-9._-]{3,50}$/;
const MAX_PER_BATCH = 50;

async function listUsers() {
  const { rows } = await pool.query(
    `SELECT id, username, created_year, created_at, (device_id IS NOT NULL) AS device_in_use
     FROM users ORDER BY created_at DESC, id DESC`
  );
  const year = currentYear();
  return json({
    year,
    users: rows.map((r) => ({
      id: r.id,
      username: r.username,
      created_year: r.created_year,
      expired: r.created_year !== year,
      device_in_use: r.device_in_use,
    })),
  });
}

async function createUsers(req) {
  let body = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const lines = String(body.lines ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) return json({ error: "Enter at least one line: username,password" }, 400);
  if (lines.length > MAX_PER_BATCH) return json({ error: `Please add at most ${MAX_PER_BATCH} accounts at a time.` }, 400);

  const year = currentYear();
  let created = 0;
  const problems = [];

  for (const line of lines) {
    const i = line.search(/[,\t]/);
    if (i < 1) { problems.push(`"${line}": use the format username,password`); continue; }
    const username = line.slice(0, i).trim().toLowerCase();
    const password = line.slice(i + 1).trim();

    if (!USERNAME_RE.test(username)) { problems.push(`${username}: username must be 3-50 letters, numbers, . _ or -`); continue; }
    if (password.length < 6 || password.length > 100) { problems.push(`${username}: password must be 6-100 characters`); continue; }

    const r = await pool.query(
      `INSERT INTO users (username, password_hash, created_year)
       VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING`,
      [username, hashPassword(password), year]
    );
    if (r.rowCount === 1) created++;
    else problems.push(`${username}: username already exists`);
  }
  return json({ created, problems, year });
}

async function userAction(req, action) {
  let body = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const id = Number(body.id);
  if (!Number.isInteger(id)) return json({ error: "Missing user id." }, 400);

  if (action === "reset") await pool.query("UPDATE users SET device_id = NULL WHERE id = $1", [id]);
  else await pool.query("DELETE FROM users WHERE id = $1", [id]);
  return json({ ok: true });
}

export default async (req) => {
  const path = new URL(req.url).pathname;
  try {
    const denied = await requireAdmin(req);
    if (denied) return denied;

    if (path === "/api/admin/users" && req.method === "GET") return await listUsers();
    if (path === "/api/admin/users" && req.method === "POST") return await createUsers(req);
    if (path === "/api/admin/reset-device" && req.method === "POST") return await userAction(req, "reset");
    if (path === "/api/admin/delete-user" && req.method === "POST") return await userAction(req, "delete");
    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error. Please try again." }, 500);
  }
};

export const config = {
  path: ["/api/admin/users", "/api/admin/reset-device", "/api/admin/delete-user"],
};