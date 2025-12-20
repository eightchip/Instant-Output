// ユーザー認証機能（クライアント側）

const AUTH_TOKEN_KEY = "auth_token";
const USER_KEY = "user_data";

interface UserData {
  id: string;
  email: string;
}

/**
 * 認証トークンを保存
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * 認証トークンを取得
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * 認証トークンを削除
 */
export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * ユーザーデータを保存
 */
export function setUserData(user: UserData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * ユーザーデータを取得
 */
export function getUserData(): UserData | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 認証されているかどうかを確認
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * API呼び出し用のヘッダーを取得
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}
