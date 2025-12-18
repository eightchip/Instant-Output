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
import { isAdminAuthenticated, getSessionTimeRemaining, extendAdminSession, setAdminAuthenticated, verifyAdminPassword } from "@/lib/admin-auth";
import MessageDialog from "@/components/MessageDialog";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    // 管理者認証状態をチェック
    setIsAdmin(isAdminAuthenticated());
    setSessionTimeRemaining(getSessionTimeRemaining());
    
    // セッション残り時間を定期的に更新
    const interval = setInterval(() => {
      setIsAdmin(isAdminAuthenticated());
      setSessionTimeRemaining(getSessionTimeRemaining());
    }, 60000); // 1分ごと
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        await storage.init();

        // 必須データを並列で取得
        const [cards, reviews, courses, allSessions] = await Promise.all([
          getTodayCards(5),
          storage.getDueReviews(),
          storage.getAllCourses(),
          storage.getAllStudySessions(),
        ]);

        setTodayCards(cards);
        setDueReviews(reviews);

        // アクティブなコースを設定
        if (courses.length > 0) {
          setActiveCourse(courses[0]);
        }

        // 統計データを計算
        const stats = calculateStatistics(allSessions);
        setStatistics(stats);

        // 復習カードの詳細情報は遅延読み込み（「詳細を見る」をクリックした時に読み込む）
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-black border-b border-transparent sticky top-0 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between relative overflow-hidden">
          <h1 
            className="text-2xl md:text-3xl font-black tracking-tight relative z-10 header-title-orange"
            style={{ 
              fontFamily: 'var(--font-geist-sans), sans-serif', 
              fontWeight: 900, 
              letterSpacing: '-0.03em',
              color: '#FF6600'
            }}
          >
            instant output
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
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Instant Menu
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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
            <p className="text-center text-gray-600 mb-4 text-sm">
              {todayCards.length}問のカードが準備できています
            </p>
            <button
              onClick={() => router.push("/practice/settings")}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              学習設定（モード・問題数を変更）
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
                onClick={async () => {
                  if (!showReviewDetails && reviewCardsWithPriority.length === 0) {
                    // 初回表示時に詳細情報を読み込む
                    try {
                      const reviewCardsInfo = await getReviewCardsWithPriority();
                      setReviewCardsWithPriority(reviewCardsInfo);
                    } catch (error) {
                      console.error("Failed to load review cards:", error);
                    }
                  }
                  setShowReviewDetails(!showReviewDetails);
                }}
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
            <button
              onClick={() => router.push("/cards/screenshot")}
              className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              カードを追加（スクリーンショット・手動入力）
            </button>
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
              <div className="p-4 space-y-2">
                {/* よく使う機能 */}
                <MenuButton
                  icon="📷"
                  title="カードを追加"
                  description="画像から追加・手動入力"
                  color="orange"
                  onClick={() => {
                    router.push("/cards/screenshot");
                    setShowMobileMenu(false);
                  }}
                />
                <MenuButton
                  icon="🔍"
                  title="カード検索"
                  description="カードを検索・編集"
                  color="blue"
                  onClick={() => {
                    router.push("/cards/search");
                    setShowMobileMenu(false);
                  }}
                />
                <MenuButton
                  icon="📖"
                  title="レッスン管理"
                  description="レッスンとカードを管理"
                  color="green"
                  onClick={() => {
                    router.push("/lessons");
                    setShowMobileMenu(false);
                  }}
                />
                <MenuButton
                  icon="📚"
                  title="コース管理"
                  description="コースを管理"
                  color="green"
                  onClick={() => {
                    router.push("/courses");
                    setShowMobileMenu(false);
                  }}
                />
                
                {/* その他 */}
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <MenuButton
                    icon="🤖"
                    title="AI-OCR（管理者専用）"
                    description="画像から自動でカード化"
                    color="purple"
                    onClick={() => {
                      router.push("/cards/ai-card");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="📚"
                    title="語彙リスト"
                    description="重要単語を確認"
                    color="blue"
                    onClick={() => {
                      router.push("/vocabulary");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="📊"
                    title="学習統計"
                    description="学習の進捗を確認"
                    color="blue"
                    onClick={() => {
                      router.push("/statistics");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="🔄"
                    title="復習管理"
                    description="復習スケジュール"
                    color="purple"
                    onClick={() => {
                      router.push("/reviews");
                      setShowMobileMenu(false);
                    }}
                  />
                  <MenuButton
                    icon="⚙️"
                    title="設定"
                    description="エクスポート・インポート"
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
        <div className={`mt-8 space-y-2 hidden md:block`}>
          {/* よく使う機能 */}
          <MenuButton
            icon="📷"
            title="カードを追加"
            description="画像から追加・手動入力"
            color="orange"
            onClick={() => router.push("/cards/screenshot")}
          />
          <MenuButton
            icon="🔍"
            title="カード検索"
            description="カードを検索・編集"
            color="blue"
            onClick={() => router.push("/cards/search")}
          />
          <MenuButton
            icon="📖"
            title="レッスン管理"
            description="レッスンとカードを管理"
            color="green"
            onClick={() => router.push("/lessons")}
          />
          <MenuButton
            icon="📚"
            title="コース管理"
            description="コースを管理"
            color="green"
            onClick={() => router.push("/courses")}
          />
          
          {/* 管理者ログイン/メニュー */}
          {!isAdmin ? (
            <div className="pt-2 mt-2 border-t border-gray-200">
              <button
                onClick={() => setShowAdminLogin(true)}
                className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <span>🔐</span>
                <span>管理者ログイン</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 mt-2 border-t border-purple-200 space-y-2">
              <div className="px-2 py-1 bg-purple-50 rounded-lg mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-700">🔐 管理者モード</span>
                  <span className="text-xs text-purple-600">
                    残り: {sessionTimeRemaining}時間
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <button
                    onClick={() => {
                      extendAdminSession();
                      setSessionTimeRemaining(getSessionTimeRemaining());
                    }}
                    className="text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    セッションを24時間延長
                  </button>
                  <button
                    onClick={() => {
                      setAdminAuthenticated(false);
                      setIsAdmin(false);
                      setSessionTimeRemaining(0);
                    }}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
              <MenuButton
                icon="🤖"
                title="AI-OCR（管理者専用）"
                description="画像から自動でカード化"
                color="purple"
                onClick={() => router.push("/cards/ai-card")}
              />
            </div>
          )}
          
          {/* その他 */}
          <div className="pt-2 mt-2 border-t border-gray-200 space-y-2">
            <MenuButton
              icon="📚"
              title="語彙リスト"
              description="重要単語を確認"
              color="blue"
              onClick={() => router.push("/vocabulary")}
            />
            <MenuButton
              icon="📊"
              title="学習統計"
              description="学習の進捗を確認"
              color="blue"
              onClick={() => router.push("/statistics")}
            />
            <MenuButton
              icon="🔄"
              title="復習管理"
              description="復習スケジュール"
              color="purple"
              onClick={() => router.push("/reviews")}
            />
            <MenuButton
              icon="⚙️"
              title="設定"
              description="エクスポート・インポート"
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
      
      {/* 管理者ログインモーダル */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-4 text-center">管理者ログイン</h2>
            <p className="text-sm text-gray-600 mb-6 text-center">
              管理者機能を使用するにはパスワードが必要です。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAdminLogin();
                    }
                  }}
                  placeholder="管理者パスワードを入力"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPassword("");
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  ログイン
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* メッセージダイアログ */}
      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
  
  function handleAdminLogin() {
    if (verifyAdminPassword(adminPassword)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setSessionTimeRemaining(getSessionTimeRemaining());
      setShowAdminLogin(false);
      setAdminPassword("");
      setMessageDialog({
        isOpen: true,
        title: "ログイン成功",
        message: "管理者としてログインしました。",
      });
    } else {
      setMessageDialog({
        isOpen: true,
        title: "認証エラー",
        message: "管理者パスワードが正しくありません。",
      });
    }
  }
}
