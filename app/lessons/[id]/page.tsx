"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson, Card } from "@/types/models";

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (lessonId) {
      loadData();
    }
  }, [lessonId]);

  async function loadData() {
    try {
      await storage.init();
      const [lessonData, cardsData] = await Promise.all([
        storage.getLesson(lessonId),
        storage.getCardsByLesson(lessonId),
      ]);
      setLesson(lessonData);
      setCards(cardsData || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
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
          <button
            onClick={() => router.push("/lessons")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={() => router.push(`/cards/new?lessonId=${lessonId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            + カードを追加
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          カード数: {cards.length}
        </div>

        {cards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">このレッスンにはまだカードがありません。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-2">
                  <p className="text-gray-600 text-sm mb-1">日本語</p>
                  <p className="text-lg font-semibold">{card.prompt_jp}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">英語</p>
                  <p className="text-lg">{card.target_en}</p>
                </div>
                <div className="mt-2 text-xs text-gray-500 mb-3">
                  タイプ: {card.source_type}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/cards/${card.id}/edit`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                  >
                    編集
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("このカードを削除しますか？")) {
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
                          alert("カードの削除に失敗しました。");
                        }
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

