// 自動採点ロジック

import { ReviewResult } from "@/types/models";

/**
 * 文字列を正規化（大文字小文字、句読点、空白を統一）
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]/g, "") // 句読点を削除
    .replace(/\s+/g, " ") // 複数の空白を1つに
    .replace(/['"]/g, ""); // 引用符を削除
}

/**
 * 文字列の類似度を計算（0-1の範囲）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);

  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Levenshtein距離ベースの類似度計算
  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLength;
}

/**
 * Levenshtein距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // 初期化
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 動的プログラミングで距離を計算
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 削除
          matrix[i][j - 1] + 1, // 挿入
          matrix[i - 1][j - 1] + 1 // 置換
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * 自動採点を実行
 * @param userAnswer ユーザーの回答
 * @param correctAnswer 正解
 * @returns 採点結果（OK, MAYBE, NG）
 */
export function autoGrade(
  userAnswer: string,
  correctAnswer: string
): ReviewResult {
  if (!userAnswer.trim()) {
    return "NG";
  }

  const similarity = calculateSimilarity(userAnswer, correctAnswer);

  // 閾値設定
  if (similarity >= 0.95) {
    // 95%以上一致: OK
    return "OK";
  } else if (similarity >= 0.75) {
    // 75%以上一致: MAYBE
    return "MAYBE";
  } else {
    // それ以下: NG
    return "NG";
  }
}

/**
 * 採点の詳細情報を取得
 */
export interface GradingDetails {
  result: ReviewResult;
  similarity: number;
  normalizedUser: string;
  normalizedCorrect: string;
}

export function getGradingDetails(
  userAnswer: string,
  correctAnswer: string
): GradingDetails {
  const normalizedUser = normalizeText(userAnswer);
  const normalizedCorrect = normalizeText(correctAnswer);
  const similarity = calculateSimilarity(userAnswer, correctAnswer);
  const result = autoGrade(userAnswer, correctAnswer);

  return {
    result,
    similarity,
    normalizedUser,
    normalizedCorrect,
  };
}

