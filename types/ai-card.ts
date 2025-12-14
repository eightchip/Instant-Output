// 自動分割・自動翻訳カード化機能の型定義

export interface Source {
  id: string;
  imageId: string; // 画像のID（base64またはURL）
  rawOcrText: string; // OCR生テキスト（一切加工なし）
  createdAt: Date;
}

export interface DraftCard {
  en: string; // 英語文（OCRノイズ除去済み）
  jp: string; // 日本語訳（自動翻訳）
  confidence: number; // 信頼度（0-1）
  needsReview: boolean; // レビュー必要フラグ
  flags: string[]; // フラグ（translation_error, split_suspect, incomplete_sentence等）
  sourceSentence: string; // 元のOCR文（デバッグ用）
  notes: string; // メモ
}

export interface Draft {
  id: string;
  sourceId: string;
  cards: DraftCard[];
  warnings: string[];
  detected: {
    sentenceCount: number;
    language: string;
  };
  createdAt: Date;
}

export interface AICardResponse {
  cards: DraftCard[];
  warnings: string[];
  detected: {
    sentenceCount: number;
    language: string;
  };
}

export interface AIErrorResponse {
  error: string;
  message: string;
}

