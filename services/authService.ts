export type UserRole = "admin" | "user";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: AuthUser | null;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data.user ?? null;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "登录失败");
  }
  return data.user as AuthUser;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export interface AdminUser extends AuthUser {}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await fetch("/api/admin/users", {
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "获取用户列表失败");
  }
  return data.users as AdminUser[];
}

export async function createUserApi(payload: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<AdminUser> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "创建用户失败");
  }
  return data.user as AdminUser;
}

export async function updateUserApi(
  id: number,
  payload: Partial<{ username: string; role: UserRole; is_active: boolean }>
): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "更新用户失败");
  }
  return data.user as AdminUser;
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "重置密码失败");
  }
}

export async function deleteUserApi(id: number): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "删除用户失败");
  }
}

export async function changeMyPassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await fetch("/api/user/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "修改密码失败");
  }
}

