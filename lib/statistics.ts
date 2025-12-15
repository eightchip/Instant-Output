// 学習統計の計算ロジック

import { StudySession } from "@/types/models";

export interface Statistics {
  totalSessions: number;
  totalCards: number;
  totalCorrect: number;
  totalMaybe: number;
  totalIncorrect: number;
  averageAccuracy: number; // 正答率（%）
  totalStudyDays: number;
  currentStreak: number; // 連続学習日数
  longestStreak: number; // 最長連続学習日数
  totalStudyTime: number; // 総学習時間（分）
  averageStudyTime: number; // 平均学習時間（分）
}

/**
 * 学習統計を計算
 */
export function calculateStatistics(
  sessions: StudySession[]
): Statistics {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalCards: 0,
      totalCorrect: 0,
      totalMaybe: 0,
      totalIncorrect: 0,
      averageAccuracy: 0,
      totalStudyDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalStudyTime: 0,
      averageStudyTime: 0,
    };
  }

  const totalCards = sessions.reduce((sum, s) => sum + s.cardCount, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalMaybe = sessions.reduce((sum, s) => sum + s.maybeCount, 0);
  const totalIncorrect = sessions.reduce(
    (sum, s) => sum + s.incorrectCount,
    0
  );

  // 正答率 = (OK + MAYBE * 0.5) / 総カード数 * 100
  const averageAccuracy =
    totalCards > 0
      ? ((totalCorrect + totalMaybe * 0.5) / totalCards) * 100
      : 0;

  // 学習日数の計算（重複する日付を除外）
  const uniqueDates = new Set(
    sessions.map((s) => {
      const date = new Date(s.date);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    })
  );
  const totalStudyDays = uniqueDates.size;

  // 連続学習日数の計算
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() // 新しい順にソート
  );

  // ユニークな学習日を取得（日付のみ）
  const uniqueDates = new Set<string>();
  for (const session of sessions) {
    const date = new Date(session.date);
    date.setHours(0, 0, 0, 0);
    uniqueDates.add(date.toISOString().split('T')[0]);
  }

  const sortedDates = Array.from(uniqueDates).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // 現在のストリークを計算（今日から逆算）
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  // 今日または昨日から始まる連続日数を計算
  let checkDate = new Date(today);
  for (let i = 0; i < sortedDates.length; i++) {
    const dateStr = sortedDates[i];
    const expectedDateStr = checkDate.toISOString().split('T')[0];
    
    if (dateStr === expectedDateStr) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // 今日または昨日のセッションがない場合は終了
      if (i === 0 && dateStr !== todayStr) {
        // 今日のセッションがない場合、昨日のセッションがあるかチェック
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (dateStr === yesterdayStr) {
          currentStreak = 1;
        }
      }
      break;
    }
  }

  // 最長ストリークを計算
  let longestStreak = 0;
  let tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const daysDiff = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      // 連続
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      // 途切れた
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // 学習時間の計算
  const totalStudyTime = sessions.reduce(
    (sum, s) => sum + (s.durationSeconds || 0),
    0
  );
  const averageStudyTime =
    sessions.length > 0 ? totalStudyTime / sessions.length / 60 : 0; // 分に変換

  return {
    totalSessions: sessions.length,
    totalCards,
    totalCorrect,
    totalMaybe,
    totalIncorrect,
    averageAccuracy: Math.round(averageAccuracy * 10) / 10,
    totalStudyDays,
    currentStreak,
    longestStreak,
    totalStudyTime: Math.round(totalStudyTime / 60), // 分に変換
    averageStudyTime: Math.round(averageStudyTime * 10) / 10,
  };
}

/**
 * 日付ごとの学習データを取得（グラフ用）
 */
export function getDailyData(sessions: StudySession[]) {
  const dailyData: Map<string, { cards: number; accuracy: number }> =
    new Map();

  for (const session of sessions) {
    const date = new Date(session.date);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const existing = dailyData.get(dateKey);
    if (existing) {
      existing.cards += session.cardCount;
      const total = session.correctCount + session.maybeCount + session.incorrectCount;
      const accuracy = total > 0
        ? ((session.correctCount + session.maybeCount * 0.5) / total) * 100
        : 0;
      existing.accuracy = (existing.accuracy + accuracy) / 2;
    } else {
      const total = session.correctCount + session.maybeCount + session.incorrectCount;
      const accuracy = total > 0
        ? ((session.correctCount + session.maybeCount * 0.5) / total) * 100
        : 0;
      dailyData.set(dateKey, {
        cards: session.cardCount,
        accuracy: Math.round(accuracy * 10) / 10,
      });
    }
  }

  return Array.from(dailyData.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

