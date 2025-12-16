"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson, Card } from "@/types/models";
import MessageDialog from "@/components/MessageDialog";
import { useBatchCardSelection } from "@/hooks/useBatchCardSelection";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import CardEditor from "@/components/CardEditor";
import AudioPlaybackButton from "@/components/AudioPlaybackButton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import InfiniteScrollSentinel from "@/components/InfiniteScrollSentinel";

export default function CardSelectPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
  } = useBatchCardSelection(cards, {
    onDeleteSuccess: () => {
      if (selectedLessonId) {
        loadCards(selectedLessonId);
      } else {
        loadAllCards();
      }
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
    loadLessons();
  }, []);

  useEffect(() => {
    if (selectedLessonId) {
      loadCards(selectedLessonId);
    } else {
      loadAllCards();
    }
  }, [selectedLessonId]);

  async function loadLessons() {
    try {
      await storage.init();
      const allLessons = await storage.getAllLessons();
      setLessons(allLessons);
    } catch (error) {
      console.error("Failed to load lessons:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCards(lessonId: string) {
    try {
      await storage.init();
      const lessonCards = await storage.getCardsByLesson(lessonId);
      // テンプレートカードを除外
      const userCards = lessonCards.filter(card => card.source_type !== "template");
      setCards(userCards);
    } catch (error) {
      console.error("Failed to load cards:", error);
    }
  }

  async function loadAllCards() {
    try {
      await storage.init();
      const allCards = await storage.getAllCards();
      // テンプレートカードを除外
      const userCards = allCards.filter(card => card.source_type !== "template");
      setCards(userCards);
    } catch (error) {
      console.error("Failed to load cards:", error);
    }
  }


  function getFilteredCards(): Card[] {
    if (!searchQuery.trim()) {
      return cards;
    }
    const query = searchQuery.toLowerCase();
    return cards.filter(
      (card) =>
        card.prompt_jp.toLowerCase().includes(query) ||
        card.target_en.toLowerCase().includes(query)
    );
  }

  const filteredCards = getFilteredCards();
  const { displayedItems, sentinelRef } = useInfiniteScroll(filteredCards, {
    initialCount: 20,
    increment: 20,
  });

  function handleStartPractice() {
    if (selectedCards.size === 0) {
      setMessageDialog({
        isOpen: true,
        title: "カードが選択されていません",
        message: "学習するカードを選択してください。",
      });
      return;
    }

    const cardIds = Array.from(selectedCards).join(",");
    router.push(`/practice?cards=${cardIds}&mode=custom`);
  }

  async function handleSaveCard(updatedCard: Card) {
    await storage.init();
    await storage.saveCard(updatedCard);
    if (selectedLessonId) {
      await loadCards(selectedLessonId);
    } else {
      await loadAllCards();
    }
    setEditingCardId(null);
  }

  async function handleDeleteCard(cardId: string) {
    await storage.init();
    await storage.deleteCard(cardId);
    if (selectedLessonId) {
      await loadCards(selectedLessonId);
    } else {
      await loadAllCards();
    }
    setEditingCardId(null);
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="カードを読み込み中..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">カードを選択</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        {/* レッスン選択 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold mb-2">
            レッスンで絞り込み
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedLessonId(null)}
              className={`px-4 py-2 rounded-lg font-semibold ${
                selectedLessonId === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              すべて
            </button>
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => setSelectedLessonId(lesson.id)}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  selectedLessonId === lesson.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {lesson.title}
              </button>
            ))}
          </div>
        </div>

        {/* 検索 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold mb-2">
            検索
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="日本語または英語で検索..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
        </div>

        {/* 選択状況と操作 */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
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
              <span className="font-semibold text-blue-800">
                {selectedCards.size}件のカードを選択中
              </span>
              <button
                onClick={() => toggleSelectAll(filteredCards)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {selectedCards.size === filteredCards.length ? "すべて解除" : "すべて選択"}
              </button>
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
          <button
            onClick={handleStartPractice}
            disabled={selectedCards.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
          >
            選択したカードで学習を開始
          </button>
        </div>

        {/* カード一覧 */}
        <div className="space-y-3">
          {displayedItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">{searchQuery ? "🔍" : "📚"}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {searchQuery ? "検索結果が見つかりませんでした" : "カードがありません"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? "検索条件を変更するか、新しいカードを作成してください。"
                  : "カードを追加して、学習を始めましょう。"}
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
          ) : (
            <>
              {displayedItems.map((card) => {
              if (editingCardId === card.id) {
                return (
                  <CardEditor
                    key={card.id}
                    card={card}
                    onSave={handleSaveCard}
                    onCancel={() => setEditingCardId(null)}
                    onDelete={handleDeleteCard}
                    showDelete={true}
                  />
                );
              }

              return (
                <div
                  key={card.id}
                  className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow ${
                    selectedCards.has(card.id)
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCards.has(card.id)}
                      onChange={() => toggleCardSelection(card.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 text-blue-600 rounded mt-1"
                      disabled={isBatchMode}
                    />
                    <div className="flex-1">
                      {/* 画像サムネイル */}
                      {card.imageData && (
                        <div className="mb-2">
                          <img
                            src={card.imageData}
                            alt="元画像"
                            className="w-20 h-20 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
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
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-gray-600 text-sm">日本語</p>
                          <AudioPlaybackButton
                            text={card.prompt_jp}
                            language="jp"
                            size="sm"
                          />
                        </div>
                        <p className="text-lg font-semibold">{card.prompt_jp}</p>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-gray-600 text-sm">英語</p>
                          <AudioPlaybackButton
                            text={card.target_en}
                            language="en"
                            size="sm"
                          />
                        </div>
                        <p className="text-lg">{card.target_en}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">
                          タイプ: {card.source_type}
                          {card.isFavorite && <span className="ml-2">⭐</span>}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCardId(card.id);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          編集
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
              <InfiniteScrollSentinel sentinelRef={sentinelRef} />
            </>
          )}
        </div>
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

