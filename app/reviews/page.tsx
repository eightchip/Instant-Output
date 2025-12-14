"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { getReviewSchedule, getReviewStats, ReviewStats } from "@/lib/reviews";
import { Review } from "@/types/models";
import MessageDialog from "@/components/MessageDialog";

export default function ReviewsPage() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<Map<string, number>>(new Map());
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        await storage.init();
        const [scheduleData, statsData] = await Promise.all([
          getReviewSchedule(60), // 60日分のスケジュールを取得
          getReviewStats(),
        ]);
        setSchedule(scheduleData);
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load review data:", error);
        setMessageDialog({
          isOpen: true,
          title: "読み込みエラー",
          message: "復習データの読み込みに失敗しました。",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } =
      getDaysInMonth(currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

    // 曜日ヘッダー
    const header = dayNames.map((day) => (
      <div
        key={day}
        className="text-center font-semibold text-gray-700 py-2"
      >
        {day}
      </div>
    ));

    // 空白セル（月初めの空白）
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-16"></div>);
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      const reviewCount = schedule.get(dateStr) || 0;
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;

      days.push(
        <div
          key={day}
          className={`h-16 border border-gray-200 p-1 ${
            isToday ? "bg-blue-100 border-blue-400" : ""
          } ${isPast ? "bg-gray-50" : ""}`}
        >
          <div className="flex flex-col h-full">
            <div
              className={`text-sm font-semibold ${
                isToday ? "text-blue-700" : "text-gray-700"
              }`}
            >
              {day}
            </div>
            {reviewCount > 0 && (
              <div
                className={`mt-auto text-xs font-semibold px-1 py-0.5 rounded ${
                  isPast
                    ? "bg-red-200 text-red-800"
                    : isToday
                    ? "bg-blue-500 text-white"
                    : "bg-yellow-200 text-yellow-800"
                }`}
              >
                {reviewCount}問
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-7 gap-0 border border-gray-300 rounded-lg overflow-hidden">
          {header}
          {days}
        </div>
      </div>
    );
  };

  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">復習管理</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        {/* 統計情報 */}
        {stats && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">復習統計</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 text-sm">総復習数</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">期限超過</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdueCount}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">今週の予定</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.upcomingReviews}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">平均間隔</p>
                <p className="text-2xl font-bold">{stats.averageInterval}日</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">前回結果: OK</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.lastResultDistribution.OK}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">前回結果: NG</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.lastResultDistribution.NG}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* カレンダー */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              ← 前月
            </button>
            <h2 className="text-xl font-semibold">
              {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
            </h2>
            <button
              onClick={() => changeMonth(1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              次月 →
            </button>
          </div>

          {renderCalendar()}

          {/* 凡例 */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-400"></div>
              <span>今日</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200"></div>
              <span>復習予定</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200"></div>
              <span>期限超過</span>
            </div>
          </div>
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

