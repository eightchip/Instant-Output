"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Draft, DraftCard } from "@/types/ai-card";
import { Card } from "@/types/models";
import MessageDialog from "@/components/MessageDialog";
import LoadingSpinner from "@/components/LoadingSpinner";

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [filteredCards, setFilteredCards] = useState<DraftCard[]>([]);
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCard, setEditingCard] = useState<DraftCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (draftId) {
      loadDraft();
      loadLessons();
    }
  }, [draftId]);

  async function loadDraft() {
    try {
      await storage.init();
      const draftData = await storage.getDraft(draftId!);
      if (!draftData) {
        setMessageDialog({
          isOpen: true,
          title: "ドラフトが見つかりません",
          message: "ドラフトが見つかりません。",
        });
        setTimeout(() => {
          router.push("/cards/ai-card");
        }, 1500);
        return;
      }
      setDraft(draftData);
      setFilteredCards(draftData.cards);
      // 初期状態ではすべて選択
      setSelectedCards(new Set(draftData.cards.map((_, i) => i)));
    } catch (error) {
      console.error("Failed to load draft:", error);
      setMessageDialog({
        isOpen: true,
        title: "読み込みエラー",
        message: "ドラフトの読み込みに失敗しました。",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLessons() {
    try {
      await storage.init();
      const allLessons = await storage.getAllLessons();
      setLessons(allLessons);
      if (allLessons.length > 0) {
        setSelectedLessonId(allLessons[0].id);
      }
    } catch (error) {
      console.error("Failed to load lessons:", error);
    }
  }

  const toggleCardSelection = (index: number) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCards(newSelected);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingCard({ ...filteredCards[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editingCard) return;
    const updated = [...filteredCards];
    updated[editingIndex] = editingCard;
    setFilteredCards(updated);
    setEditingIndex(null);
    setEditingCard(null);
  };

  const handleFilter = () => {
    if (!draft) return;
    if (showNeedsReview) {
      setFilteredCards(draft.cards.filter((c) => c.needsReview));
    } else {
      setFilteredCards(draft.cards);
    }
  };

  useEffect(() => {
    handleFilter();
  }, [showNeedsReview, draft]);

  const handleSaveCards = async () => {
    if (!selectedLessonId) {
      setMessageDialog({
        isOpen: true,
        title: "レッスンが選択されていません",
        message: "レッスンを選択してください。",
      });
      return;
    }

    if (selectedCards.size === 0) {
      setMessageDialog({
        isOpen: true,
        title: "カードが選択されていません",
        message: "少なくとも1つのカードを選択してください。",
      });
      return;
    }

    setIsSaving(true);
    try {
      await storage.init();
      
      // 画像データを取得（sourceから）
      let imageData: string | undefined = undefined;
      if (draft?.sourceId) {
        const source = await storage.getSource(draft.sourceId);
        if (source?.imageId) {
          imageData = source.imageId; // base64データ
        }
      }
      
      const selectedIndices = Array.from(selectedCards);
      const cardsToSave = selectedIndices.map((index) => {
        const draftCard = filteredCards[index];
        const card: Card = {
          id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lessonId: selectedLessonId,
          prompt_jp: draftCard.jp,
          target_en: draftCard.en,
          source_type: "screenshot",
          imageData: imageData, // 画像データを保存
        };
        return card;
      });

      for (const card of cardsToSave) {
        await storage.saveCard(card);
      }

      setMessageDialog({
        isOpen: true,
        title: "保存完了",
        message: `${cardsToSave.length}枚のカードを保存しました！`,
      });
      setTimeout(() => {
        router.push(`/lessons/${selectedLessonId}`);
      }, 1000);
    } catch (error) {
      console.error("Failed to save cards:", error);
      setMessageDialog({
        isOpen: true,
        title: "保存エラー",
        message: "カードの保存に失敗しました。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen text="カード候補を読み込み中..." />;
  }

  if (!draft) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">カード候補のレビュー</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        {/* 統計情報 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">総カード数</p>
              <p className="text-2xl font-bold">{draft.cards.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">レビュー必要</p>
              <p className="text-2xl font-bold text-yellow-600">
                {draft.cards.filter((c) => c.needsReview).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">選択中</p>
              <p className="text-2xl font-bold text-blue-600">
                {selectedCards.size}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">検出文数</p>
              <p className="text-2xl font-bold">{draft.detected.sentenceCount}</p>
            </div>
          </div>
        </div>

        {/* 警告 */}
        {draft.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">警告</h3>
            <ul className="list-disc list-inside text-sm text-yellow-700">
              {draft.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* フィルタと保存 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showNeedsReview}
                onChange={(e) => setShowNeedsReview(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">レビュー必要のみ表示</span>
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900"
            >
              <option value="">レッスンを選択...</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveCards}
              disabled={isSaving || selectedCards.size === 0 || !selectedLessonId}
              className="ml-auto bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isSaving ? "保存中..." : `選択した${selectedCards.size}枚を保存`}</span>
            </button>
          </div>
        </div>

        {/* カードリスト */}
        <div className="space-y-3">
          {filteredCards.map((card, index) => {
            const isSelected = selectedCards.has(index);
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                className={`bg-white rounded-lg shadow p-4 border-2 ${
                  isSelected ? "border-blue-500" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCardSelection(index)}
                    className="mt-2 w-4 h-4"
                  />
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold mb-1">
                            英語
                          </label>
                          <textarea
                            value={editingCard!.en}
                            onChange={(e) =>
                              setEditingCard({ ...editingCard!, en: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1">
                            日本語
                          </label>
                          <textarea
                            value={editingCard!.jp}
                            onChange={(e) =>
                              setEditingCard({ ...editingCard!, jp: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingIndex(null);
                              setEditingCard(null);
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2">
                          <p className="text-sm text-gray-600 mb-1">英語</p>
                          <p className="text-lg font-semibold">{card.en}</p>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-gray-600 mb-1">日本語</p>
                          <p className="text-lg">{card.jp}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {card.needsReview && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                              レビュー必要
                            </span>
                          )}
                          {card.flags.length > 0 && (
                            <div className="flex gap-1">
                              {card.flags.map((flag, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-gray-500">
                            信頼度: {Math.round(card.confidence * 100)}%
                          </span>
                          <button
                            onClick={() => handleEdit(index)}
                            className="ml-auto text-sm text-blue-600 hover:text-blue-800"
                          >
                            編集
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

export default function ReviewPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="読み込み中..." />}>
      <ReviewContent />
    </Suspense>
  );
}

