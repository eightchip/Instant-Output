"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card, Lesson, SourceType } from "@/types/models";
import { highlightText } from "@/lib/highlight";

type FilterType = {
  lessonId?: string;
  sourceType?: SourceType;
  hasReview?: boolean;
};

export default function CardSearchPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterType>({});
  const [isLoading, setIsLoading] = useState(true);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [cards, searchQuery, filters]);

  async function loadData() {
    try {
      await storage.init();
      const [allCards, allLessons] = await Promise.all([
        storage.getAllCards(),
        storage.getAllLessons(),
      ]);
      // テンプレートカードを除外
      const userCards = allCards.filter(card => card.source_type !== "template");
      setCards(userCards);
      setLessons(allLessons);
      setFilteredCards(userCards);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...cards];

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.prompt_jp.toLowerCase().includes(query) ||
          card.target_en.toLowerCase().includes(query)
      );
    }

    // レッスンでフィルタ
    if (filters.lessonId) {
      filtered = filtered.filter(
        (card) => card.lessonId === filters.lessonId
      );
    }

    // タイプでフィルタ
    if (filters.sourceType) {
      filtered = filtered.filter(
        (card) => card.source_type === filters.sourceType
      );
    }

    setFilteredCards(filtered);
  }

  function handleFilterChange(key: keyof FilterType, value: any) {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }

  function clearFilters() {
    setSearchQuery("");
    setFilters({});
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">カード検索</h1>
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← ホーム
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4 mb-6">
          {/* 検索バー */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              検索（日本語・英語）
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>

          {/* フィルタ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">レッスン</label>
              <select
                value={filters.lessonId || ""}
                onChange={(e) => handleFilterChange("lessonId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">すべて</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">タイプ</label>
              <select
                value={filters.sourceType || ""}
                onChange={(e) =>
                  handleFilterChange("sourceType", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">すべて</option>
                <option value="manual_pair">手入力（日英ペア）</option>
                <option value="manual_en">手入力（英語のみ）</option>
                <option value="screenshot">スクリーンショット</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                フィルタ
              </label>
              <button
                onClick={clearFilters}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
              >
                リセット
              </button>
            </div>
          </div>
        </div>

        {/* 結果表示 */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredCards.length} / {cards.length} 件
        </div>

        {filteredCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">該当するカードがありません。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                {/* 画像サムネイル */}
                {card.imageData && (
                  <div className="mb-3">
                    <img
                      src={card.imageData}
                      alt="元画像"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const modal = document.createElement("div");
                        modal.className = "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
                        modal.onclick = () => modal.remove();
                        const img = document.createElement("img");
                        img.src = card.imageData!;
                        img.className = "max-w-full max-h-full object-contain";
                        img.onclick = (e) => e.stopPropagation();
                        modal.appendChild(img);
                        document.body.appendChild(modal);
                      }}
                    />
                  </div>
                )}
                <div className="mb-2">
                  <p className="text-gray-600 text-sm mb-1">日本語</p>
                  <p className="text-lg font-semibold">
                    {highlightText(card.prompt_jp, searchQuery)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">英語</p>
                  <p className="text-lg whitespace-pre-wrap break-words">
                    {highlightText(card.target_en, searchQuery)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>タイプ: {card.source_type}</span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await storage.init();
                          await storage.updateCard(card.id, { isFavorite: !card.isFavorite });
                          await loadData();
                        } catch (error) {
                          console.error("Failed to toggle favorite:", error);
                          setMessageDialog({
                            isOpen: true,
                            title: "更新エラー",
                            message: "お気に入りの更新に失敗しました。",
                          });
                        }
                      }}
                      className={`text-lg ${card.isFavorite ? "text-yellow-500" : "text-gray-300"} hover:text-yellow-500 transition-colors`}
                      title={card.isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
                    >
                      {card.isFavorite ? "✅" : "⬜"}
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/cards/${card.id}/edit`)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    編集
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
}

