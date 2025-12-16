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
  meaning: string; // ユーザーが編集可能な意味
  isLearned: boolean; // 覚えたフラグ
  isWantToLearn: boolean; // 覚えたいフラグ
  notes?: string; // メモ
  updatedAt?: Date; // 更新日時
}

