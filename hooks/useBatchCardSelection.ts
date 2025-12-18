import { useState, useCallback } from "react";
import { storage } from "@/lib/storage";
import { Card } from "@/types/models";

interface UseBatchCardSelectionOptions {
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
}

export function useBatchCardSelection(
  cards: Card[],
  options: UseBatchCardSelectionOptions = {}
) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleCardSelection = useCallback((cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (filteredCards?: Card[]) => {
      const targetCards = filteredCards || cards;
      if (selectedCards.size === targetCards.length) {
        setSelectedCards(new Set());
      } else {
        setSelectedCards(new Set(targetCards.map((c) => c.id)));
      }
    },
    [cards, selectedCards.size]
  );

  const clearSelection = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  const handleBatchDelete = useCallback(
    async (cardIds: string[]): Promise<boolean> => {
      if (cardIds.length === 0) {
        return false;
      }

      setIsDeleting(true);
      try {
        await storage.init();

        // 関連するレビューも削除
        for (const cardId of cardIds) {
          try {
            const review = await storage.getReview(cardId);
            if (review) {
              await storage.deleteReview(cardId);
            }
          } catch (error) {
            // レビューが存在しない場合は無視
            console.warn(`Review not found for card ${cardId}:`, error);
          }
        }

        await storage.deleteCards(cardIds);
        setSelectedCards(new Set());
        options.onDeleteSuccess?.();
        return true;
      } catch (error) {
        console.error("Failed to delete cards:", error);
        options.onDeleteError?.(error as Error);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [options]
  );

  return {
    selectedCards,
    isDeleting,
    toggleCardSelection,
    toggleSelectAll,
    clearSelection,
    handleBatchDelete,
    setSelectedCards,
  };
}





