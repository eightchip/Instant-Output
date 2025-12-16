"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PracticeMode } from "@/types/modes";

type PracticeCategory = "normal" | "favorite" | "weak" | "custom";

interface ModeOption {
  mode: PracticeMode;
  label: string;
  description: string;
  icon: string;
  defaultCount: number;
  availableCategories: PracticeCategory[];
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "normal",
    label: "通常モード",
    description: "今日の5問を学習します。復習カードを優先的に出題します。",
    icon: "📚",
    defaultCount: 5,
    availableCategories: ["normal"],
  },
  {
    mode: "typing",
    label: "タイピング練習",
    description: "タイピング速度を測定しながら学習します。",
    icon: "⌨️",
    defaultCount: 10,
    availableCategories: ["normal", "favorite", "weak", "custom"],
  },
  {
    mode: "shuffle",
    label: "シャッフルモード",
    description: "カードをランダムに並び替えて学習します。",
    icon: "🔀",
    defaultCount: 10,
    availableCategories: ["normal", "favorite", "weak", "custom"],
  },
  {
    mode: "focus",
    label: "集中モード",
    description: "タイマー付きで集中して学習します。25分間の集中学習。",
    icon: "⏱️",
    defaultCount: 20,
    availableCategories: ["normal", "favorite", "weak", "custom"],
  },
  {
    mode: "review_only",
    label: "復習専用モード",
    description: "復習が必要なカードのみを出題します。",
    icon: "🔄",
    defaultCount: 10,
    availableCategories: ["normal"],
  },
  {
    mode: "random",
    label: "完全ランダム",
    description: "すべてのカードから完全にランダムに出題します。",
    icon: "🎲",
    defaultCount: 15,
    availableCategories: ["normal"],
  },
  {
    mode: "speed",
    label: "スピードチャレンジ",
    description: "高速で学習します。",
    icon: "⚡",
    defaultCount: 20,
    availableCategories: ["normal", "favorite", "weak", "custom"],
  },
];

export default function PracticeSettingsPage() {
  const router = useRouter();
  const [category, setCategory] = useState<PracticeCategory>("normal");
  const [selectedMode, setSelectedMode] = useState<PracticeMode>("normal");
  const [cardCount, setCardCount] = useState(5);

  const availableModes = MODE_OPTIONS.filter((m) =>
    m.availableCategories.includes(category)
  );

  const selectedModeOption = MODE_OPTIONS.find((m) => m.mode === selectedMode);
  const defaultCount = selectedModeOption?.defaultCount || 5;

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", selectedMode);
    params.set("count", cardCount.toString());
    
    if (category === "favorite") {
      params.set("mode", "favorite");
    } else if (category === "weak") {
      params.set("mode", "weak");
    } else if (category === "custom") {
      // カスタムモードの場合はカード選択画面へ
      router.push("/practice/select");
      return;
    }
    
    router.push(`/practice?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">学習設定</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        {/* カテゴリ選択 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">カテゴリ</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setCategory("normal");
                setSelectedMode("normal");
                setCardCount(5);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                category === "normal"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">📚</div>
              <div className="font-semibold">通常学習</div>
            </button>
            <button
              onClick={() => {
                setCategory("favorite");
                setSelectedMode("typing");
                setCardCount(10);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                category === "favorite"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">⭐</div>
              <div className="font-semibold">お気に入り</div>
            </button>
            <button
              onClick={() => {
                setCategory("weak");
                setSelectedMode("typing");
                setCardCount(10);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                category === "weak"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">💪</div>
              <div className="font-semibold">苦手克服</div>
            </button>
            <button
              onClick={() => {
                setCategory("custom");
                setSelectedMode("typing");
                setCardCount(10);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                category === "custom"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-semibold">カード選択</div>
            </button>
          </div>
        </div>

        {/* モード選択 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">学習モード</h2>
          <div className="space-y-2">
            {availableModes.map((modeOption) => (
              <button
                key={modeOption.mode}
                onClick={() => {
                  setSelectedMode(modeOption.mode);
                  setCardCount(modeOption.defaultCount);
                }}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedMode === modeOption.mode
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{modeOption.icon}</span>
                      <h3 className="font-semibold">{modeOption.label}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{modeOption.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 問題数設定 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">問題数</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="50"
              value={cardCount}
              onChange={(e) => setCardCount(parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <div className="w-20 text-center">
              <div className="text-2xl font-bold">{cardCount}</div>
              <div className="text-xs text-gray-600">問</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {[5, 10, 15, 20, 30, 50].map((count) => (
              <button
                key={count}
                onClick={() => setCardCount(count)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  cardCount === count
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {count}問
              </button>
            ))}
          </div>
        </div>

        {/* 開始ボタン */}
        <button
          onClick={handleStart}
          className="w-full bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-700 text-white font-bold py-5 px-6 rounded-xl text-xl shadow-xl hover:shadow-2xl transition-all duration-300"
        >
          学習を開始
        </button>
      </main>
    </div>
  );
}

