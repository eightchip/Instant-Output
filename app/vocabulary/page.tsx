"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card } from "@/types/models";
import { generateVocabularyList, getImportantWords } from "@/lib/vocabulary";
import { tts } from "@/lib/tts";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function VocabularyPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [vocabulary, setVocabulary] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await storage.init();
      const allCards = await storage.getAllCards();
      // テンプレートカードを除外
      const userCards = allCards.filter(card => card.source_type !== "template");
      setCards(userCards);
      const vocab = generateVocabularyList(userCards);
      setVocabulary(vocab);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const sortedVocabulary = Array.from(vocabulary.entries())
    .sort((a, b) => b[1] - a[1]) // 出現回数でソート
    .filter(([word]) => searchQuery === "" || word.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) {
    return <LoadingSpinner fullScreen text="語彙リストを生成中..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">語彙リスト</h1>
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← ホーム
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="単語を検索..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <p className="text-sm text-gray-600">
            全{cards.length}枚のカードから {vocabulary.size}個の単語を抽出しました
          </p>
        </div>

        <div className="space-y-2">
          {sortedVocabulary.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">該当する単語がありません。</p>
            </div>
          ) : (
            sortedVocabulary.map(([word, count]) => (
              <div
                key={word}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-blue-900">{word}</span>
                      <span className="text-sm text-gray-500">
                        {count}回出現
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {cards
                        .filter(card => getImportantWords(card).includes(word.toLowerCase()))
                        .slice(0, 3)
                        .map(card => (
                          <div key={card.id} className="mb-1">
                            "{card.target_en}" - {card.prompt_jp}
                          </div>
                        ))}
                    </div>
                  </div>
                  {tts.isAvailable() && (
                    <button
                      onClick={() => tts.speak(word, "en", 1)}
                      className="ml-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                      title="音声読み上げ"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

