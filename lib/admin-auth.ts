// 管理者認証機能

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）
const ADMIN_SESSION_KEY = "admin_session";

interface AdminSession {
  authenticated: boolean;
  timestamp: number;
  expiresAt: number;
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * 管理者セッションが有効かどうかを確認
 * 24時間有効、アクティビティがある場合は自動延長
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return false;
    
    const session: AdminSession = JSON.parse(sessionData);
    const now = Date.now();
    
    // セッションが有効期限内か確認
    if (now > session.expiresAt) {
      // セッションが期限切れ
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    
    // アクティビティがある場合は自動延長（残り時間が12時間以下の場合）
    const timeUntilExpiry = session.expiresAt - now;
    if (timeUntilExpiry < 12 * 60 * 60 * 1000) {
      // 12時間以下なら24時間延長
      session.expiresAt = now + SESSION_DURATION;
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    }
    
    return session.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * 管理者認証状態を設定
 * @param authenticated 認証状態
 * @param extendSession 既存セッションを延長するか（デフォルト: false）
 */
export function setAdminAuthenticated(authenticated: boolean, extendSession: boolean = false): void {
  if (typeof window === "undefined") return;
  
  if (authenticated) {
    const now = Date.now();
    const session: AdminSession = {
      authenticated: true,
      timestamp: now,
      expiresAt: extendSession && isAdminAuthenticated() 
        ? Date.now() + SESSION_DURATION // 既存セッションを延長
        : now + SESSION_DURATION, // 新規セッション
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

/**
 * セッションの残り時間を取得（時間単位）
 */
export function getSessionTimeRemaining(): number {
  if (typeof window === "undefined") return 0;
  
  try {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return 0;
    
    const session: AdminSession = JSON.parse(sessionData);
    const now = Date.now();
    const remaining = session.expiresAt - now;
    
    return Math.max(0, Math.floor(remaining / (60 * 60 * 1000))); // 時間単位
  } catch {
    return 0;
  }
}

/**
 * セッションを手動で延長（24時間追加）
 */
export function extendAdminSession(): void {
  if (typeof window === "undefined") return;
  
  try {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return;
    
    const session: AdminSession = JSON.parse(sessionData);
    session.expiresAt = Date.now() + SESSION_DURATION;
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch {
    // エラー時は何もしない
  }
}

/**
 * セッションデータを取得（APIルートでの認証用）
 * クライアント側からセッション情報を送信し、サーバー側で検証する
 */
export function getSessionData(): { timestamp: number; expiresAt: number } | null {
  if (typeof window === "undefined") return null;
  
  try {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return null;
    
    const session: AdminSession = JSON.parse(sessionData);
    return {
      timestamp: session.timestamp,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

