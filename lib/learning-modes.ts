// 学習モード別のカード取得ロジック

import { storage } from "./storage";
import { Card } from "@/types/models";
import { PracticeMode } from "@/types/modes";

/**
 * 復習カードのみを取得
 */
export async function getReviewOnlyCards(
  limit: number = 10
): Promise<Card[]> {
  await storage.init();
  const dueReviews = await storage.getDueReviews(limit);
  const reviewCards: Card[] = [];

  for (const review of dueReviews) {
    const card = await storage.getCard(review.cardId);
    if (card) {
      reviewCards.push(card);
    }
  }

  return reviewCards;
}

/**
 * カードをシャッフル
 */
export function shuffleCards(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * モードに応じてカードを取得
 */
export async function getCardsByMode(
  mode: PracticeMode,
  count: number = 5
): Promise<Card[]> {
  await storage.init();

  switch (mode) {
    case "review_only":
      return getReviewOnlyCards(count);
    case "shuffle": {
      const allCards = await storage.getAllCards();
      const shuffled = shuffleCards(allCards);
      return shuffled.slice(0, count);
    }
    case "typing": {
      const allCards = await storage.getAllCards();
      const shuffled = shuffleCards(allCards);
      return shuffled.slice(0, count);
    }
    case "focus": {
      const allCards = await storage.getAllCards();
      const shuffled = shuffleCards(allCards);
      return shuffled.slice(0, count);
    }
    case "normal":
    default: {
      // 通常モード: getTodayCardsを使用
      const { getTodayCards } = await import("./learning");
      return getTodayCards(count);
    }
  }
}

