"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { getTodayCards } from "@/lib/learning";
import { Card, Course, Review } from "@/types/models";
import { getReviewCardsWithPriority, ReviewCardInfo } from "@/lib/reviews";
import MenuButton from "@/components/MenuButton";

export default function Home() {
  const router = useRouter();
  const [todayCards, setTodayCards] = useState<Card[]>([]);
  const [dueReviews, setDueReviews] = useState<Review[]>([]);
  const [reviewCardsWithPriority, setReviewCardsWithPriority] = useState<ReviewCardInfo[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewDetails, setShowReviewDetails] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        await storage.init();

        // 今日のカードを取得
        const cards = await getTodayCards(5);
        setTodayCards(cards);

        // 未消化の復習を取得
        const reviews = await storage.getDueReviews();
        setDueReviews(reviews);

        // 復習カードの詳細情報を取得（優先順位付き）
        const reviewCardsInfo = await getReviewCardsWithPriority();
        setReviewCardsWithPriority(reviewCardsInfo);

        // アクティブなコースを取得（最初のコースを仮に使用）
        const courses = await storage.getAllCourses();
        if (courses.length > 0) {
          setActiveCourse(courses[0]);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleStartPractice = () => {
    router.push("/practice");
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
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">Instant Output</h1>

        {/* 今日の5問ボタン */}
        <div className="mb-8">
          <button
            onClick={handleStartPractice}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-6 rounded-lg text-xl shadow-lg transition-colors"
          >
            今日の5問を開始
          </button>
          <p className="text-center text-gray-600 mt-2">
            {todayCards.length}問のカードが準備できています
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => router.push("/practice/mode-select")}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors"
            >
              学習モードを選択
            </button>
            <button
              onClick={() => router.push("/practice/select")}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors"
            >
              カードを選択
            </button>
            <button
              onClick={() => router.push("/practice?mode=favorite&count=10")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors"
            >
              ⭐ お気に入り
            </button>
            <button
              onClick={() => router.push("/practice?mode=weak&count=10")}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors"
            >
              💪 苦手克服
            </button>
          </div>
        </div>

        {/* コース進捗 */}
        {activeCourse && (() => {
          const daysElapsed = Math.floor(
            (new Date().getTime() - new Date(activeCourse.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const progress = Math.min(
            (daysElapsed / activeCourse.durationDays) * 100,
            100
          );
          const daysRemaining = Math.max(
            activeCourse.durationDays - daysElapsed,
            0
          );

          return (
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{activeCourse.title}</h2>
                <button
                  onClick={() => router.push(`/courses/${activeCourse.id}`)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  詳細
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>進捗</span>
                  <span>
                    {daysElapsed}日 / {activeCourse.durationDays}日
                    {daysRemaining > 0 && ` (残り${daysRemaining}日)`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  1日の目標: {activeCourse.dailyTarget}問
                </div>
              </div>
            </div>
          );
        })()}

        {/* 未消化の復習 */}
        {dueReviews.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-yellow-800">
                復習が必要: {dueReviews.length}問
              </h2>
              <button
                onClick={() => setShowReviewDetails(!showReviewDetails)}
                className="text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                {showReviewDetails ? "詳細を隠す" : "詳細を見る"}
              </button>
            </div>
            <p className="text-sm text-yellow-700 mb-2">
              未消化の復習があります。学習を開始すると優先的に出題されます。
            </p>

            {/* 復習カードの詳細表示 */}
            {showReviewDetails && reviewCardsWithPriority.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {reviewCardsWithPriority.slice(0, 10).map((info, index) => (
                  <div
                    key={info.card.id}
                    className="bg-white rounded-lg p-3 border border-yellow-300"
          >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded">
                            #{index + 1}
                          </span>
                          {info.daysOverdue > 0 && (
                            <span className="text-xs font-semibold text-red-800 bg-red-200 px-2 py-0.5 rounded">
                              期限超過 {info.daysOverdue}日
                            </span>
                          )}
                          {info.review.lastResult === "NG" && (
                            <span className="text-xs font-semibold text-red-600">
                              NG
                            </span>
                          )}
                          {info.review.lastResult === "MAYBE" && (
                            <span className="text-xs font-semibold text-yellow-600">
                              MAYBE
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">
                          {info.card.prompt_jp}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>間隔: {info.review.interval}日</span>
                          <span>
                            期限: {info.review.dueDate.toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/cards/${info.card.id}/edit`)}
                        className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                      >
                        編集
                      </button>
                    </div>
                  </div>
                ))}
                {reviewCardsWithPriority.length > 10 && (
                  <p className="text-xs text-gray-600 text-center mt-2">
                    他 {reviewCardsWithPriority.length - 10}問...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* カードがない場合のメッセージ */}
        {todayCards.length === 0 && (
          <div className="p-6 bg-gray-100 rounded-lg text-center">
            <p className="text-gray-600 mb-4">
              まだカードが登録されていません。
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/seed")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                サンプルデータを追加
              </button>
              <button
                onClick={() => router.push("/cards/screenshot")}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                スクリーンショットから追加
              </button>
              <button
                onClick={() => router.push("/cards/new")}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                カードを手動で追加
              </button>
            </div>
          </div>
        )}

        {/* 管理メニュー */}
        <div className="mt-8 space-y-3">
          {/* 学習・統計系 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              学習・統計
            </h3>
            <MenuButton
              icon="📊"
              title="学習統計"
              description="学習の進捗、正答率、連続学習日数などを確認できます。グラフで学習の推移も見られます。"
              color="blue"
              onClick={() => router.push("/statistics")}
            />
            <MenuButton
              icon="🔄"
              title="復習管理"
              description="復習スケジュールをカレンダーで確認。期限超過カードや今週の復習予定を一目で把握できます。"
              color="purple"
              onClick={() => router.push("/reviews")}
            />
          </div>

          {/* 管理系 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              管理
            </h3>
            <MenuButton
              icon="📚"
              title="コース管理"
              description="コースの作成・編集・削除ができます。コースにレッスンを紐付けて学習を体系化しましょう。"
              color="green"
              onClick={() => router.push("/courses")}
            />
            <MenuButton
              icon="📖"
              title="レッスン管理"
              description="レッスンの作成・編集・削除ができます。レッスンにカードを紐付けて整理しましょう。"
              color="green"
              onClick={() => router.push("/lessons")}
            />
            <MenuButton
              icon="🔍"
              title="カード検索"
              description="日本語・英語でカードを検索。レッスンやタイプでフィルタリングも可能。検索文字がハイライト表示されます。"
              color="green"
              onClick={() => router.push("/cards/search")}
            />
            <MenuButton
              icon="📚"
              title="語彙リスト"
              description="すべてのカードから重要な単語を抽出してリスト化。出現回数順に表示され、音声読み上げも可能です。"
              color="green"
              onClick={() => router.push("/vocabulary")}
            />
          </div>

          {/* 追加系 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              カード追加
            </h3>
            <MenuButton
              icon="➕"
              title="カードを追加"
              description="日本語と英語を手動で入力してカードを作成。音声入力にも対応しています。"
              color="orange"
              onClick={() => router.push("/cards/new")}
            />
            <MenuButton
              icon="📷"
              title="スクリーンショットから追加"
              description="画像からOCRで英語テキストを抽出してカードを作成。複数画像の一括処理にも対応。日本語は後から追加できます。"
              color="orange"
              onClick={() => router.push("/cards/screenshot")}
            />
            <MenuButton
              icon="🤖"
              title="AIでカード化"
              description="英文教材の画像からOCR→AI整形で自動的にカード候補を生成。自然な日本語訳付きで効率的に学習素材を作成できます。"
              color="orange"
              badge="プレミアム"
              onClick={() => router.push("/cards/ai-card")}
            />
          </div>

          {/* 設定系 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              設定
            </h3>
            <MenuButton
              icon="⚙️"
              title="設定（エクスポート/インポート）"
              description="データのバックアップ（エクスポート）や復元（インポート）ができます。SRS設定も変更可能です。"
              color="gray"
              onClick={() => router.push("/settings")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
