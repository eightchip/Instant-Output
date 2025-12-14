"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { getTodayCards } from "@/lib/learning";
import { Card, Course, Review } from "@/types/models";
import { getReviewCardsWithPriority, ReviewCardInfo } from "@/lib/reviews";
import MenuButton from "@/components/MenuButton";
import { QRCodeSVG } from "qrcode.react";

export default function Home() {
  const router = useRouter();
  const [todayCards, setTodayCards] = useState<Card[]>([]);
  const [dueReviews, setDueReviews] = useState<Review[]>([]);
  const [reviewCardsWithPriority, setReviewCardsWithPriority] = useState<ReviewCardInfo[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

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
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Instant Output</h1>
          <div className="flex items-center gap-3">
            {/* QRコードボタン */}
            <button
              onClick={() => setShowQRCode(!showQRCode)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="QRコードを表示"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            {/* ハンバーガーメニュー（モバイル） */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="メニュー"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {/* QRコード表示 */}
        {showQRCode && (
          <div className="max-w-2xl mx-auto px-4 pb-4 flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2 text-center">このサイトのURL</p>
              <QRCodeSVG value="https://instant-output.vercel.app/" size={120} />
              <p className="text-xs text-gray-500 mt-2 text-center">instant-output.vercel.app</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">

        {/* Instant Menu */}
        <div className="mb-8 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Instant Menu
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <button
              onClick={handleStartPractice}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-6 rounded-lg text-xl shadow-lg transition-colors mb-3 border-2 border-blue-500"
            >
              今日の5問を開始
            </button>
            <p className="text-center text-gray-600 mb-4 text-sm">
              {todayCards.length}問のカードが準備できています
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => router.push("/practice/mode-select")}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                学習モードを選択
              </button>
              <button
                onClick={() => router.push("/practice/select")}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                カードを選択
              </button>
              <button
                onClick={() => router.push("/practice?mode=favorite&count=10")}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                ⭐ お気に入り
              </button>
              <button
                onClick={() => router.push("/practice?mode=weak&count=10")}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                💪 苦手克服
              </button>
            </div>
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
          <div className="p-6 bg-white rounded-lg border border-gray-200 text-center shadow-sm">
            <p className="text-gray-700 mb-4 text-lg">
              まだカードが登録されていません。
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/cards/screenshot")}
                className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                スクリーンショットから追加
              </button>
              <button
                onClick={() => router.push("/cards/new")}
                className="bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                カードを手動で追加
              </button>
            </div>
          </div>
        )}

        {/* 管理メニュー */}
        <div className={`mt-8 space-y-3 ${showMobileMenu ? 'block' : 'hidden md:block'}`}>
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
