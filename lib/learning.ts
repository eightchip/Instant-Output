// 学習ドメインロジック

import { Card, Review, ReviewResult } from "@/types/models";
import { storage } from "./storage";
import { getSRSConfig } from "./srs-config";

/**
 * 復習間隔を更新する（簡易SRS）
 */
export function updateReviewInterval(
  review: Review | null,
  result: ReviewResult
): Review {
  const config = getSRSConfig();
  const now = new Date();
  let newInterval: number;
  let newDueDate: Date;

  if (!review) {
    // 初回学習
    newInterval = config.initialInterval;
    newDueDate = new Date(
      now.getTime() + newInterval * 24 * 60 * 60 * 1000
    );
  } else {
    switch (result) {
      case "OK":
        // 復習間隔を延ばす（設定された倍率、最大間隔まで）
        newInterval = Math.min(
          Math.floor(review.interval * config.okMultiplier),
          config.maxInterval
        );
        newInterval = Math.max(newInterval, config.minInterval);
        newDueDate = new Date(
          now.getTime() + newInterval * 24 * 60 * 60 * 1000
        );
        break;
      case "MAYBE":
        // 短い間隔で再出題（設定された倍率、最小間隔まで）
        newInterval = Math.max(
          Math.floor(review.interval * config.maybeMultiplier),
          config.minInterval
        );
        newDueDate = new Date(
          now.getTime() + newInterval * 24 * 60 * 60 * 1000
        );
        break;
      case "NG":
        // 設定された間隔で再出題
        newInterval = config.ngInterval;
        newDueDate = new Date(
          now.getTime() + newInterval * 24 * 60 * 60 * 1000
        );
        break;
    }
  }

  return {
    cardId: review?.cardId || "",
    dueDate: newDueDate,
    interval: newInterval,
    lastResult: result,
  };
}

/**
 * 今日の学習カードを取得（新規 + 復習）
 */
export async function getTodayCards(
  dailyTarget: number = 5
): Promise<Card[]> {
  // 1. 未消化の復習を優先的に取得
  const dueReviews = await storage.getDueReviews(dailyTarget);
  const reviewCardIds = new Set(dueReviews.map((r) => r.cardId));

  // 2. 復習カードを取得
  const reviewCards: Card[] = [];
  for (const review of dueReviews) {
    const card = await storage.getCard(review.cardId);
    if (card) {
      reviewCards.push(card);
    }
  }

  // 3. まだ足りない場合は、復習がないカードから新規を取得
  const remaining = dailyTarget - reviewCards.length;
  if (remaining > 0) {
    const allCards = await storage.getAllCards();
    const newCards = allCards
      .filter((card) => !reviewCardIds.has(card.id))
      .slice(0, remaining);
    return [...reviewCards, ...newCards];
  }

  return reviewCards;
}

/**
 * カードの採点結果を保存
 */
export async function saveCardResult(
  cardId: string,
  result: ReviewResult
): Promise<void> {
  const existingReview = await storage.getReview(cardId);
  const updatedReview = updateReviewInterval(existingReview, result);
  updatedReview.cardId = cardId;
  await storage.saveReview(updatedReview);
}

