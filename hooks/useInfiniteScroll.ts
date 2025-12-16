import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions {
  initialCount?: number;
  increment?: number;
  threshold?: number;
}

export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions = {}
) {
  const {
    initialCount = 20,
    increment = 20,
    threshold = 200, // スクロール位置が最下部から200px以内になったら読み込む
  } = options;

  const [displayCount, setDisplayCount] = useState(initialCount);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const displayedItems = items.slice(0, displayCount);
  const hasMore = displayCount < items.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => Math.min(prev + increment, items.length));
    }
  }, [hasMore, increment, items.length]);

  useEffect(() => {
    // アイテム数が変わったら表示数をリセット
    setDisplayCount(initialCount);
  }, [items.length, initialCount]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    // Intersection Observerを使用して無限スクロールを実装
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadMore, threshold]);

  const Sentinel = () => (
    <div ref={sentinelRef} className="h-4 w-full" />
  );

  return {
    displayedItems,
    hasMore,
    loadMore,
    Sentinel,
  };
}

