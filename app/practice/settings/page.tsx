"use client";

import { useState, useEffect } from "react";
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

interface RecentSettings {
  category: PracticeCategory;
  mode: PracticeMode;
  count: number;
  timestamp: number;
}

export default function PracticeSettingsPage() {
  const router = useRouter();
  const [category, setCategory] = useState<PracticeCategory>("normal");
  const [selectedMode, setSelectedMode] = useState<PracticeMode>("normal");
  const [cardCount, setCardCount] = useState(5);
  const [recentSettings, setRecentSettings] = useState<RecentSettings | null>(null);

  // 最近使用した設定を読み込む
  useEffect(() => {
    const saved = localStorage.getItem("practiceSettings");
    if (saved) {
      try {
        const settings: RecentSettings = JSON.parse(saved);
        // 24時間以内の設定のみ有効
        if (Date.now() - settings.timestamp < 24 * 60 * 60 * 1000) {
          setRecentSettings(settings);
          setCategory(settings.category);
          setSelectedMode(settings.mode);
          setCardCount(settings.count);
        }
      } catch (e) {
        // パースエラーは無視
      }
    }
  }, []);

  const availableModes = MODE_OPTIONS.filter((m) =>
    m.availableCategories.includes(category)
  );

  const selectedModeOption = MODE_OPTIONS.find((m) => m.mode === selectedMode);
  const defaultCount = selectedModeOption?.defaultCount || 5;

  const handleStart = () => {
    // 設定を保存
    const settings: RecentSettings = {
      category,
      mode: selectedMode,
      count: cardCount,
      timestamp: Date.now(),
    };
    localStorage.setItem("practiceSettings", JSON.stringify(settings));

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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ⚙️ 学習設定
          </h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            ← 戻る
          </button>
        </div>

        {/* 最近使用した設定 */}
        {recentSettings && (
          <div className="mb-6 bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-blue-800 mb-1">📌 前回の設定</div>
                <div className="text-xs text-blue-700">
                  {recentSettings.category === "normal" && "📚 通常学習"}
                  {recentSettings.category === "favorite" && "⭐ お気に入り"}
                  {recentSettings.category === "weak" && "💪 苦手克服"}
                  {recentSettings.category === "custom" && "🎯 カード選択"}
                  {" "}・ {MODE_OPTIONS.find(m => m.mode === recentSettings.mode)?.label} ・ {recentSettings.count}問
                </div>
              </div>
              <button
                onClick={() => {
                  setCategory(recentSettings.category);
                  setSelectedMode(recentSettings.mode);
                  setCardCount(recentSettings.count);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                適用
              </button>
            </div>
          </div>
        )}

        {/* カテゴリ選択 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <h2 className="text-lg font-black text-gray-800 mb-4">カテゴリ</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setCategory("normal");
                setSelectedMode("normal");
                setCardCount(5);
              }}
              className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                category === "normal"
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg"
                  : "border-gray-200 hover:border-blue-200 bg-white hover:shadow-md"
              }`}
            >
              <div className="text-3xl mb-2">📚</div>
              <div className="font-bold text-gray-800">通常学習</div>
            </button>
            <button
              onClick={() => {
                setCategory("favorite");
                setSelectedMode("typing");
                setCardCount(10);
              }}
              className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                category === "favorite"
                  ? "border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg"
                  : "border-gray-200 hover:border-yellow-200 bg-white hover:shadow-md"
              }`}
            >
              <div className="text-3xl mb-2">⭐</div>
              <div className="font-bold text-gray-800">お気に入り</div>
            </button>
            <button
              onClick={() => {
                setCategory("weak");
                setSelectedMode("typing");
                setCardCount(10);
              }}
              className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                category === "weak"
                  ? "border-red-500 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg"
                  : "border-gray-200 hover:border-red-200 bg-white hover:shadow-md"
              }`}
            >
              <div className="text-3xl mb-2">💪</div>
              <div className="font-bold text-gray-800">苦手克服</div>
            </button>
            <button
              onClick={() => {
                setCategory("custom");
                setSelectedMode("typing");
                setCardCount(10);
              }}
              className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                category === "custom"
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                  : "border-gray-200 hover:border-green-200 bg-white hover:shadow-md"
              }`}
            >
              <div className="text-3xl mb-2">🎯</div>
              <div className="font-bold text-gray-800">カード選択</div>
            </button>
          </div>
        </div>

        {/* モード選択 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <h2 className="text-lg font-black text-gray-800 mb-4">学習モード</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableModes.map((modeOption) => (
              <button
                key={modeOption.mode}
                onClick={() => {
                  setSelectedMode(modeOption.mode);
                  setCardCount(modeOption.defaultCount);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-300 transform hover:scale-105 ${
                  selectedMode === modeOption.mode
                    ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-blue-200 bg-white hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{modeOption.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 mb-1">{modeOption.label}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{modeOption.description}</p>
                  </div>
                  {selectedMode === modeOption.mode && (
                    <div className="text-blue-600 text-xl">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 問題数設定 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <h2 className="text-lg font-black text-gray-800 mb-4">問題数</h2>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="range"
              min="1"
              max="50"
              value={cardCount}
              onChange={(e) => setCardCount(parseInt(e.target.value, 10))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="w-24 text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border-2 border-blue-200">
              <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {cardCount}
              </div>
              <div className="text-xs font-semibold text-gray-600">問</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 15, 20, 30, 50].map((count) => (
              <button
                key={count}
                onClick={() => setCardCount(count)}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                  cardCount === count
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-200 shadow-md hover:shadow-lg"
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

