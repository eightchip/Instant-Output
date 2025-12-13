// 学習モードの型定義

export type PracticeMode =
  | "normal" // 通常モード
  | "typing" // タイピング練習モード
  | "shuffle" // シャッフルモード
  | "focus" // 集中モード（タイマー付き）
  | "review_only"; // 復習専用モード

export interface PracticeModeConfig {
  mode: PracticeMode;
  cardCount?: number; // カード数（未指定の場合はデフォルト）
  focusDuration?: number; // 集中モードの時間（分）
}

