"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { getTodayCards } from "@/lib/learning";
import { Card, Course, Review, StudySession } from "@/types/models";
import { getReviewCardsWithPriority, ReviewCardInfo } from "@/lib/reviews";
import { calculateStatistics, Statistics } from "@/lib/statistics";
import MenuButton from "@/components/MenuButton";
import { QRCodeSVG } from "qrcode.react";
import GlobalVoiceInputButton from "@/components/GlobalVoiceInputButton";
import { PlayCircle, Zap } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();
  const [todayCards, setTodayCards] = useState<Card[]>([]);
  const [dueReviews, setDueReviews] = useState<Review[]>([]);
  const [reviewCardsWithPriority, setReviewCardsWithPriority] = useState<ReviewCardInfo[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
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

        // 統計データを取得（ストリーク表示用）
        const allSessions = await storage.getAllStudySessions();
        const stats = calculateStatistics(allSessions);
        setStatistics(stats);
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
    return <LoadingSpinner fullScreen text="データを読み込み中..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-b border-transparent sticky top-0 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between relative overflow-hidden">
          {/* 背景アニメーション */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-pulse-subtle"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          
          <h1 
            className="text-2xl md:text-3xl font-black text-white tracking-tight relative z-10 drop-shadow-lg"
            style={{ 
              fontFamily: 'var(--font-geist-sans), sans-serif', 
              fontWeight: 900, 
              letterSpacing: '-0.03em',
              textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 0 20px rgba(255,255,255,0.3)'
            }}
          >
            Instant Output
          </h1>
          <div className="flex items-center gap-3 relative z-10">
            {/* QRコードボタン */}
            <button
              onClick={() => setShowQRCode(!showQRCode)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              title="QRコードを表示"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            {/* ハンバーガーメニュー（モバイル） */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              aria-label="メニュー"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* 学習ストリーク表示 */}
        {statistics && (
          statistics.currentStreak > 0 ? (
            <div className="mb-6 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 rounded-lg shadow-lg p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-300/20 via-red-400/20 to-pink-400/20 animate-pulse"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🔥</span>
                    <div>
                      <h3 className="text-lg font-bold">連続学習</h3>
                      <p className="text-sm opacity-90">ストリーク継続中！</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black">{statistics.currentStreak}</div>
                    <div className="text-sm opacity-90">日</div>
                  </div>
                </div>
                {statistics.longestStreak > statistics.currentStreak && (
                  <p className="text-xs opacity-80 mt-2">
                    最長記録: {statistics.longestStreak}日
                  </p>
                )}
              </div>
            </div>
          ) : statistics.totalStudyDays > 0 ? (
            <div className="mb-6 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg shadow-lg p-4 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">💪</span>
                    <div>
                      <h3 className="text-lg font-bold">ストリークを開始</h3>
                      <p className="text-sm opacity-90">今日学習して連続記録を作ろう！</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black">0</div>
                    <div className="text-sm opacity-90">日</div>
                  </div>
                </div>
                {statistics.longestStreak > 0 && (
                  <p className="text-xs opacity-80 mt-2">
                    最長記録: {statistics.longestStreak}日
                  </p>
                )}
              </div>
            </div>
          ) : null
        )}

        {/* Instant Menu */}
        <div className="mb-8 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Instant Menu
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <button
              onClick={handleStartPractice}
              className="w-full bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-700 text-white font-bold py-5 px-6 rounded-xl text-xl shadow-xl hover:shadow-2xl transition-all duration-300 mb-3 border-0 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <PlayCircle className="w-7 h-7 fill-white" strokeWidth={2.5} />
                <span>今日の5問を開始</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-4 text-sm">
              {todayCards.length}問のカードが準備できています
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => router.push("/practice/mode-select")}
                className="bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600 text-slate-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                学習モードを選択
              </button>
              <button
                onClick={() => router.push("/practice/select")}
                className="bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600 text-slate-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                カードを選択
              </button>
              <button
                onClick={() => router.push("/practice?mode=favorite&count=10")}
                className="bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600 text-slate-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                ⭐ お気に入り
              </button>
              <button
                onClick={() => router.push("/practice?mode=weak&count=10")}
                className="bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600 text-slate-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md"
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
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>進捗</span>
                  <span>
                    {daysElapsed}日 / {activeCourse.durationDays}日
                    {daysRemaining > 0 && ` (残り${daysRemaining}日)`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  1日の目標: {activeCourse.dailyTarget}問
                </div>
              </div>
            </div>
          );
        })()}

        {/* 未消化の復習 */}
        {dueReviews.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                復習が必要: {dueReviews.length}問
              </h2>
              <button
                onClick={() => setShowReviewDetails(!showReviewDetails)}
                className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
              >
                {showReviewDetails ? "詳細を隠す" : "詳細を見る"}
              </button>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              未消化の復習があります。学習を開始すると優先的に出題されます。
            </p>

            {/* 復習カードの詳細表示 */}
            {showReviewDetails && reviewCardsWithPriority.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {reviewCardsWithPriority.slice(0, 10).map((info, index) => (
                  <div
                    key={info.card.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-300 dark:border-yellow-700"
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
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                          {info.card.prompt_jp}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
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

        {/* モバイルメニュー（スライドイン） */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowMobileMenu(false)}>
            <div 
              className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl overflow-y-auto animate-slide-in-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
                <h2 className="text-xl font-bold text-white">メニュー</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="メニューを閉じる"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-3">
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
                    onClick={() => {
                      router.push("/cards/new");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="📷"
                    title="スクリーンショットから追加"
                    description="画像からOCRで英語テキストを抽出してカードを作成。複数画像の一括処理にも対応。日本語は後から追加できます。"
                    color="orange"
                    onClick={() => {
                      router.push("/cards/screenshot");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="🤖"
                    title="AI-OCRでカード化（管理者専用）"
                    description="ChatGPT APIを使用して画像から英文を抽出し、自動的に文単位で分割して日本語に翻訳します。管理者パスワードが必要です。"
                    color="orange"
                    onClick={() => {
                      router.push("/cards/ai-card");
                      setShowMobileMenu(false);
                    }}
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
                    onClick={() => {
                      router.push("/courses");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="📖"
                    title="レッスン管理"
                    description="レッスンの作成・編集・削除ができます。レッスンにカードを紐付けて整理しましょう。"
                    color="green"
                    onClick={() => {
                      router.push("/lessons");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="🔍"
                    title="カード検索"
                    description="日本語・英語でカードを検索。レッスンやタイプでフィルタリングも可能。検索文字がハイライト表示されます。"
                    color="green"
                    onClick={() => {
                      router.push("/cards/search");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="📚"
                    title="語彙リスト"
                    description="すべてのカードから重要な単語を抽出してリスト化。出現回数順に表示され、音声読み上げも可能です。"
                    color="green"
                    onClick={() => {
                      router.push("/vocabulary");
                      setShowMobileMenu(false);
                    }}
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
                    onClick={() => {
                      router.push("/statistics");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="🔄"
                    title="復習管理"
                    description="復習スケジュールをカレンダーで確認。期限超過カードや今週の復習予定を一目で把握できます。"
                    color="purple"
                    onClick={() => {
                      router.push("/reviews");
                      setShowMobileMenu(false);
                    }}
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
                    onClick={() => {
                      router.push("/settings");
                      setShowMobileMenu(false);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 管理メニュー（デスクトップ） */}
        <div className={`mt-8 space-y-3 hidden md:block`}>
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
              title="AI-OCRでカード化（管理者専用）"
              description="ChatGPT APIを使用して画像から英文を抽出し、自動的に文単位で分割して日本語に翻訳します。管理者パスワードが必要です。"
              color="orange"
              onClick={() => router.push("/cards/ai-card")}
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

        {/* 管理者に問い合わせ */}
        <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">管理者に問い合わせ</h3>
          <p className="text-sm text-gray-600 mb-4">
            ご質問やお問い合わせ、ご要望などは公式サイトからお願いいたします。
          </p>
          <a
            href="https://linknavigator.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <span>公式サイトを開く</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </main>
      <GlobalVoiceInputButton variant="floating" size="md" />
    </div>
  );
}
