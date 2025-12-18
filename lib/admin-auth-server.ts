// サーバー側での管理者セッション検証

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）

interface SessionData {
  timestamp: number;
  expiresAt: number;
}

/**
 * サーバー側でセッションの有効性を検証
 * @param sessionData クライアント側から送信されたセッションデータ
 * @returns セッションが有効かどうか
 */
export function verifyAdminSession(sessionData: SessionData | null): boolean {
  if (!sessionData) return false;
  
  const now = Date.now();
  
  // セッションが有効期限内か確認
  if (now > sessionData.expiresAt) {
    return false;
  }
  
  // タイムスタンプが妥当か確認（24時間以内）
  const timeSinceCreation = now - sessionData.timestamp;
  if (timeSinceCreation > SESSION_DURATION * 2) {
    // 作成から48時間以上経過している場合は無効
    return false;
  }
  
  return true;
}
