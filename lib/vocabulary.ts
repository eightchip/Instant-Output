// 語彙・単語関連のユーティリティ

import { Card } from "@/types/models";

/**
 * カードから単語を抽出（句読点を除去）
 */
export function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:()\[\]{}'"]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * カードの重要単語を取得（設定されていない場合は自動抽出）
 */
export function getImportantWords(card: Card): string[] {
  if (card.importantWords && card.importantWords.length > 0) {
    return card.importantWords;
  }
  
  // 自動抽出: 3文字以上の単語を抽出
  const words = extractWords(card.target_en);
  return words.filter(word => word.length >= 3).slice(0, 5); // 最大5個
}

/**
 * すべてのカードから語彙リストを生成
 */
export function generateVocabularyList(cards: Card[]): Map<string, number> {
  const vocabulary = new Map<string, number>();
  
  for (const card of cards) {
    const words = getImportantWords(card);
    for (const word of words) {
      vocabulary.set(word, (vocabulary.get(word) || 0) + 1);
    }
  }
  
  return vocabulary;
}

/**
 * テキストを単語単位に分割（句読点を保持）
 */
export function splitIntoWords(text: string): Array<{ word: string; isPunctuation: boolean }> {
  const result: Array<{ word: string; isPunctuation: boolean }> = [];
  const words = text.split(/(\s+|[.,!?;:()\[\]{}'"])/);
  
  for (const part of words) {
    if (part.trim().length === 0) continue;
    
    const isPunctuation = /^[.,!?;:()\[\]{}'"]+$/.test(part);
    if (isPunctuation) {
      result.push({ word: part, isPunctuation: true });
    } else {
      result.push({ word: part.trim(), isPunctuation: false });
    }
  }
  
  return result;
}

