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

        <div className="space-y-4">
          {/* 通常モード */}
          <button
            onClick={() => handleModeSelect("normal", 5)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-6 rounded-lg text-xl shadow-lg transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">通常モード</h2>
                <p className="text-blue-100 text-sm">
                  今日の5問を学習します。復習カードを優先的に出題します。
                </p>
              </div>
              <span className="text-4xl">📚</span>
            </div>
          </button>

          {/* タイピング練習モード */}
          <button
            onClick={() => handleModeSelect("typing", 10)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-6 rounded-lg text-xl shadow-lg transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">タイピング練習</h2>
                <p className="text-green-100 text-sm">
                  タイピング速度を測定しながら10問を学習します。
                </p>
              </div>
              <span className="text-4xl">⌨️</span>
            </div>
          </button>

          {/* シャッフルモード */}
          <button
            onClick={() => handleModeSelect("shuffle", 10)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 px-6 rounded-lg text-xl shadow-lg transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">シャッフルモード</h2>
                <p className="text-purple-100 text-sm">
                  カードをランダムに並び替えて10問を学習します。
                </p>
              </div>
              <span className="text-4xl">🔀</span>
            </div>
          </button>

          {/* 集中モード */}
          <button
            onClick={() => handleModeSelect("focus", 20)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 px-6 rounded-lg text-xl shadow-lg transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">集中モード</h2>
                <p className="text-orange-100 text-sm">
                  タイマー付きで集中して学習します。25分間の集中学習。
                </p>
              </div>
              <span className="text-4xl">⏱️</span>
            </div>
          </button>

          {/* 復習専用モード */}
          <button
            onClick={() => handleModeSelect("review_only", 10)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-6 rounded-lg text-xl shadow-lg transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">復習専用モード</h2>
                <p className="text-red-100 text-sm">
                  復習が必要なカードのみを出題します。
                </p>
              </div>
              <span className="text-4xl">🔄</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}

