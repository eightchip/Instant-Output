// 語彙・単語関連のユーティリティ

import { Card } from "@/types/models";

// 基本的な単語（stop words）のリスト
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "up", "about", "into", "through", "during", "including", "against", "among",
  "throughout", "despite", "towards", "upon", "concerning", "to", "of", "in", "for",
  "on", "at", "by", "with", "about", "into", "through", "during", "including",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having",
  "do", "does", "did", "doing", "will", "would", "should", "could", "may", "might",
  "can", "must", "shall", "this", "that", "these", "those", "i", "you", "he", "she",
  "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "her",
  "its", "our", "their", "mine", "yours", "hers", "ours", "theirs"
]);

// イディオムのパターン（2語以上の連続した表現）
const IDIOM_PATTERNS = [
  /\b(break|bring|come|get|give|go|keep|look|make|put|take|turn)\s+\w+\b/gi,
  /\b\w+\s+(away|back|down|in|off|on|out|over|through|up)\b/gi,
  /\b(once|twice|three times|four times)\s+\w+\b/gi,
  /\b\w+\s+(and|or)\s+\w+\b/gi,
];

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
 * イディオムを検出
 */
export function detectIdioms(text: string): string[] {
  const idioms: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const pattern of IDIOM_PATTERNS) {
    const matches = lowerText.match(pattern);
    if (matches) {
      idioms.push(...matches.map(m => m.trim()));
    }
  }
  
  return [...new Set(idioms)]; // 重複を除去
}

/**
 * 単語の難易度スコアを計算
 * スコアが高いほど難しい単語
 */
export function calculateWordDifficulty(word: string): number {
  let score = 0;
  
  // 長さによるスコア（長い単語ほど難しい）
  score += word.length * 2;
  
  // 複雑な文字パターン（大文字、数字、特殊文字など）
  if (/[A-Z]/.test(word)) score += 3;
  if (/\d/.test(word)) score += 5;
  if (/[^a-zA-Z0-9]/.test(word)) score += 4;
  
  // 連続子音（難しい発音）
  if (/[bcdfghjklmnpqrstvwxyz]{3,}/i.test(word)) score += 3;
  
  // 二重文字（difficult, success など）
  if (/(.)\1/.test(word)) score += 2;
  
  return score;
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
  const filtered = words.filter(word => 
    word.length >= 3 && !STOP_WORDS.has(word.toLowerCase())
  );
  
  // 難易度順にソートして上位5個を返す
  return filtered
    .map(word => ({ word, difficulty: calculateWordDifficulty(word) }))
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 5)
    .map(item => item.word);
}

/**
 * すべてのカードから語彙リストを生成（難易度を考慮）
 * @param cards カードの配列
 * @param useLLMForIdioms LLMを使ってイディオムを判別するかどうか（デフォルト: false）
 */
export async function generateVocabularyList(
  cards: Card[],
  useLLMForIdioms: boolean = false
): Promise<Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>> {
  const vocabulary = new Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>();
  
  // 2語以上のフレーズを収集（イディオム候補）
  const phraseCandidates = new Set<string>();
  
  for (const card of cards) {
    // 重要単語を取得
    const words = getImportantWords(card);
    for (const word of words) {
      const existing = vocabulary.get(word);
      const difficulty = calculateWordDifficulty(word);
      // 2語以上のフレーズはイディオム候補として収集
      const isMultiWord = word.includes(" ");
      if (isMultiWord) {
        phraseCandidates.add(word);
      }
      
      if (existing) {
        vocabulary.set(word, {
          count: existing.count + 1,
          difficulty: Math.max(existing.difficulty, difficulty),
          importance: 0, // 後で計算
          isIdiom: existing.isIdiom || (isMultiWord && !useLLMForIdioms), // LLM未使用時は暫定的にtrue
        });
      } else {
        vocabulary.set(word, {
          count: 1,
          difficulty,
          importance: 0,
          isIdiom: isMultiWord && !useLLMForIdioms, // LLM未使用時は暫定的にtrue
        });
      }
    }
    
    // パターンマッチングで検出されたイディオムも候補に追加
    const detectedIdioms = detectIdioms(card.target_en);
    for (const idiom of detectedIdioms) {
      if (idiom.includes(" ")) {
        phraseCandidates.add(idiom);
      }
    }
  }
  
  // LLMを使ってイディオムを判別
  const idiomResults = new Map<string, boolean>();
  if (useLLMForIdioms && phraseCandidates.size > 0) {
    try {
      const phrases = Array.from(phraseCandidates);
      const response = await fetch("/api/check-idiom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phrases }),
      });
      
      if (response.ok) {
        const data = await response.json();
        for (const [phrase, isIdiom] of Object.entries(data.results || {})) {
          idiomResults.set(phrase, isIdiom === true);
        }
      }
    } catch (error) {
      console.error("Failed to check idioms with LLM:", error);
    }
  }
  
  // イディオム候補を語彙リストに追加
  for (const phrase of phraseCandidates) {
    const isIdiom = useLLMForIdioms 
      ? (idiomResults.get(phrase) || false)
      : true; // LLM未使用時は暫定的にtrue
    
    if (isIdiom) {
      const existing = vocabulary.get(phrase);
      const difficulty = calculateWordDifficulty(phrase) + 10; // イディオムは難易度を高く設定
      
      if (existing) {
        vocabulary.set(phrase, {
          count: existing.count + 1,
          difficulty: Math.max(existing.difficulty, difficulty),
          importance: 0,
          isIdiom: true,
        });
      } else {
        vocabulary.set(phrase, {
          count: 1,
          difficulty,
          importance: 0,
          isIdiom: true,
        });
      }
    } else {
      // イディオムでない場合は、isIdiomフラグをfalseに更新
      const existing = vocabulary.get(phrase);
      if (existing) {
        existing.isIdiom = false;
      }
    }
  }
  
  // 重要度スコアを計算: 難易度 × (1 / 出現頻度) × イディオムボーナス
  for (const [word, data] of vocabulary.entries()) {
    const frequencyFactor = 1 / Math.max(data.count, 1); // 出現頻度が低いほど重要
    const idiomBonus = data.isIdiom ? 2 : 1; // イディオムは2倍
    data.importance = data.difficulty * frequencyFactor * idiomBonus;
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

