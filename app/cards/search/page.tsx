"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card, Lesson, SourceType } from "@/types/models";
import { highlightText } from "@/lib/highlight";
import MessageDialog from "@/components/MessageDialog";
import { useBatchCardSelection } from "@/hooks/useBatchCardSelection";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import AudioPlaybackButton from "@/components/AudioPlaybackButton";
import CardEditor from "@/components/CardEditor";

type FilterType = {
  lessonId?: string;
  sourceType?: SourceType;
  hasReview?: boolean;
  tag?: string;
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
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const {
    selectedCards,
    isDeleting,
    toggleCardSelection,
    toggleSelectAll,
    clearSelection,
    handleBatchDelete,
  } = useBatchCardSelection(filteredCards, {
    onDeleteSuccess: () => {
      loadData();
      setIsBatchMode(false);
      setMessageDialog({
        isOpen: true,
        title: "削除完了",
        message: "選択したカードを削除しました。",
      });
    },
    onDeleteError: (error) => {
      setMessageDialog({
        isOpen: true,
        title: "削除エラー",
        message: "カードの削除に失敗しました。",
      });
    },
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
          card.target_en.toLowerCase().includes(query) ||
          (card.tags && card.tags.some(tag => tag.toLowerCase().includes(query)))
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

    // タグでフィルタ
    if (filters.tag) {
      filtered = filtered.filter(
        (card) => card.tags && card.tags.includes(filters.tag!)
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
    return <LoadingSpinner fullScreen text="カードを検索中..." />;
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">レッスン</label>
              <select
                value={filters.lessonId || ""}
                onChange={(e) => handleFilterChange("lessonId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900"
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900"
              >
                <option value="">すべて</option>
                <option value="manual_pair">手入力（日英ペア）</option>
                <option value="manual_en">手入力（英語のみ）</option>
                <option value="screenshot">スクリーンショット</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">タグ</label>
              <select
                value={filters.tag || ""}
                onChange={(e) => handleFilterChange("tag", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900"
              >
                <option value="">すべて</option>
                {Array.from(
                  new Set(
                    cards
                      .flatMap((card) => card.tags || [])
                      .filter((tag) => tag.trim().length > 0)
                  )
                )
                  .sort()
                  .map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
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

        {/* 一括操作 */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setIsBatchMode(!isBatchMode);
                  if (isBatchMode) {
                    clearSelection();
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isBatchMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isBatchMode ? "一括操作を終了" : "一括操作"}
              </button>
              {isBatchMode && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedCards.size}件選択中
                  </span>
                  <button
                    onClick={() => toggleSelectAll(filteredCards)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {selectedCards.size === filteredCards.length ? "すべて解除" : "すべて選択"}
                  </button>
                </>
              )}
            </div>
            {isBatchMode && selectedCards.size > 0 && (
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: "カードを削除",
                    message: `${selectedCards.size}枚のカードを削除しますか？\nこの操作は取り消せません。`,
                  });
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all"
              >
                {isDeleting ? "削除中..." : "選択したカードを削除"}
              </button>
            )}
          </div>
        </div>

        {/* 結果表示 */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredCards.length} / {cards.length} 件
        </div>

        {filteredCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">該当するカードがありません</h3>
              <p className="text-gray-600 mb-6">
                検索条件を変更するか、新しいカードを作成してください。
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={() => router.push("/cards/new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  ➕ カードを追加
                </button>
                <button
                  onClick={() => router.push("/cards/screenshot")}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  📷 スクリーンショットから追加
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const { displayedItems, Sentinel } = useInfiniteScroll(filteredCards, {
                initialCount: 20,
                increment: 20,
              });
              return (
                <>
                  {displayedItems.map((card) => (
                    <div
                key={card.id}
                className={`card-base p-4 hover-lift animate-fade-in ${
                  isBatchMode && selectedCards.has(card.id)
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : ""
                } ${isBatchMode ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (isBatchMode) {
                    toggleCardSelection(card.id);
                  }
                }}
              >
                {isBatchMode && (
                  <div className="mb-3">
                    <input
                      type="checkbox"
                      checked={selectedCards.has(card.id)}
                      onChange={() => toggleCardSelection(card.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </div>
                )}
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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-gray-600 text-sm">英語</p>
                    <AudioPlaybackButton
                      text={card.target_en}
                      language="en"
                      size="sm"
                    />
                  </div>
                  <p className="text-lg whitespace-pre-wrap break-words">
                    {highlightText(card.target_en, searchQuery)}
                  </p>
                </div>
                {!isBatchMode && editingCardId === card.id ? (
                  <CardEditor
                    card={card}
                    onSave={async (updatedCard) => {
                      await storage.init();
                      await storage.saveCard(updatedCard);
                      await loadData();
                      setEditingCardId(null);
                    }}
                    onCancel={() => setEditingCardId(null)}
                    onDelete={async (cardId) => {
                      await storage.init();
                      const review = await storage.getReview(cardId);
                      if (review) {
                        await storage.deleteReview(cardId);
                      }
                      await storage.deleteCard(cardId);
                      await loadData();
                      setEditingCardId(null);
                    }}
                    showDelete={true}
                  />
                ) : (
                  !isBatchMode && (
                    <div className="mt-2 flex items-center justify-between">
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          card.isFavorite
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md hover:shadow-lg hover:scale-105"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105"
                        }`}
                        title={card.isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
                      >
                        <span>★</span>
                        <span>お気に入り</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCardId(card.id);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </button>
                    </div>
                  )
                )}
                    </div>
                  ))}
                  <Sentinel />
                </>
              );
            })()}
          </div>
        )}
      </main>
      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={async () => {
          setConfirmDialog({ isOpen: false, title: "", message: "" });
          const cardIds = Array.from(selectedCards);
          await handleBatchDelete(cardIds);
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "" })}
        variant="danger"
      />
    </div>
  );
}

