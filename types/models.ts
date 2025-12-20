// データモデルの型定義

export type SourceType = "manual_pair" | "manual_en" | "screenshot" | "template";

export type ReviewResult = "OK" | "MAYBE" | "NG";

export interface Course {
  id: string;
  title: string;
  startDate: Date;
  durationDays: number;
  dailyTarget: number; // default: 5
  lessonIds: string[];
}

export interface Lesson {
  id: string;
  courseId?: string;
  title: string;
  orderInCourse?: number;
}

export interface Card {
  id: string;
  lessonId: string;
  prompt_jp: string;
  target_en: string;
  source_type: SourceType;
  imageData?: string; // base64エンコードされた画像データ（スクリーンショット用）
  isFavorite?: boolean; // お気に入りフラグ
  notes?: string; // メモ・ノート（覚え方のコツなど）
  importantWords?: string[]; // 重要な単語・表現のリスト
  tags?: string[]; // タグのリスト
  order?: number; // レッスン内での表示順序
  createdAt?: Date; // 作成日時（順序保持のフォールバック）
}

export interface Review {
  cardId: string;
  dueDate: Date;
  interval: number; // 日数
  lastResult: ReviewResult;
}

export interface StudySession {
  id: string;
  date: Date;
  cardCount: number; // 学習したカード数
  correctCount: number; // 正答数（OK）
  maybeCount: number; // 部分正答数（MAYBE）
  incorrectCount: number; // 不正答数（NG）
  durationSeconds?: number; // 学習時間（秒）
}

export interface VocabularyWord {
  word: string; // 単語（小文字で正規化）
  meaning: string; // ユーザーが編集可能な意味（全文）
  highlightedMeaning?: string; // ハイライトされた意味の部分（ユーザーが選択した部分）
  exampleSentence?: string; // 例文（英文全体）
  isLearned: boolean; // 覚えたフラグ
  isWantToLearn: boolean; // 覚えたいフラグ
  notes?: string; // メモ
  updatedAt?: Date; // 更新日時
}

// サブスクリプション関連の型定義
export type SubscriptionPlan = "basic" | "standard" | "professional";

export interface User {
  id: string;
  email: string;
  passwordHash: string; // bcryptでハッシュ化
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: "active" | "expired" | "cancelled";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageStats {
  id: string;
  userId: string;
  month: string; // "2024-01"
  whisperMinutes: number;
  aiFeatureCalls: number; // 再翻訳、改善、語彙抽出、品質チェックの合計
  ttsCharacters: number;
  ocrCalls: number;
  createdAt: Date;
  updatedAt: Date;
}

