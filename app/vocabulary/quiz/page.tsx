"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card, Review } from "@/types/models";
import { generateVocabularyList, getImportantWords } from "@/lib/vocabulary";
import { tts } from "@/lib/tts";
import LoadingSpinner from "@/components/LoadingSpinner";
import AudioPlaybackButton from "@/components/AudioPlaybackButton";
import MessageDialog from "@/components/MessageDialog";

type QuizMode = "en-to-jp" | "jp-to-en";
type QuizResult = "correct" | "incorrect" | null;

export default function VocabularyQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wordFilter = searchParams.get("words")?.split(",") || [];
  const modeParam = searchParams.get("mode") as QuizMode || "en-to-jp";
  
  const [cards, setCards] = useState<Card[]>([]);
  const [vocabulary, setVocabulary] = useState<Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>>(new Map());
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [quizWords, setQuizWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult>(null);
  const [results, setResults] = useState<{ word: string; correct: boolean }[]>([]);
  const [quizMode, setQuizMode] = useState<QuizMode>(modeParam);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await storage.init();
      const [allCards, allReviews] = await Promise.all([
        storage.getAllCards(),
        storage.getAllReviews(),
      ]);
      const userCards = allCards.filter(card => card.source_type !== "template");
      setCards(userCards);
      
      const reviewsMap = new Map<string, Review>();
      for (const review of allReviews) {
        reviewsMap.set(review.cardId, review);
      }
      setReviews(reviewsMap);
      
      const vocab = generateVocabularyList(userCards);
      setVocabulary(vocab);
      
      // クイズ対象の単語を決定
      let targetWords: string[] = [];
      if (wordFilter.length > 0) {
        targetWords = Array.from(vocab.keys()).filter(word => wordFilter.includes(word));
      } else {
        // 重要度順に上位50個を選択
        targetWords = Array.from(vocab.entries())
          .sort((a, b) => b[1].importance - a[1].importance)
          .slice(0, 50)
          .map(([word]) => word);
      }
      
      // ランダムにシャッフル
      targetWords = targetWords.sort(() => Math.random() - 0.5);
      setQuizWords(targetWords);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const currentWord = quizWords[currentIndex];
  const wordData = currentWord ? vocabulary.get(currentWord) : null;

  // 現在の単語を含むカードから日本語訳を取得
  function getWordTranslation(word: string): string {
    if (!wordData) return "";
    
    const wordCards = wordData.isIdiom
      ? cards.filter(card => {
          const lowerText = card.target_en.toLowerCase();
          const lowerWord = word.toLowerCase();
          return lowerText.includes(lowerWord);
        })
      : cards.filter(card => getImportantWords(card).includes(word.toLowerCase()));
    
    if (wordCards.length === 0) return "";
    
    // 最初のカードの日本語訳を返す（より良い方法があれば改善可能）
    return wordCards[0].prompt_jp;
  }

  function handleShowAnswer() {
    if (!currentWord || !wordData) return;
    
    setShowAnswer(true);
    
    // 答えをチェック
    const correctAnswer = quizMode === "en-to-jp" 
      ? getWordTranslation(currentWord)
      : currentWord;
    
    const userAnswerLower = userAnswer.trim().toLowerCase();
    const correctAnswerLower = correctAnswer.toLowerCase();
    
    // 部分一致でも正解とする（より柔軟に）
    const isCorrect = correctAnswerLower.includes(userAnswerLower) || 
                      userAnswerLower.includes(correctAnswerLower);
    
    setQuizResult(isCorrect ? "correct" : "incorrect");
    setResults([...results, { word: currentWord, correct: isCorrect }]);
  }

  function handleNext() {
    if (currentIndex < quizWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer("");
      setShowAnswer(false);
      setQuizResult(null);
    } else {
      // クイズ完了
      const correctCount = results.filter(r => r.correct).length;
      const totalCount = results.length;
      const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      
      setMessageDialog({
        isOpen: true,
        title: "クイズ完了",
        message: `正解数: ${correctCount}/${totalCount}問 (${accuracy}%)\n\nお疲れ様でした！`,
      });
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setUserAnswer("");
    setShowAnswer(false);
    setQuizResult(null);
    setResults([]);
    // 単語を再シャッフル
    const shuffled = [...quizWords].sort(() => Math.random() - 0.5);
    setQuizWords(shuffled);
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="クイズを準備中..." />;
  }

  if (quizWords.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">クイズ対象の単語がありません。</p>
          <button
            onClick={() => router.push("/vocabulary")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
          >
            語彙リストに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!currentWord || !wordData) {
    return null;
  }

  const correctAnswer = quizMode === "en-to-jp" 
    ? getWordTranslation(currentWord)
    : currentWord;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            📝 単語クイズ
          </h1>
          <button
            onClick={() => router.push("/vocabulary")}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            ← 戻る
          </button>
        </div>

        {/* 進捗表示 */}
        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-bold text-gray-900">
              問題 {currentIndex + 1} / {quizWords.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuizMode(quizMode === "en-to-jp" ? "jp-to-en" : "en-to-jp")}
                className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-semibold rounded-lg transition-all"
              >
                {quizMode === "en-to-jp" ? "英→日" : "日→英"}
              </button>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / quizWords.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            {Math.round(((currentIndex + 1) / quizWords.length) * 100)}% 完了
          </div>
        </div>

        {/* 問題表示 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="text-center mb-6">
            <div className="mb-4">
              {wordData.isIdiom && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded">
                  イディオム
                </span>
              )}
            </div>
            
            {quizMode === "en-to-jp" ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">この単語の意味は？</p>
                  <h2 className="text-4xl font-black text-blue-900 mb-4">{currentWord}</h2>
                  {tts.isAvailable() && (
                    <AudioPlaybackButton
                      text={currentWord}
                      language="en"
                      size="lg"
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">この意味の英語は？</p>
                  <h2 className="text-3xl font-black text-indigo-900 mb-4">{correctAnswer}</h2>
                </div>
              </>
            )}
          </div>

          {/* 回答入力 */}
          {!showAnswer && (
            <div className="space-y-4">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder={quizMode === "en-to-jp" ? "日本語で入力..." : "英語で入力..."}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && userAnswer.trim()) {
                    handleShowAnswer();
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleShowAnswer}
                disabled={!userAnswer.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
              >
                答えを見る
              </button>
            </div>
          )}

          {/* 答え表示 */}
          {showAnswer && (
            <div className="space-y-4">
              <div className={`border-2 rounded-lg p-4 ${
                quizResult === "correct"
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg font-bold ${
                    quizResult === "correct" ? "text-green-700" : "text-red-700"
                  }`}>
                    {quizResult === "correct" ? "✓ 正解！" : "✗ 不正解"}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">正解:</p>
                    <p className="text-xl font-semibold text-gray-900">{correctAnswer}</p>
                  </div>
                  {userAnswer.trim() && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">あなたの答え:</p>
                      <p className="text-lg text-gray-700">{userAnswer}</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
              >
                {currentIndex < quizWords.length - 1 ? "次へ" : "クイズを完了"}
              </button>
            </div>
          )}
        </div>

        {/* 結果サマリー（途中表示） */}
        {results.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">現在の結果:</span>
              <div className="flex gap-4">
                <span className="text-green-600 font-bold">
                  正解: {results.filter(r => r.correct).length}
                </span>
                <span className="text-red-600 font-bold">
                  不正解: {results.filter(r => !r.correct).length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* リスタートボタン */}
        <button
          onClick={handleRestart}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
        >
          最初からやり直す
        </button>
      </main>

      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => {
          setMessageDialog({ isOpen: false, title: "", message: "" });
          router.push("/vocabulary");
        }}
      />
    </div>
  );
}

