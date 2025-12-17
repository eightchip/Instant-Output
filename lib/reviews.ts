// 復習システムの強化機能

import { storage } from "./storage";
import { Review, Card } from "@/types/models";

export interface ReviewCardInfo {
  card: Card;
  review: Review;
  priority: number; // 優先度（数値が大きいほど優先）
  daysOverdue: number; // 期限超過日数（負の値は未到来）
}

/**
 * 復習カードの情報を優先順位付きで取得
 */
export async function getReviewCardsWithPriority(): Promise<ReviewCardInfo[]> {
  await storage.init();
  const dueReviews = await storage.getDueReviews();
  const now = new Date();

  // カードIDのリストを作成
  const cardIds = dueReviews.map(review => review.cardId);
  
  // 全てのカードを一括取得
  const allCards = await storage.getAllCards();
  const cardMap = new Map<string, Card>();
  for (const card of allCards) {
    cardMap.set(card.id, card);
  }

  const reviewCardInfos: ReviewCardInfo[] = [];

  for (const review of dueReviews) {
    const card = cardMap.get(review.cardId);
    if (!card) continue;

    // 期限超過日数を計算
    const daysOverdue = Math.floor(
      (now.getTime() - review.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 優先度を計算
    // 1. 期限超過日数が多いほど優先度が高い（+10点/日）
    // 2. 間隔が短いほど優先度が高い（新しいカードほど優先）
    // 3. 前回の結果がNGの場合、優先度を上げる
    let priority = daysOverdue * 10;
    priority += (30 - review.interval) * 2; // 間隔が短いほど優先
    if (review.lastResult === "NG") {
      priority += 20; // NGの場合は追加で優先度を上げる
    } else if (review.lastResult === "MAYBE") {
      priority += 10; // MAYBEの場合は少し優先度を上げる
    }

    reviewCardInfos.push({
      card,
      review,
      priority,
      daysOverdue,
    });
  }

  // 優先度の高い順にソート
  return reviewCardInfos.sort((a, b) => b.priority - a.priority);
}

/**
 * 復習スケジュールを取得（日別）
 */
export async function getReviewSchedule(
  days: number = 30
): Promise<Map<string, number>> {
  await storage.init();
  const allReviews = await storage.getAllReviews();
  const schedule = new Map<string, number>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // この日の復習予定数をカウント
    const count = allReviews.filter((review) => {
      const reviewDate = new Date(review.dueDate);
      reviewDate.setHours(0, 0, 0, 0);
      return reviewDate.getTime() === date.getTime();
    }).length;

    schedule.set(dateStr, count);
  }

  return schedule;
}

/**
 * 復習統計を取得
 */
export interface ReviewStats {
  totalReviews: number;
  dueReviews: number;
  upcomingReviews: number; // 今週の復習予定
  averageInterval: number;
  lastResultDistribution: {
    OK: number;
    MAYBE: number;
    NG: number;
  };
  overdueCount: number;
}

export async function getReviewStats(): Promise<ReviewStats> {
  await storage.init();
  const allReviews = await storage.getAllReviews();
  const dueReviews = await storage.getDueReviews();
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let totalInterval = 0;
  const lastResultDistribution = { OK: 0, MAYBE: 0, NG: 0 };
  let overdueCount = 0;
  let upcomingCount = 0;

  for (const review of allReviews) {
    totalInterval += review.interval;
    lastResultDistribution[review.lastResult]++;

    if (review.dueDate <= now) {
      overdueCount++;
    } else if (review.dueDate <= weekLater) {
      upcomingCount++;
    }
  }

  return {
    totalReviews: allReviews.length,
    dueReviews: dueReviews.length,
    upcomingReviews: upcomingCount,
    averageInterval:
      allReviews.length > 0
        ? Math.round((totalInterval / allReviews.length) * 10) / 10
        : 0,
    lastResultDistribution,
    overdueCount,
  };
}

