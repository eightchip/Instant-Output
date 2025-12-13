// SRS（Spaced Repetition System）設定管理

export interface SRSConfig {
  okMultiplier: number; // OKの場合の間隔倍率（デフォルト: 1.5）
  maybeMultiplier: number; // MAYBEの場合の間隔倍率（デフォルト: 0.5）
  ngInterval: number; // NGの場合の間隔（日数、デフォルト: 1）
  minInterval: number; // 最小間隔（日数、デフォルト: 1）
  maxInterval: number; // 最大間隔（日数、デフォルト: 30）
  initialInterval: number; // 初回学習の間隔（日数、デフォルト: 1）
}

const DEFAULT_CONFIG: SRSConfig = {
  okMultiplier: 1.5,
  maybeMultiplier: 0.5,
  ngInterval: 1,
  minInterval: 1,
  maxInterval: 30,
  initialInterval: 1,
};

const STORAGE_KEY = "srs_config";

/**
 * SRS設定を取得（デフォルト値を使用）
 */
export function getSRSConfig(): SRSConfig {
  if (typeof window === "undefined") {
    return DEFAULT_CONFIG;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // デフォルト値とマージして、不足している項目を補完
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load SRS config:", error);
  }

  return DEFAULT_CONFIG;
}

/**
 * SRS設定を保存
 */
export function saveSRSConfig(config: SRSConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    // バリデーション
    const validated: SRSConfig = {
      okMultiplier: Math.max(1.0, Math.min(5.0, config.okMultiplier)),
      maybeMultiplier: Math.max(0.1, Math.min(1.0, config.maybeMultiplier)),
      ngInterval: Math.max(1, Math.min(30, config.ngInterval)),
      minInterval: Math.max(1, Math.min(30, config.minInterval)),
      maxInterval: Math.max(1, Math.min(365, config.maxInterval)),
      initialInterval: Math.max(1, Math.min(30, config.initialInterval)),
    };

    // minInterval <= maxInterval を保証
    if (validated.minInterval > validated.maxInterval) {
      validated.minInterval = validated.maxInterval;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  } catch (error) {
    console.error("Failed to save SRS config:", error);
    throw error;
  }
}

/**
 * SRS設定をリセット（デフォルト値に戻す）
 */
export function resetSRSConfig(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

