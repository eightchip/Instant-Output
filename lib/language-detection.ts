/**
 * テキストの言語を検出するユーティリティ
 */

/**
 * テキストが日本語かどうかを判定
 * ひらがな、カタカナ、漢字が含まれていれば日本語と判定
 */
export function detectLanguage(text: string): "ja" | "en" {
  if (!text || text.trim().length === 0) return "en";
  
  // 日本語の文字（ひらがな、カタカナ、漢字）が含まれているかチェック
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  
  // 日本語の文字が含まれている場合、日本語と判定
  if (japaneseRegex.test(text)) {
    return "ja";
  }
  
  // それ以外は英語と判定
  return "en";
}

/**
 * テキストが主に日本語かどうかを判定（より厳密）
 * 日本語文字の割合が一定以上の場合に日本語と判定
 */
export function detectLanguageStrict(text: string, threshold: number = 0.3): "ja" | "en" {
  if (!text || text.trim().length === 0) return "en";
  
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;
  const matches = text.match(japaneseRegex);
  
  if (!matches) return "en";
  
  const japaneseRatio = matches.length / text.length;
  return japaneseRatio >= threshold ? "ja" : "en";
}

