// 語彙・単語関連のユーティリティ

import { Card, VocabularyWord } from "@/types/models";
import { storage } from "./storage";

// 基本的な単語（stop words）のリスト
// 簡単な動詞（be動詞、have動詞、do動詞、助動詞）のみを含める
// その他の動詞は単語リストに含める
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "up", "about", "into", "through", "during", "including", "against", "among",
  "throughout", "despite", "towards", "upon", "concerning",
  // 簡単な動詞のみ（be動詞、have動詞、do動詞、助動詞）
  "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having",
  "do", "does", "did", "doing",
  "will", "would", "should", "could", "may", "might", "can", "must", "shall",
  // 代名詞・指示詞
  "this", "that", "these", "those", "i", "you", "he", "she",
  "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "her",
  "its", "our", "their", "mine", "yours", "hers", "ours", "theirs"
]);

// 既知の英語イディオム辞書（一般的なイディオムのリスト）
const KNOWN_IDIOMS = new Set([
  // 動詞 + 前置詞/副詞
  "break down", "break in", "break out", "break up", "bring about", "bring up", "bring in",
  "come across", "come along", "come back", "come down", "come in", "come out", "come over", "come up",
  "get along", "get away", "get back", "get by", "get in", "get off", "get on", "get out", "get over", "get through", "get up",
  "give away", "give back", "give in", "give up", "give out",
  "go ahead", "go along", "go away", "go back", "go by", "go down", "go in", "go on", "go out", "go over", "go through", "go up",
  "keep away", "keep back", "keep down", "keep off", "keep on", "keep out", "keep up",
  "look after", "look at", "look back", "look down", "look for", "look forward", "look in", "look into", "look on", "look out", "look over", "look through", "look up",
  "make for", "make out", "make up", "make off",
  "put away", "put back", "put down", "put in", "put off", "put on", "put out", "put through", "put up",
  "take after", "take away", "take back", "take down", "take in", "take off", "take on", "take out", "take over", "take up",
  "turn around", "turn away", "turn back", "turn down", "turn in", "turn off", "turn on", "turn out", "turn over", "turn up",
  // その他の一般的なイディオム
  "piece of cake", "break the ice", "hit the nail on the head", "once in a blue moon", "the ball is in your court",
  "see eye to eye", "hear it on the grapevine", "when pigs fly", "costs an arm and a leg", "a dime a dozen",
  "beat around the bush", "cut to the chase", "hit the books", "let the cat out of the bag", "make a long story short",
  "on cloud nine", "once in a blue moon", "play it by ear", "pull someone's leg", "speak of the devil",
  "the best of both worlds", "the elephant in the room", "under the weather", "wrap your head around something",
  "a blessing in disguise", "better late than never", "call it a day", "cut corners", "get out of hand",
  "go the extra mile", "hang in there", "it's not rocket science", "kill two birds with one stone", "last straw",
  "let someone off the hook", "miss the boat", "no pain no gain", "on the ball", "pull yourself together",
  "so far so good", "the early bird", "through thick and thin", "time flies", "we'll cross that bridge when we come to it",
  "your guess is as good as mine", "a picture paints a thousand words", "actions speak louder than words",
  "add insult to injury", "barking up the wrong tree", "blessing in disguise", "can't judge a book by its cover",
  "don't count your chickens before they hatch", "don't give up your day job", "every cloud has a silver lining",
  "get a taste of your own medicine", "give someone the cold shoulder", "go on a wild goose chase",
  "good things come to those who wait", "have bigger fish to fry", "hit the sack", "it takes two to tango",
  "jump on the bandwagon", "keep something at bay", "let sleeping dogs lie", "make a mountain out of a molehill",
  "on thin ice", "play devil's advocate", "put all your eggs in one basket", "rain on someone's parade",
  "saving for a rainy day", "the ball is in your court", "the whole nine yards", "there are other fish in the sea",
  "there's a method to his madness", "throw caution to the wind", "you can't have your cake and eat it too",
  "you can't make an omelet without breaking a few eggs",
]);

// イディオムのパターン（フォールバック用、2語以上の連続した表現）
const IDIOM_PATTERNS = [
  /\b(break|bring|come|get|give|go|keep|look|make|put|take|turn)\s+\w+\b/gi,
  /\b\w+\s+(away|back|down|in|off|on|out|over|through|up)\b/gi,
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
 * イディオムを検出（既知のイディオム辞書のみを使用、より厳格に）
 */
export function detectIdioms(text: string): string[] {
  const idioms: string[] = [];
  const lowerText = text.toLowerCase();
  
  // 既知のイディオム辞書と照合（完全一致または単語境界で一致）
  for (const idiom of KNOWN_IDIOMS) {
    const lowerIdiom = idiom.toLowerCase();
    // より厳格なマッチング：単語境界で囲まれたイディオムを検出
    const regex = new RegExp(`\\b${lowerIdiom.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(lowerText)) {
      idioms.push(idiom);
    }
  }
  
  // パターンマッチングは使用しない（誤検出を避けるため）
  
  return [...new Set(idioms)]; // 重複を除去
}

/**
 * フレーズが既知のイディオムかどうかを判定
 */
export function isKnownIdiom(phrase: string): boolean {
  const lowerPhrase = phrase.toLowerCase().trim();
  return KNOWN_IDIOMS.has(lowerPhrase);
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
 */
export function generateVocabularyList(cards: Card[]): Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }> {
  const vocabulary = new Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>();
  
  for (const card of cards) {
    // 重要単語を取得
    const words = getImportantWords(card);
    for (const word of words) {
      // 2語以上のフレーズはidiom候補として扱わない（既知のidiomのみ）
      const isMultiWord = word.includes(" ");
      if (isMultiWord && !isKnownIdiom(word)) {
        // 既知のidiomでない2語以上のフレーズはスキップ
        continue;
      }
      
      const existing = vocabulary.get(word);
      const difficulty = calculateWordDifficulty(word);
      // 既知のイディオム辞書で判定
      const isIdiom = isKnownIdiom(word);
      
      if (existing) {
        vocabulary.set(word, {
          count: existing.count + 1,
          difficulty: Math.max(existing.difficulty, difficulty),
          importance: 0, // 後で計算
          isIdiom: existing.isIdiom || isIdiom,
        });
      } else {
        vocabulary.set(word, {
          count: 1,
          difficulty,
          importance: 0,
          isIdiom,
        });
      }
    }
    
    // 検出されたイディオムも追加（既知のidiomのみ）
    const detectedIdioms = detectIdioms(card.target_en);
    for (const idiom of detectedIdioms) {
      // 既知のidiomのみを追加
      if (!isKnownIdiom(idiom)) {
        continue;
      }
      
      const existing = vocabulary.get(idiom);
      const difficulty = calculateWordDifficulty(idiom) + 10; // イディオムは難易度を高く設定
      
      if (existing) {
        vocabulary.set(idiom, {
          count: existing.count + 1,
          difficulty: Math.max(existing.difficulty, difficulty),
          importance: 0,
          isIdiom: true,
        });
      } else {
        vocabulary.set(idiom, {
          count: 1,
          difficulty,
          importance: 0,
          isIdiom: true,
        });
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

/**
 * 単語の意味を取得（カードから抽出）
 * @param word 単語
 * @param cards カードの配列
 * @param isIdiom イディオムかどうか
 * @param vocabularyWordMap 既に読み込まれたVocabularyWordのMap（オプション、編集機能用）
 */
export async function getWordMeaning(
  word: string, 
  cards: Card[], 
  isIdiom: boolean,
  vocabularyWordMap?: Map<string, VocabularyWord>
): Promise<string> {
  // 編集機能用：既に読み込まれたMapがあればそれを使う（語彙リストページのみ）
  if (vocabularyWordMap) {
    const vocabWord = vocabularyWordMap.get(word.toLowerCase());
    if (vocabWord && vocabWord.meaning) {
      return vocabWord.meaning;
    }
  }
  
  // カードから抽出を試みる
  const wordCards = isIdiom
    ? cards.filter(card => {
        const lowerText = card.target_en.toLowerCase();
        const lowerWord = word.toLowerCase();
        return lowerText.includes(lowerWord);
      })
    : cards.filter(card => getImportantWords(card).includes(word.toLowerCase()));
  
  if (wordCards.length === 0) {
    return "";
  }
  
  // 最初のカードの日本語訳を返す（後で改善可能）
  return wordCards[0].prompt_jp;
}

/**
 * 単語の意味を保存
 */
export async function saveWordMeaning(
  word: string, 
  meaning: string, 
  notes?: string,
  highlightedMeaning?: string,
  exampleSentence?: string,
  isLearned?: boolean,
  isWantToLearn?: boolean
): Promise<void> {
  const existing = await storage.getVocabularyWord(word);
  const vocabWord: VocabularyWord = existing || {
    word: word.toLowerCase(),
    meaning,
    isLearned: false,
    isWantToLearn: false,
    notes,
    updatedAt: new Date(),
  };
  vocabWord.meaning = meaning;
  
  // notesの更新（空文字列の場合はundefined）
  if (notes !== undefined) {
    vocabWord.notes = notes && notes.trim() ? notes.trim() : undefined;
  }
  
  // highlightedMeaningの更新（空文字列の場合はundefined、明示的にundefinedが渡された場合も更新）
  if (highlightedMeaning !== undefined) {
    vocabWord.highlightedMeaning = highlightedMeaning && highlightedMeaning.trim() ? highlightedMeaning.trim() : undefined;
  }
  
  // exampleSentenceの更新（空文字列の場合はundefined、明示的にundefinedが渡された場合も更新）
  if (exampleSentence !== undefined) {
    vocabWord.exampleSentence = exampleSentence && exampleSentence.trim() ? exampleSentence.trim() : undefined;
  }
  
  // フラグの更新
  if (isLearned !== undefined) {
    vocabWord.isLearned = isLearned;
  }
  if (isWantToLearn !== undefined) {
    vocabWord.isWantToLearn = isWantToLearn;
  }
  vocabWord.updatedAt = new Date();
  
  // デバッグログ：保存前のデータを確認
  console.log("saveWordMeaning - saving:", {
    word: vocabWord.word,
    meaning: vocabWord.meaning,
    highlightedMeaning: vocabWord.highlightedMeaning,
    exampleSentence: vocabWord.exampleSentence,
    isLearned: vocabWord.isLearned,
    isWantToLearn: vocabWord.isWantToLearn,
    notes: vocabWord.notes,
    fullVocabWord: vocabWord, // 完全なオブジェクトも確認
  });
  
  // デバッグログ：storage.saveVocabularyWordに渡す直前のデータを確認
  console.log("saveWordMeaning - before storage.saveVocabularyWord:", {
    hasHighlightedMeaning: vocabWord.highlightedMeaning !== undefined,
    highlightedMeaningValue: vocabWord.highlightedMeaning,
    hasExampleSentence: vocabWord.exampleSentence !== undefined,
    exampleSentenceValue: vocabWord.exampleSentence,
  });
  
  await storage.saveVocabularyWord(vocabWord);
  
  // デバッグログ：保存後のデータを確認
  const saved = await storage.getVocabularyWord(word);
  console.log("saveWordMeaning - saved:", {
    word: saved?.word,
    meaning: saved?.meaning,
    highlightedMeaning: saved?.highlightedMeaning,
    exampleSentence: saved?.exampleSentence,
    isLearned: saved?.isLearned,
    isWantToLearn: saved?.isWantToLearn,
    notes: saved?.notes,
    updatedAt: saved?.updatedAt,
    fullObject: saved, // 完全なオブジェクトも確認
  });
}

/**
 * 単語の覚えたフラグを更新
 */
export async function updateWordLearnedStatus(word: string, isLearned: boolean): Promise<void> {
  const existing = await storage.getVocabularyWord(word);
  const vocabWord: VocabularyWord = existing || {
    word: word.toLowerCase(),
    meaning: "",
    isLearned,
    isWantToLearn: false,
    updatedAt: new Date(),
  };
  vocabWord.isLearned = isLearned;
  vocabWord.updatedAt = new Date();
  await storage.saveVocabularyWord(vocabWord);
}

/**
 * 単語の覚えたいフラグを更新
 */
export async function updateWordWantToLearnStatus(word: string, isWantToLearn: boolean): Promise<void> {
  const existing = await storage.getVocabularyWord(word);
  const vocabWord: VocabularyWord = existing || {
    word: word.toLowerCase(),
    meaning: "",
    isLearned: false,
    isWantToLearn,
    updatedAt: new Date(),
  };
  vocabWord.isWantToLearn = isWantToLearn;
  vocabWord.updatedAt = new Date();
  await storage.saveVocabularyWord(vocabWord);
}

