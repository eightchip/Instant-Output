// プレミアム機能（アプリ内課金）管理

const PREMIUM_KEY = "instant_output_premium";
export const PREMIUM_FEATURES = {
  AI_OCR: "ai_ocr", // AI OCR機能
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];

/**
 * プレミアム機能が有効かどうかを確認
 */
export function isPremiumEnabled(feature: PremiumFeature): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const premiumData = localStorage.getItem(PREMIUM_KEY);
    if (!premiumData) return false;
    
    const data = JSON.parse(premiumData);
    return data.enabled === true && data.features?.includes(feature);
  } catch {
    return false;
  }
}

/**
 * プレミアム機能を有効化（開発・テスト用）
 * 実際のアプリでは、アプリ内課金APIと連携する必要があります
 */
export function enablePremium(feature: PremiumFeature): void {
  if (typeof window === "undefined") return;
  
  try {
    const existingData = localStorage.getItem(PREMIUM_KEY);
    let data: { enabled: boolean; features: PremiumFeature[] } = existingData
      ? JSON.parse(existingData)
      : { enabled: false, features: [] };
    
    if (!data.features.includes(feature)) {
      data.features.push(feature);
    }
    data.enabled = true;
    
    localStorage.setItem(PREMIUM_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to enable premium:", error);
  }
}

/**
 * プレミアム機能を無効化
 */
export function disablePremium(feature: PremiumFeature): void {
  if (typeof window === "undefined") return;
  
  try {
    const existingData = localStorage.getItem(PREMIUM_KEY);
    if (!existingData) return;
    
    const data = JSON.parse(existingData);
    data.features = data.features.filter((f: PremiumFeature) => f !== feature);
    
    if (data.features.length === 0) {
      data.enabled = false;
    }
    
    localStorage.setItem(PREMIUM_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to disable premium:", error);
  }
}

/**
 * すべてのプレミアム機能を取得
 */
export function getPremiumFeatures(): PremiumFeature[] {
  if (typeof window === "undefined") return [];
  
  try {
    const premiumData = localStorage.getItem(PREMIUM_KEY);
    if (!premiumData) return [];
    
    const data = JSON.parse(premiumData);
    return data.features || [];
  } catch {
    return [];
  }
}

