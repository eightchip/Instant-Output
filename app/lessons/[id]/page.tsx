"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson, Card, Review } from "@/types/models";
import MessageDialog from "@/components/MessageDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import AudioPlaybackButton from "@/components/AudioPlaybackButton";
import CardEditor from "@/components/CardEditor";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import InfiniteScrollSentinel from "@/components/InfiniteScrollSentinel";

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [sortBy, setSortBy] = useState<"order" | "created" | "alphabetical">("order");
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // ソート済みカード
  const sortedCards = [...cards].sort((a, b) => {
    if (sortBy === "order") {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      if (a.createdAt && b.createdAt) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      return 0;
    } else if (sortBy === "created") {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.getTime() - a.createdAt.getTime(); // 新しい順
      }
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      return 0;
    } else {
      // alphabetical
      return a.target_en.localeCompare(b.target_en);
    }
  });

  const { displayedItems, sentinelRef } = useInfiniteScroll(sortedCards, {
    initialCount: 20,
    increment: 20,
  });

  useEffect(() => {
    if (lessonId) {
      loadData();
    }
  }, [lessonId]);

  async function loadData() {
    try {
      await storage.init();
      const [lessonData, cardsData, lessonsData, allReviews] = await Promise.all([
        storage.getLesson(lessonId),
        storage.getCardsByLesson(lessonId),
        storage.getAllLessons(),
        storage.getAllReviews(),
      ]);
      setLesson(lessonData);
      // テンプレートカードを除外
      const userCards = (cardsData || []).filter(card => card.source_type !== "template");
      setCards(userCards);
      setAllLessons(lessonsData);
      
      // 復習情報をマップに変換
      const reviewsMap = new Map<string, Review>();
      for (const review of allReviews) {
        reviewsMap.set(review.cardId, review);
      }
      setReviews(reviewsMap);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCardReorder(draggedId: string, targetId: string) {
    try {
      await storage.init();
      
      // 現在のカード順序を取得
      const currentCards = [...cards];
      const draggedIndex = currentCards.findIndex(c => c.id === draggedId);
      const targetIndex = currentCards.findIndex(c => c.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      // カードを移動
      const [movedCard] = currentCards.splice(draggedIndex, 1);
      currentCards.splice(targetIndex, 0, movedCard);
      
      // 新しいorderを設定
      const updates: Promise<void>[] = [];
      for (let i = 0; i < currentCards.length; i++) {
        const card = currentCards[i];
        if (card.order !== i) {
          updates.push(storage.updateCard(card.id, { order: i }));
        }
      }
      
      await Promise.all(updates);
      await loadData();
      
      setMessageDialog({
        isOpen: true,
        title: "並び替え完了",
        message: "カードの順序を更新しました。",
      });
    } catch (error) {
      console.error("Failed to reorder cards:", error);
      setMessageDialog({
        isOpen: true,
        title: "エラー",
        message: "カードの並び替えに失敗しました。",
      });
    }
  }

  function toggleCardSelection(cardId: string) {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map((c) => c.id)));
    }
  }

  async function handleBatchDelete() {
    if (selectedCards.size === 0) {
      setMessageDialog({
        isOpen: true,
        title: "カードが選択されていません",
        message: "削除するカードを選択してください。",
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "カードを削除",
      message: `${selectedCards.size}枚のカードを削除しますか？\nこの操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        try {
          await storage.init();
          const cardIds = Array.from(selectedCards);
          
          // 関連するレビューも削除
          for (const cardId of cardIds) {
            const review = await storage.getReview(cardId);
            if (review) {
              await storage.deleteReview(cardId);
            }
          }
          
          await storage.deleteCards(cardIds);
          setSelectedCards(new Set());
          setIsBatchMode(false);
          await loadData();
          setMessageDialog({
            isOpen: true,
            title: "削除完了",
            message: `${cardIds.length}枚のカードを削除しました。`,
          });
        } catch (error) {
          console.error("Failed to delete cards:", error);
          setMessageDialog({
            isOpen: true,
            title: "削除エラー",
            message: "カードの削除に失敗しました。",
          });
        }
      },
    });
  }

  async function handleBatchMove(targetLessonId: string) {
    if (selectedCards.size === 0) {
      setMessageDialog({
        isOpen: true,
        title: "カードが選択されていません",
        message: "移動するカードを選択してください。",
      });
      return;
    }

    if (targetLessonId === lessonId) {
      setMessageDialog({
        isOpen: true,
        title: "移動エラー",
        message: "同じレッスンに移動することはできません。",
      });
      return;
    }

    try {
      await storage.init();
      const cardIds = Array.from(selectedCards);
      await storage.moveCardsToLesson(cardIds, targetLessonId);
      setSelectedCards(new Set());
      setIsBatchMode(false);
      setShowMoveDialog(false);
      await loadData();
      setMessageDialog({
        isOpen: true,
        title: "移動完了",
        message: `${cardIds.length}枚のカードを移動しました。`,
      });
    } catch (error) {
      console.error("Failed to move cards:", error);
      setMessageDialog({
        isOpen: true,
        title: "移動エラー",
        message: "カードの移動に失敗しました。",
      });
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="レッスンを読み込み中..." />;
  }

  if (!lesson) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">レッスンが見つかりません。</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: "レッスンを削除",
                  message: `レッスン「${lesson.title}」とその中のすべてのカードを削除しますか？\nこの操作は取り消せません。`,
                  onConfirm: async () => {
                    setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
                    try {
                      await storage.init();
                      // レッスンに属するカードを取得
                      const cards = await storage.getCardsByLesson(lessonId);
                      // カードとレビューを削除
                      for (const card of cards) {
                        const review = await storage.getReview(card.id);
                        if (review) {
                          await storage.deleteReview(card.id);
                        }
                        await storage.deleteCard(card.id);
                      }
                      // レッスンを削除
                      await storage.deleteLesson(lessonId);
                      setMessageDialog({
                        isOpen: true,
                        title: "削除完了",
                        message: "レッスンを削除しました。",
                      });
                      setTimeout(() => {
                        router.push("/lessons");
                      }, 1000);
                    } catch (error) {
                      console.error("Failed to delete lesson:", error);
                      setMessageDialog({
                        isOpen: true,
                        title: "削除エラー",
                        message: "レッスンの削除に失敗しました。",
                      });
                    }
                  },
                });
              }}
              className="btn-danger"
            >
              削除
            </button>
            <button
              onClick={() => router.push("/lessons")}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 戻る
            </button>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/cards/new?lessonId=${lessonId}`)}
                className="btn-primary"
              >
                + カードを追加
              </button>
              {cards.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setIsBatchMode(!isBatchMode);
                      setSelectedCards(new Set());
                    }}
                    className={`font-bold py-2 px-4 rounded-lg transition-all ${
                      isBatchMode
                        ? "bg-gray-600 hover:bg-gray-700 text-white shadow-md"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    {isBatchMode ? "一括操作を終了" : "一括操作"}
                  </button>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">並び替え:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "order" | "created" | "alphabetical")}
                      className="text-sm border-0 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="order">登録順</option>
                      <option value="created">作成日時</option>
                      <option value="alphabetical">アルファベット順</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="text-sm text-gray-600">
              カード数: {cards.length}
              {isBatchMode && selectedCards.size > 0 && (
                <span className="ml-2 text-blue-600 font-semibold">
                  ({selectedCards.size}件選択中)
                </span>
              )}
            </div>
          </div>
        </div>

        {isBatchMode && selectedCards.size > 0 && (
          <div className="mb-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-blue-800">
                {selectedCards.size}件のカードを選択中
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {selectedCards.size === cards.length ? "すべて解除" : "すべて選択"}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMoveDialog(true)}
                className="btn-success text-sm"
              >
                レッスンに移動
              </button>
              <button
                onClick={handleBatchDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
              >
                選択したカードを削除
              </button>
            </div>
          </div>
        )}

        {showMoveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">レッスンを選択</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {allLessons
                  .filter((l) => l.id !== lessonId)
                  .map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleBatchMove(l.id)}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg p-3"
                    >
                      <div className="font-semibold">{l.title}</div>
                    </button>
                  ))}
              </div>
              {allLessons.filter((l) => l.id !== lessonId).length === 0 && (
                <p className="text-gray-600 mb-4">移動先のレッスンがありません。</p>
              )}
              <button
                onClick={() => setShowMoveDialog(false)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">カードがありません</h3>
            <p className="text-gray-600 mb-6">
              このレッスンにカードを追加して、学習を始めましょう。
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => router.push(`/cards/new?lessonId=${lesson.id}`)}
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
          <div className="space-y-3">
            {displayedItems.map((card) => (
                    <div
                      key={card.id}
                className={`card-base p-4 hover-lift animate-fade-in ${
                  isBatchMode && selectedCards.has(card.id)
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : ""
                }`}
              >
                {isBatchMode && (
                  <div className="mb-3">
                    <input
                      type="checkbox"
                      checked={selectedCards.has(card.id)}
                      onChange={() => toggleCardSelection(card.id)}
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
                {/* 学習進捗表示 */}
                {reviews.has(card.id) && (() => {
                  const review = reviews.get(card.id)!;
                  const now = new Date();
                  const isOverdue = review.dueDate <= now;
                  const daysUntilDue = Math.ceil((review.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const resultColors = {
                    OK: "bg-green-100 text-green-700 border-green-300",
                    MAYBE: "bg-yellow-100 text-yellow-700 border-yellow-300",
                    NG: "bg-red-100 text-red-700 border-red-300",
                  };
                  return (
                    <div className={`mb-3 px-3 py-2 rounded-lg border-2 ${resultColors[review.lastResult]}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          前回: {review.lastResult === "OK" ? "✓ 正解" : review.lastResult === "MAYBE" ? "△ 部分正解" : "✗ 不正解"}
                        </span>
                        <span className={isOverdue ? "font-bold text-red-600" : ""}>
                          {isOverdue ? `期限超過 ${Math.abs(daysUntilDue)}日` : `次回まで ${daysUntilDue}日`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <div className="mb-2">
                  <p className="text-gray-600 text-sm mb-1">日本語</p>
                  <p className="text-lg font-semibold">{card.prompt_jp}</p>
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
                  <p className="text-lg">{card.target_en}</p>
                </div>
                <div className="mt-2 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {card.imageData && (
                      <button
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
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        📷 元画像を表示
                      </button>
                    )}
                  </div>
                  {!isBatchMode && (
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
                  )}
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCardId(card.id)}
                        className="flex-1 btn-primary text-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: "カードを削除",
                            message: "このカードを削除しますか？\nこの操作は取り消せません。",
                            onConfirm: async () => {
                              setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
                              try {
                                await storage.init();
                                const review = await storage.getReview(card.id);
                                if (review) {
                                  await storage.deleteReview(card.id);
                                }
                                await storage.deleteCard(card.id);
                                await loadData();
                              } catch (error) {
                                console.error("Failed to delete card:", error);
                                setMessageDialog({
                                  isOpen: true,
                                  title: "削除エラー",
                                  message: "カードの削除に失敗しました。",
                                });
                              }
                            },
                          });
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                      >
                        削除
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
            <InfiniteScrollSentinel sentinelRef={sentinelRef} />
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
        onConfirm={() => {
          confirmDialog.onConfirm();
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
        variant="danger"
      />
    </div>
  );
}

