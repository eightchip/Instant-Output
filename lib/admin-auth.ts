// 管理者認証機能

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("admin_authenticated") === "true";
}

export function setAdminAuthenticated(authenticated: boolean): void {
  if (typeof window === "undefined") return;
  if (authenticated) {
    sessionStorage.setItem("admin_authenticated", "true");
  } else {
    sessionStorage.removeItem("admin_authenticated");
  }
}

