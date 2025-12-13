"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { calculateStatistics, getDailyData, Statistics } from "@/lib/statistics";
import { StudySession } from "@/types/models";

export default function StatisticsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await storage.init();
      const allSessions = await storage.getAllStudySessions();
      setSessions(allSessions);
      setStatistics(calculateStatistics(allSessions));
    } catch (error) {
      console.error("Failed to load statistics:", error);
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

  if (!statistics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">統計データがありません。</div>
      </div>
    );
  }

  const dailyData = getDailyData(sessions);
  const recentData = dailyData.slice(-7); // 直近7日

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">学習統計</h1>
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← ホーム
          </button>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">総学習回数</p>
            <p className="text-2xl font-bold">{statistics.totalSessions}回</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">総学習日数</p>
            <p className="text-2xl font-bold">{statistics.totalStudyDays}日</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">連続学習日数</p>
            <p className="text-2xl font-bold">{statistics.currentStreak}日</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">最長連続記録</p>
            <p className="text-2xl font-bold">{statistics.longestStreak}日</p>
          </div>
        </div>

        {/* 正答率 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">正答率</h2>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-blue-600">
              {statistics.averageAccuracy.toFixed(1)}%
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-600">正答</p>
              <p className="text-lg font-semibold text-green-600">
                {statistics.totalCorrect}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">部分正答</p>
              <p className="text-lg font-semibold text-yellow-600">
                {statistics.totalMaybe}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">不正答</p>
              <p className="text-lg font-semibold text-red-600">
                {statistics.totalIncorrect}
              </p>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            総カード数: {statistics.totalCards}
          </div>
        </div>

        {/* 学習時間 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">学習時間</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">総学習時間</p>
              <p className="text-2xl font-bold">
                {statistics.totalStudyTime}分
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">平均学習時間</p>
              <p className="text-2xl font-bold">
                {statistics.averageStudyTime.toFixed(1)}分
              </p>
            </div>
          </div>
        </div>

        {/* 直近7日の学習データ */}
        {recentData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">直近7日の学習</h2>
            <div className="space-y-3">
              {recentData.map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      {new Date(data.date).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {data.cards}問 / 正答率: {data.accuracy.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(data.accuracy, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 学習履歴一覧 */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">学習履歴</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sessions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 20)
                .map((session) => {
                  const accuracy =
                    session.cardCount > 0
                      ? ((session.correctCount + session.maybeCount * 0.5) /
                          session.cardCount) *
                        100
                      : 0;
                  return (
                    <div
                      key={session.id}
                      className="border-b border-gray-200 pb-2 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {new Date(session.date).toLocaleDateString(
                              "ja-JP",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                          <p className="text-xs text-gray-600">
                            {session.cardCount}問 / 正答率:{" "}
                            {accuracy.toFixed(1)}% /{" "}
                            {session.durationSeconds
                              ? `${Math.round(session.durationSeconds / 60)}分`
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">
              まだ学習履歴がありません。学習を開始すると統計が表示されます。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

