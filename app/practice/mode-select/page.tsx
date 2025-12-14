"use client";

import { useRouter } from "next/navigation";
import { PracticeMode } from "@/types/modes";

export default function ModeSelectPage() {
  const router = useRouter();

  const handleModeSelect = (mode: PracticeMode, cardCount?: number) => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (cardCount) {
      params.set("count", cardCount.toString());
    }
    router.push(`/practice?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">学習モードを選択</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        <div className="space-y-3">
          {/* 通常モード */}
          <button
            onClick={() => handleModeSelect("normal", 5)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">通常モード</h2>
                <p className="text-gray-600 text-sm">
                  今日の5問を学習します。復習カードを優先的に出題します。
                </p>
              </div>
              <span className="text-3xl">📚</span>
            </div>
          </button>

          {/* タイピング練習モード */}
          <button
            onClick={() => handleModeSelect("typing", 10)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">タイピング練習</h2>
                <p className="text-gray-600 text-sm">
                  タイピング速度を測定しながら10問を学習します。
                </p>
              </div>
              <span className="text-3xl">⌨️</span>
            </div>
          </button>

          {/* シャッフルモード */}
          <button
            onClick={() => handleModeSelect("shuffle", 10)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">シャッフルモード</h2>
                <p className="text-gray-600 text-sm">
                  カードをランダムに並び替えて10問を学習します。
                </p>
              </div>
              <span className="text-3xl">🔀</span>
            </div>
          </button>

          {/* 集中モード */}
          <button
            onClick={() => handleModeSelect("focus", 20)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">集中モード</h2>
                <p className="text-gray-600 text-sm">
                  タイマー付きで集中して学習します。25分間の集中学習。
                </p>
              </div>
              <span className="text-3xl">⏱️</span>
            </div>
          </button>

          {/* 復習専用モード */}
          <button
            onClick={() => handleModeSelect("review_only", 10)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">復習専用モード</h2>
                <p className="text-gray-600 text-sm">
                  復習が必要なカードのみを出題します。
                </p>
              </div>
              <span className="text-3xl">🔄</span>
            </div>
          </button>

          {/* お気に入り専用モード */}
          <button
            onClick={() => handleModeSelect("favorite", 10)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">お気に入りモード</h2>
                <p className="text-gray-600 text-sm">
                  お気に入りに登録したカードのみを学習します。
                </p>
              </div>
              <span className="text-3xl">⭐</span>
            </div>
          </button>

          {/* 苦手克服モード */}
          <button
            onClick={() => handleModeSelect("weak", 10)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">苦手克服モード</h2>
                <p className="text-gray-600 text-sm">
                  NGが多いカードを優先的に出題します。
                </p>
              </div>
              <span className="text-3xl">💪</span>
            </div>
          </button>

          {/* 完全ランダムモード */}
          <button
            onClick={() => handleModeSelect("random", 15)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">完全ランダム</h2>
                <p className="text-gray-600 text-sm">
                  すべてのカードから完全にランダムに15問を出題します。
                </p>
              </div>
              <span className="text-3xl">🎲</span>
            </div>
          </button>

          {/* スピードチャレンジモード */}
          <button
            onClick={() => handleModeSelect("speed", 20)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-5 px-6 rounded-lg shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">スピードチャレンジ</h2>
                <p className="text-gray-600 text-sm">
                  お気に入りを優先して20問を高速で学習します。
                </p>
              </div>
              <span className="text-3xl">⚡</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}

