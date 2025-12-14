// 学習モードの型定義

export type PracticeMode =
  | "normal" // 通常モード
  | "typing" // タイピング練習モード
  | "shuffle" // シャッフルモード
  | "focus" // 集中モード（タイマー付き）
  | "review_only" // 復習専用モード
  | "custom" // カスタムモード（ユーザーが選択したカード）
  | "favorite" // お気に入り専用モード
  | "weak" // 苦手カード専用モード（NGが多いカード）
  | "random" // 完全ランダムモード
  | "speed" // スピードチャレンジモード
  | "flashcard" // フラッシュカードモード（単語→意味）

export interface PracticeModeConfig {
  mode: PracticeMode;
  cardCount?: number; // カード数（未指定の場合はデフォルト）
  focusDuration?: number; // 集中モードの時間（分）
}

