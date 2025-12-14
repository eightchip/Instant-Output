"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson, Card } from "@/types/models";
import MessageDialog from "@/components/MessageDialog";

export default function CardSelectPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
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
    const filteredCards = getFilteredCards();
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredCards.map((c) => c.id)));
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  const filteredCards = getFilteredCards();

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
            <span className="font-semibold text-blue-800">
              {selectedCards.size}件のカードを選択中
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {selectedCards.size === filteredCards.length ? "すべて解除" : "すべて選択"}
            </button>
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
          {filteredCards.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">
                {searchQuery ? "検索結果が見つかりませんでした。" : "カードがありません。"}
              </p>
            </div>
          ) : (
            filteredCards.map((card) => (
              <div
                key={card.id}
                className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  selectedCards.has(card.id)
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : ""
                }`}
                onClick={() => toggleCardSelection(card.id)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCards.has(card.id)}
                    onChange={() => toggleCardSelection(card.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 text-blue-600 rounded mt-1"
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
                      <p className="text-gray-600 text-sm mb-1">日本語</p>
                      <p className="text-lg font-semibold">{card.prompt_jp}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">英語</p>
                      <p className="text-lg">{card.target_en}</p>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      タイプ: {card.source_type}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
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

