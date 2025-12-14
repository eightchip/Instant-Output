// 学習モード別のカード取得ロジック

import { storage } from "./storage";
import { Card } from "@/types/models";
import { PracticeMode } from "@/types/modes";
import { getImportantWords } from "./vocabulary";

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
  count: number = 5,
  cardIds?: string[]
): Promise<Card[]> {
  await storage.init();

  switch (mode) {
    case "custom": {
      if (!cardIds || cardIds.length === 0) {
        return [];
      }
      const cardsPromises = cardIds.map(id => storage.getCard(id));
      return (await Promise.all(cardsPromises)).filter((card): card is Card => card !== null);
    }
    case "review_only":
      return getReviewOnlyCards(count);
    case "favorite": {
      // お気に入りカードのみ（テンプレート除外）
      const allCards = await storage.getAllCards();
      const favoriteCards = allCards.filter(
        card => card.isFavorite && card.source_type !== "template"
      );
      const shuffled = shuffleCards(favoriteCards);
      return shuffled.slice(0, Math.min(count, favoriteCards.length));
    }
    case "weak": {
      // 苦手カード（NGが多いカード）を優先（テンプレート除外）
      const allCards = await storage.getAllCards();
      const userCards = allCards.filter(card => card.source_type !== "template");
      const allReviews = await storage.getAllReviews();
      const ngCounts = new Map<string, number>();
      
      for (const review of allReviews) {
        if (review.lastResult === "NG") {
          ngCounts.set(review.cardId, (ngCounts.get(review.cardId) || 0) + 1);
        }
      }
      
      // NGが多い順にソート
      const weakCards = userCards
        .filter(card => ngCounts.has(card.id))
        .sort((a, b) => (ngCounts.get(b.id) || 0) - (ngCounts.get(a.id) || 0));
      
      const shuffled = shuffleCards(weakCards);
      return shuffled.slice(0, Math.min(count, weakCards.length));
    }
    case "random": {
      // 完全ランダム（テンプレート除外）
      const allCards = await storage.getAllCards();
      const userCards = allCards.filter(card => card.source_type !== "template");
      const shuffled = shuffleCards(userCards);
      return shuffled.slice(0, count);
    }
    case "speed": {
      // スピードチャレンジ（お気に入り優先、テンプレート除外）
      const allCards = await storage.getAllCards();
      const userCards = allCards.filter(card => card.source_type !== "template");
      const favoriteCards = userCards.filter(card => card.isFavorite);
      const normalCards = userCards.filter(card => !card.isFavorite);
      const shuffledFavorites = shuffleCards(favoriteCards);
      const shuffledNormal = shuffleCards(normalCards);
      return [...shuffledFavorites, ...shuffledNormal].slice(0, count);
    }
    case "shuffle": {
      const allCards = await storage.getAllCards();
      const userCards = allCards.filter(card => card.source_type !== "template");
      const shuffled = shuffleCards(userCards);
      return shuffled.slice(0, count);
    }
    case "typing": {
      const allCards = await storage.getAllCards();
      const userCards = allCards.filter(card => card.source_type !== "template");
      const shuffled = shuffleCards(userCards);
      return shuffled.slice(0, count);
    }
    case "focus": {
      const allCards = await storage.getAllCards();
      const userCards = allCards.filter(card => card.source_type !== "template");
      const shuffled = shuffleCards(userCards);
      return shuffled.slice(0, count);
    }
    case "flashcard": {
      // フラッシュカードモード: 重要単語のみを抽出（テンプレート除外）
      const allCards = await storage.getAllCards();
      const userCards = allCards.filter(card => card.source_type !== "template");
      const flashcardWords: Array<{ word: string; card: Card }> = [];
      
      for (const card of userCards) {
        const words = getImportantWords(card);
        for (const word of words) {
          flashcardWords.push({ word, card });
        }
      }
      
      // 重複を除去してランダムに選択
      const uniqueWords = new Map<string, Card>();
      for (const item of flashcardWords) {
        if (!uniqueWords.has(item.word.toLowerCase())) {
          uniqueWords.set(item.word.toLowerCase(), item.card);
        }
      }
      
      const shuffled = shuffleCards(Array.from(uniqueWords.values()));
      return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    case "normal":
    default: {
      // 通常モード: getTodayCardsを使用
      const { getTodayCards } = await import("./learning");
      return getTodayCards(count);
    }
  }
}

