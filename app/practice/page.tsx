"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { getTodayCards, saveCardResult } from "@/lib/learning";
import { getCardsByMode, shuffleCards } from "@/lib/learning-modes";
import { Card, ReviewResult, StudySession } from "@/types/models";
import { tts, TTSSpeed } from "@/lib/tts";
import { PracticeMode } from "@/types/modes";
import { autoGrade, getGradingDetails, GradingDetails } from "@/lib/auto-grading";
import { splitIntoWords } from "@/lib/vocabulary";

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") || "normal") as PracticeMode;
  const cardCount = parseInt(searchParams.get("count") || "5", 10);

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const resultsRef = useRef<ReviewResult[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<TTSSpeed>(1);
  const speedCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoGradingResult, setAutoGradingResult] = useState<GradingDetails | null>(null);
  const [manualResult, setManualResult] = useState<ReviewResult | null>(null);

  // タイピング練習モード用
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const [typingStats, setTypingStats] = useState<{
    wpm: number;
    accuracy: number;
  } | null>(null);

  // 集中モード用
  const [focusTimeRemaining, setFocusTimeRemaining] = useState<number | null>(
    null
  );
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadCards() {
      try {
        await storage.init();
        
        // カスタムモード: URLパラメータからカードIDを取得
        const cardIdsParam = searchParams.get("cards");
        if (cardIdsParam && mode === "custom") {
          const cardIds = cardIdsParam.split(",");
          const loadedCards: Card[] = [];
          for (const cardId of cardIds) {
            const card = await storage.getCard(cardId);
            if (card) {
              loadedCards.push(card);
            }
          }
          if (loadedCards.length === 0) {
            alert("選択したカードが見つかりませんでした。");
            router.push("/practice/select");
            return;
          }
          setCards(loadedCards);
        } else {
          const loadedCards = await getCardsByMode(mode, cardCount);
          if (loadedCards.length === 0) {
            alert("学習できるカードがありません。");
            router.push("/");
            return;
          }

          // シャッフルモードの場合はさらにシャッフル
          const finalCards =
            mode === "shuffle" ? shuffleCards(loadedCards) : loadedCards;
          setCards(finalCards);
        }

        setStartTime(new Date());
        setResults([]);

        // 集中モード: 25分のタイマーを開始
        if (mode === "focus") {
          setFocusTimeRemaining(25 * 60); // 25分 = 1500秒
        }
      } catch (error) {
        console.error("Failed to load cards:", error);
        alert("カードの読み込みに失敗しました。");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    }

    loadCards();

    // ページ離脱時のセッション保存
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (results.length > 0 && startTime) {
        // 同期的に保存できないため、navigator.sendBeaconを使用
        // ただし、IndexedDBは非同期なので、ここでは警告のみ
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // クリーンアップ: コンポーネントアンマウント時にTTSを停止とセッション保存
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      tts.stop();
      if (speedCheckIntervalRef.current) {
        clearInterval(speedCheckIntervalRef.current);
      }
      if (focusTimerRef.current) {
        clearInterval(focusTimerRef.current);
      }
      // 途中終了時にもセッションを保存（非同期だが、できる限り保存を試みる）
      if (resultsRef.current.length > 0 && startTime) {
        saveStudySession(resultsRef.current, false).catch(console.error);
      }
    };
  }, [router, mode, cardCount, searchParams]);

  // 集中モードのタイマー
  useEffect(() => {
    if (mode === "focus" && focusTimeRemaining !== null && focusTimeRemaining > 0) {
      focusTimerRef.current = setInterval(() => {
        setFocusTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            // タイマー終了
            if (focusTimerRef.current) {
              clearInterval(focusTimerRef.current);
            }
            alert("集中モードの時間が終了しました！");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (focusTimerRef.current) {
        clearInterval(focusTimerRef.current);
      }
    };
  }, [mode, focusTimeRemaining]);

  // TTSの状態を監視
  useEffect(() => {
    if (!tts.isAvailable()) return;

    const checkTTSState = () => {
      setIsSpeaking(tts.getIsSpeaking());
      setIsPaused(tts.getIsPaused());
    };

    // 定期的に状態をチェック
    speedCheckIntervalRef.current = setInterval(checkTTSState, 100);

    return () => {
      if (speedCheckIntervalRef.current) {
        clearInterval(speedCheckIntervalRef.current);
      }
    };
  }, []);

  const currentCard = cards[currentIndex];

  const handleShowAnswer = () => {
    setShowAnswer(true);
    // タイピング練習モード: タイピング開始時刻を記録
    if (mode === "typing" && typingStartTime === null) {
      setTypingStartTime(Date.now());
    }
    
    // 自動採点を実行
    if (currentCard && userAnswer.trim()) {
      const gradingDetails = getGradingDetails(userAnswer, currentCard.target_en);
      setAutoGradingResult(gradingDetails);
      setManualResult(null); // 手動採点結果をリセット
    }
  };

  const handleResultSelect = (result: ReviewResult) => {
    // 手動採点結果を保存（まだ確定しない）
    setManualResult(result);
  };

  const handleResultConfirm = async () => {
    if (!currentCard) return;
    
    // 最終的な採点結果を決定（手動採点が優先、なければ自動採点）
    const finalResult = manualResult || autoGradingResult?.result || "NG";

    // タイピング練習モード: タイピング速度を計算
    if (mode === "typing" && typingStartTime !== null && showAnswer) {
      const typingTime = (Date.now() - typingStartTime) / 1000 / 60; // 分
      const words = userAnswer.trim().split(/\s+/).length;
      const wpm = typingTime > 0 ? Math.round(words / typingTime) : 0;

      // 正確性を計算（簡易版: 文字数ベース）
      const targetLength = currentCard.target_en.length;
      const userLength = userAnswer.length;
      const accuracy =
        targetLength > 0
          ? Math.round(
              (1 - Math.abs(targetLength - userLength) / targetLength) * 100
            )
          : 0;

      setTypingStats({ wpm, accuracy });
    }

    // 結果を記録
    const newResults = [...results, finalResult];
    setResults(newResults);
    resultsRef.current = newResults;

    try {
      await saveCardResult(currentCard.id, finalResult);
      // 各カード確定時にセッションを更新
      await saveStudySession(newResults, false);
    } catch (error) {
      console.error("Failed to save result:", error);
    }

    // TTSを停止
    tts.stop();

    // タイピング統計をリセット
    setTypingStartTime(null);
    setTypingStats(null);

    // 次のカードへ
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer("");
      setShowAnswer(false);
      setAutoGradingResult(null);
      setManualResult(null);
    } else {
      // 完了 - 学習履歴を保存
      await saveStudySession(newResults, true);
      const modeMessages: Record<PracticeMode, string> = {
        normal: "今日の学習が完了しました！",
        typing: "タイピング練習が完了しました！",
        shuffle: "シャッフルモードの学習が完了しました！",
        focus: "集中モードの学習が完了しました！",
        review_only: "復習が完了しました！",
        custom: "学習が完了しました！",
        favorite: "お気に入りモードの学習が完了しました！",
        weak: "苦手克服モードの学習が完了しました！",
        random: "ランダムモードの学習が完了しました！",
        speed: "スピードチャレンジが完了しました！",
        flashcard: "フラッシュカード学習が完了しました！",
      };
      alert(modeMessages[mode] || "学習が完了しました！");
      router.push("/");
    }
  };

  // セッションIDを保持（同じセッションを更新するため）
  const sessionIdRef = useRef<string | null>(null);

  async function saveStudySession(results: ReviewResult[], isComplete: boolean = false) {
    if (!startTime || results.length === 0) return;

    try {
      await storage.init();
      const endTime = new Date();
      const durationSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      const correctCount = results.filter((r) => r === "OK").length;
      const maybeCount = results.filter((r) => r === "MAYBE").length;
      const incorrectCount = results.filter((r) => r === "NG").length;

      // 既存のセッションがある場合は更新、なければ新規作成
      let session: StudySession;
      if (sessionIdRef.current) {
        // 既存セッションを取得して更新
        const existingSession = await storage.getStudySession(sessionIdRef.current);
        if (existingSession) {
          session = {
            ...existingSession,
            cardCount: results.length,
            correctCount,
            maybeCount,
            incorrectCount,
            durationSeconds: durationSeconds, // 現在のセッション時間で更新
          };
        } else {
          // セッションが見つからない場合は新規作成
          sessionIdRef.current = null;
          session = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: new Date(),
            cardCount: results.length,
            correctCount,
            maybeCount,
            incorrectCount,
            durationSeconds,
          };
          sessionIdRef.current = session.id;
        }
      } else {
        // 新規セッション作成
        session = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(),
          cardCount: results.length,
          correctCount,
          maybeCount,
          incorrectCount,
          durationSeconds,
        };
        sessionIdRef.current = session.id;
      }

      await storage.saveStudySession(session);
    } catch (error) {
      console.error("Failed to save study session:", error);
    }
  }

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("お使いのブラウザは音声認識に対応していません。");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserAnswer(transcript);
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleTTSPlay = () => {
    if (!currentCard) return;

    if (isPaused) {
      tts.resume();
    } else if (isSpeaking) {
      tts.stop();
    } else {
      tts.speak(currentCard.target_en, "en", ttsSpeed);
    }
  };

  const handleTTSSpeedChange = (speed: TTSSpeed) => {
    setTtsSpeed(speed);
    if (isSpeaking && !isPaused) {
      // 現在読み上げ中の場合は、新しい速度で再読み上げ
      tts.stop();
      setTimeout(() => {
        if (currentCard) {
          tts.speak(currentCard.target_en, "en", speed);
        }
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {/* モード表示 */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                {mode === "normal" && "📚 通常モード"}
                {mode === "typing" && "⌨️ タイピング練習"}
                {mode === "shuffle" && "🔀 シャッフルモード"}
                {mode === "focus" && "⏱️ 集中モード"}
                {mode === "review_only" && "🔄 復習専用"}
                {mode === "flashcard" && "🃏 フラッシュカード"}
                {mode === "favorite" && "⭐ お気に入り"}
                {mode === "weak" && "💪 苦手克服"}
                {mode === "random" && "🎲 完全ランダム"}
                {mode === "speed" && "⚡ スピードチャレンジ"}
              </span>
            </div>
            {/* 集中モードのタイマー */}
            {mode === "focus" && focusTimeRemaining !== null && (
              <div className="text-sm font-semibold text-orange-600">
                {Math.floor(focusTimeRemaining / 60)}:
                {String(Math.floor(focusTimeRemaining % 60)).padStart(2, "0")}
              </div>
            )}
          </div>
        </div>

        {/* 進捗表示 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>問題 {currentIndex + 1} / {cards.length}</span>
            {/* タイピング統計 */}
            {mode === "typing" && typingStats && (
              <div className="flex gap-4">
                <span className="text-green-600">
                  WPM: {typingStats.wpm}
                </span>
                <span className="text-blue-600">
                  正確性: {typingStats.accuracy}%
                </span>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題表示 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {mode === "flashcard" ? (
            // フラッシュカードモード: 重要単語を表示
            <>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-2">この単語の意味は？</p>
                {(() => {
                  const words = getImportantWords(currentCard);
                  const currentWord = words[Math.floor(Math.random() * words.length)] || currentCard.target_en.split(' ')[0];
                  return (
                    <h2 className="text-4xl font-bold text-blue-900 mb-4">
                      {currentWord}
                    </h2>
                  );
                })()}
                {tts.isAvailable() && (
                  <button
                    onClick={() => {
                      const words = getImportantWords(currentCard);
                      const currentWord = words[Math.floor(Math.random() * words.length)] || currentCard.target_en.split(' ')[0];
                      tts.speak(currentWord, "en", ttsSpeed);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    🔊 音声を聞く
                  </button>
                )}
              </div>
              {!showAnswer && (
                <button
                  onClick={handleShowAnswer}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg text-lg"
                >
                  答えを見る
                </button>
              )}
              {showAnswer && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-800 mb-2">意味</p>
                    <p className="text-xl font-semibold text-green-900">{currentCard.prompt_jp}</p>
                    <p className="text-lg text-green-700 mt-2">{currentCard.target_en}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4 text-center">
                {currentCard.prompt_jp}
              </h2>

              {/* 回答入力 */}
              {!showAnswer && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="英語で入力..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && userAnswer.trim()) {
                      handleShowAnswer();
                    }
                  }}
                />
                <button
                  onClick={handleVoiceInput}
                  disabled={isRecording}
                  className={`px-4 py-3 rounded-lg font-semibold ${
                    isRecording
                      ? "bg-gray-400"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  {isRecording ? "録音中..." : "🎤"}
                </button>
              </div>
              <button
                onClick={handleShowAnswer}
                disabled={!userAnswer.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg"
              >
                答えを見る
              </button>
            </div>
          )}

          {/* 模範解答表示 */}
          {showAnswer && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-blue-800">模範解答</p>
                  {/* TTSコントロール */}
                  {tts.isAvailable() && (
                    <div className="flex items-center gap-2">
                      {/* 速度調整 */}
                      <select
                        value={ttsSpeed}
                        onChange={(e) => handleTTSSpeedChange(Number(e.target.value) as TTSSpeed)}
                        className="text-xs border border-blue-300 rounded px-2 py-1 bg-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value={0.5}>0.5x</option>
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2}>2x</option>
                      </select>
                      {/* 再生/停止ボタン */}
                      <button
                        onClick={handleTTSPlay}
                        className={`px-3 py-1 rounded text-sm font-semibold ${
                          isSpeaking && !isPaused
                            ? "bg-red-500 hover:bg-red-600"
                            : isPaused
                            ? "bg-yellow-500 hover:bg-yellow-600"
                            : "bg-blue-600 hover:bg-blue-700"
                        } text-white`}
                        title={isSpeaking && !isPaused ? "停止" : isPaused ? "再開" : "音声読み上げ"}
                      >
                        {isSpeaking && !isPaused ? "⏹" : isPaused ? "▶" : "🔊"}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xl font-semibold text-blue-900">
                  {splitIntoWords(currentCard.target_en).map((item, index) => {
                    if (item.isPunctuation) {
                      return <span key={index}>{item.word}</span>;
                    }
                    const isImportant = currentCard.importantWords?.includes(item.word.toLowerCase());
                    return (
                      <span
                        key={index}
                        className={`hover:bg-yellow-200 hover:cursor-pointer px-1 rounded transition-colors ${
                          isImportant ? "bg-purple-100 font-bold" : ""
                        }`}
                        onClick={() => {
                          if (tts.isAvailable()) {
                            tts.speak(item.word, "en", ttsSpeed);
                          }
                        }}
                        title={isImportant ? "⭐ 重要単語 - クリックで音声読み上げ" : "クリックで音声読み上げ"}
                      >
                        {item.word}
                      </span>
                    );
                  })}
                </p>
              </div>

              {/* メモ・ノート表示 */}
              {currentCard.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">📝 メモ</p>
                  <p className="text-sm text-yellow-900 whitespace-pre-wrap">{currentCard.notes}</p>
                </div>
              )}

              {/* 重要単語・表現表示 */}
              {currentCard.importantWords && currentCard.importantWords.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-purple-800 mb-2">⭐ 重要単語・表現</p>
                  <div className="flex flex-wrap gap-2">
                    {currentCard.importantWords.map((word, index) => (
                      <span
                        key={index}
                        className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-sm font-semibold hover:bg-purple-300 cursor-pointer transition-colors"
                        onClick={() => {
                          if (tts.isAvailable()) {
                            tts.speak(word, "en", ttsSpeed);
                          }
                        }}
                        title="クリックで音声読み上げ"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {userAnswer && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">あなたの回答</p>
                  <p className="text-lg text-gray-800">{userAnswer}</p>
                </div>
              )}

              {/* 自動採点結果（フラッシュカードモード以外） */}
              {mode !== "flashcard" && autoGradingResult && (
                <div className={`border-2 rounded-lg p-4 ${
                  autoGradingResult.result === "OK"
                    ? "bg-green-50 border-green-300"
                    : autoGradingResult.result === "MAYBE"
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-red-50 border-red-300"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {autoGradingResult.result === "OK" && "✅ OK"}
                        {autoGradingResult.result === "MAYBE" && "⚠️ MAYBE"}
                        {autoGradingResult.result === "NG" && "❌ NG"}
                      </span>
                      <span className="text-sm text-gray-600">
                        （自動採点: {Math.round(autoGradingResult.similarity * 100)}%一致）
                      </span>
                    </div>
                    {manualResult && (
                      <span className="text-xs text-gray-500">
                        手動で変更済み
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    採点に不満がある場合は、下のボタンで変更できます。
                  </p>
                </div>
              )}

              {/* 採点ボタン（フラッシュカードモード以外） */}
              {mode !== "flashcard" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleResultSelect("OK")}
                      className={`font-bold py-3 px-4 rounded-lg transition-all ${
                        (manualResult || autoGradingResult?.result) === "OK"
                          ? "bg-green-700 ring-2 ring-green-400"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white`}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => handleResultSelect("MAYBE")}
                      className={`font-bold py-3 px-4 rounded-lg transition-all ${
                        (manualResult || autoGradingResult?.result) === "MAYBE"
                          ? "bg-yellow-700 ring-2 ring-yellow-400"
                          : "bg-yellow-600 hover:bg-yellow-700"
                      } text-white`}
                    >
                      MAYBE
                    </button>
                    <button
                      onClick={() => handleResultSelect("NG")}
                      className={`font-bold py-3 px-4 rounded-lg transition-all ${
                        (manualResult || autoGradingResult?.result) === "NG"
                          ? "bg-red-700 ring-2 ring-red-400"
                          : "bg-red-600 hover:bg-red-700"
                      } text-white`}
                    >
                      NG
                    </button>
                  </div>
                  
                  {/* 確定ボタン */}
                  {(manualResult || autoGradingResult) && (
                    <button
                      onClick={handleResultConfirm}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mt-2"
                    >
                      採点を確定して次へ
                    </button>
                  )}
                </>
              )}

              {/* フラッシュカードモードの確定ボタン */}
              {mode === "flashcard" && showAnswer && (
                <button
                  onClick={handleResultConfirm}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mt-2"
                >
                  次へ
                </button>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* 戻るボタン */}
        <button
          onClick={async () => {
            // 途中終了時にもセッションを保存
            if (results.length > 0 && startTime) {
              await saveStudySession(results, false);
            }
            router.push("/");
          }}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          ホームに戻る
        </button>
      </main>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}

