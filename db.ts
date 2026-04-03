import Database from "better-sqlite3";
import path from "path";

export type UserRole = "admin" | "user";

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const dbPath = path.join(process.cwd(), "users.db");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function getUserByUsername(username: string): User | undefined {
  const stmt = db.prepare<User>("SELECT * FROM users WHERE username = ?");
  return stmt.get(username);
}

export function getUserById(id: number): User | undefined {
  const stmt = db.prepare<User>("SELECT * FROM users WHERE id = ?");
  return stmt.get(id);
}

export function createUser(username: string, password_hash: string, role: UserRole = "user"): User {
  const stmt = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
  const info = stmt.run(username, password_hash, role);
  return getUserById(Number(info.lastInsertRowid)) as User;
}

export function updateUser(
  id: number,
  fields: Partial<Pick<User, "username" | "role" | "is_active" | "password_hash">>
): User | undefined {
  const sets: string[] = [];
  const values: any[] = [];

  if (fields.username !== undefined) {
    sets.push("username = ?");
    values.push(fields.username);
  }
  if (fields.role !== undefined) {
    sets.push("role = ?");
    values.push(fields.role);
  }
  if (fields.is_active !== undefined) {
    sets.push("is_active = ?");
    values.push(fields.is_active ? 1 : 0);
  }
  if (fields.password_hash !== undefined) {
    sets.push("password_hash = ?");
    values.push(fields.password_hash);
  }

  if (sets.length === 0) {
    return getUserById(id);
  }

  sets.push("updated_at = datetime('now')");

  const sql = `UPDATE users SET ${sets.join(", ")} WHERE id = ?`;
  values.push(id);

  const stmt = db.prepare(sql);
  stmt.run(...values);

  return getUserById(id);
}

export function deleteUser(id: number): void {
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  stmt.run(id);
}

export function listUsers(): User[] {
  const stmt = db.prepare<User>("SELECT * FROM users ORDER BY id ASC");
  return stmt.all();
}

export function countUsers(): number {
  const stmt = db.prepare<{ count: number }>("SELECT COUNT(*) as count FROM users");
  const row = stmt.get();
  return row?.count ?? 0;
}

