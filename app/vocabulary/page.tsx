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
  const [vocabulary, setVocabulary] = useState<Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"importance" | "count" | "difficulty">("importance");

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
      // 既知のイディオム辞書を使用（無料）
      const vocab = generateVocabularyList(userCards);
      setVocabulary(vocab);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const sortedVocabulary = Array.from(vocabulary.entries())
    .filter(([word]) => searchQuery === "" || word.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "importance") {
        return b[1].importance - a[1].importance; // 重要度順
      } else if (sortBy === "count") {
        return b[1].count - a[1].count; // 出現回数順
      } else {
        return b[1].difficulty - a[1].difficulty; // 難易度順
      }
    });

  if (isLoading) {
    return <LoadingSpinner fullScreen text="語彙リストを生成中..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            📚 語彙リスト
          </h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            ← ホーム
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="単語を検索..."
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
            />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-semibold text-gray-700">並び替え:</span>
            <button
              onClick={() => setSortBy("importance")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
                sortBy === "importance"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg"
              }`}
            >
              重要度順
            </button>
            <button
              onClick={() => setSortBy("difficulty")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
                sortBy === "difficulty"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg"
              }`}
            >
              難易度順
            </button>
            <button
              onClick={() => setSortBy("count")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
                sortBy === "count"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg"
              }`}
            >
              出現回数順
            </button>
          </div>
          <p className="text-sm text-gray-600">
            全{cards.length}枚のカードから {vocabulary.size}個の単語を抽出しました
          </p>
        </div>

        <div className="space-y-2">
          {sortedVocabulary.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-600">該当する単語がありません。</p>
            </div>
          ) : (
            sortedVocabulary.map(([word, data]) => (
              <div
                key={word}
                className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 border-2 ${
                  data.isIdiom 
                    ? "border-l-4 border-purple-500 bg-gradient-to-r from-purple-50/50 to-white" 
                    : "border-transparent hover:border-indigo-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-blue-900">{word}</span>
                      {data.isIdiom && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                          イディオム
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {data.count}回出現
                      </span>
                      <span className="text-xs text-gray-400">
                        難易度: {Math.round(data.difficulty)}
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

