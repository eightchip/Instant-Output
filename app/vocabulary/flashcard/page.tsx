"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card, Review, VocabularyWord } from "@/types/models";
import { generateVocabularyList, getImportantWords, getWordMeaning } from "@/lib/vocabulary";
import { tts } from "@/lib/tts";
import LoadingSpinner from "@/components/LoadingSpinner";
import AudioPlaybackButton from "@/components/AudioPlaybackButton";
import MessageDialog from "@/components/MessageDialog";

type FlashcardResult = "know" | "dont-know" | null;

function VocabularyFlashcardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wordFilter = searchParams.get("words")?.split(",") || [];
  
  const [cards, setCards] = useState<Card[]>([]);
  const [vocabulary, setVocabulary] = useState<Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>>(new Map());
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [vocabularyWords, setVocabularyWords] = useState<Map<string, VocabularyWord>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [flashcardWords, setFlashcardWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardResult, setFlashcardResult] = useState<FlashcardResult>(null);
  const [results, setResults] = useState<{ word: string; result: FlashcardResult }[]>([]);
  const [showSide, setShowSide] = useState<"front" | "back">("front");
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
      const [allCards, allReviews, allVocabularyWords] = await Promise.all([
        storage.getAllCards(),
        storage.getAllReviews(),
        storage.getAllVocabularyWords(),
      ]);
      const userCards = allCards.filter(card => card.source_type !== "template");
      setCards(userCards);
      
      const reviewsMap = new Map<string, Review>();
      for (const review of allReviews) {
        reviewsMap.set(review.cardId, review);
      }
      setReviews(reviewsMap);
      
      const vocabWordsMap = new Map<string, VocabularyWord>();
      for (const vocabWord of allVocabularyWords) {
        vocabWordsMap.set(vocabWord.word.toLowerCase(), vocabWord);
      }
      setVocabularyWords(vocabWordsMap);
      
      const vocab = generateVocabularyList(userCards);
      setVocabulary(vocab);
      
      // フラッシュカード対象の単語を決定
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
      setFlashcardWords(targetWords);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const currentWord = flashcardWords[currentIndex];
  const wordData = currentWord ? vocabulary.get(currentWord) : null;
  const [wordMeanings, setWordMeanings] = useState<Map<string, string>>(new Map());
  const [loadingMeanings, setLoadingMeanings] = useState<Set<string>>(new Set());

  // 現在の単語の意味を取得（遅延読み込み）
  useEffect(() => {
    async function loadCurrentMeaning() {
      if (!currentWord || !wordData) return;
      
      // 既に読み込み済みまたは読み込み中の場合はスキップ
      if (wordMeanings.has(currentWord) || loadingMeanings.has(currentWord)) {
        return;
      }
      
      setLoadingMeanings(prev => new Set(prev).add(currentWord));
      
      try {
        const meaning = await getWordMeaning(currentWord, cards, wordData.isIdiom);
        setWordMeanings(prev => {
          const next = new Map(prev);
          next.set(currentWord, meaning);
          return next;
        });
      } catch (error) {
        console.error("Failed to load meaning for word:", currentWord, error);
      } finally {
        setLoadingMeanings(prev => {
          const next = new Set(prev);
          next.delete(currentWord);
          return next;
        });
      }
    }
    
    loadCurrentMeaning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord]);

  function getWordTranslation(word: string): { full: string; highlighted?: string } {
    const vocabWord = vocabularyWords.get(word.toLowerCase());
    const fullMeaning = wordMeanings.get(word) || vocabWord?.meaning || "";
    const highlighted = vocabWord?.highlightedMeaning;
    
    return {
      full: fullMeaning,
      highlighted: highlighted,
    };
  }

  function handleFlip() {
    setShowAnswer(!showAnswer);
    if (!showAnswer) {
      setShowSide("back");
    } else {
      setShowSide("front");
    }
  }

  function handleResult(result: FlashcardResult) {
    if (!currentWord) return;
    
    setFlashcardResult(result);
    setResults([...results, { word: currentWord, result }]);
    
    // 結果に応じて次のカードへ（または完了）
    setTimeout(() => {
      if (currentIndex < flashcardWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        setFlashcardResult(null);
        setShowSide("front");
      } else {
        // フラッシュカード完了
        const knowCount = results.filter(r => r.result === "know").length;
        const totalCount = results.length + 1; // 現在の結果も含む
        const knowRate = totalCount > 0 ? Math.round((knowCount / totalCount) * 100) : 0;
        
        setMessageDialog({
          isOpen: true,
          title: "フラッシュカード完了",
          message: `覚えている: ${knowCount}/${totalCount}問 (${knowRate}%)\n\nお疲れ様でした！`,
        });
      }
    }, 500);
  }

  function handleRestart() {
    setCurrentIndex(0);
    setShowAnswer(false);
    setFlashcardResult(null);
    setResults([]);
    setShowSide("front");
    // 単語を再シャッフル
    const shuffled = [...flashcardWords].sort(() => Math.random() - 0.5);
    setFlashcardWords(shuffled);
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="フラッシュカードを準備中..." />;
  }

  if (flashcardWords.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">フラッシュカード対象の単語がありません。</p>
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

  const translation = getWordTranslation(currentWord);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            🃏 単語フラッシュカード
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
              カード {currentIndex + 1} / {flashcardWords.length}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / flashcardWords.length) * 100}%` }}
            />
          </div>
        </div>

        {/* フラッシュカード */}
        <div 
          className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border-2 border-indigo-200 p-8 mb-6 min-h-[400px] flex items-center justify-center cursor-pointer hover:shadow-2xl transition-all"
          onClick={handleFlip}
        >
          <div className="text-center w-full">
            {showSide === "front" ? (
              <>
                {wordData.isIdiom && (
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded">
                      イディオム
                    </span>
                  </div>
                )}
                <h2 className="text-5xl font-black text-blue-900 mb-6">{currentWord}</h2>
                {tts.isAvailable() && (
                  <div className="mb-4">
                    <AudioPlaybackButton
                      text={currentWord}
                      language="en"
                      size="md"
                    />
                  </div>
                )}
                <p className="text-gray-500 text-sm mt-4">タップして答えを表示</p>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">意味</p>
                  {translation.highlighted ? (
                    <div>
                      <h2 className="text-4xl font-black text-indigo-900 mb-2">
                        <span className="bg-yellow-300 px-2 py-1 rounded">{translation.highlighted}</span>
                      </h2>
                      {translation.full && translation.full !== translation.highlighted && (
                        <p className="text-lg text-gray-600 mt-2">（全文: {translation.full}）</p>
                      )}
                    </div>
                  ) : (
                    <h2 className="text-4xl font-black text-indigo-900 mb-4">
                      {translation.full || "（訳が見つかりません）"}
                    </h2>
                  )}
                </div>
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">英語</p>
                  <h3 className="text-3xl font-bold text-blue-900">{currentWord}</h3>
                </div>
                <p className="text-gray-500 text-sm mt-4">タップして表に戻る</p>
              </>
            )}
          </div>
        </div>

        {/* 結果ボタン（答えが表示されている時のみ） */}
        {showAnswer && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => handleResult("know")}
              className={`py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                flashcardResult === "know"
                  ? "bg-green-600 ring-4 ring-green-300"
                  : "bg-green-500 hover:bg-green-600"
              } text-white shadow-lg hover:shadow-xl`}
            >
              ✓ 覚えている
            </button>
            <button
              onClick={() => handleResult("dont-know")}
              className={`py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                flashcardResult === "dont-know"
                  ? "bg-red-600 ring-4 ring-red-300"
                  : "bg-red-500 hover:bg-red-600"
              } text-white shadow-lg hover:shadow-xl`}
            >
              ✗ 覚えていない
            </button>
          </div>
        )}

        {/* 結果サマリー（途中表示） */}
        {results.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">現在の結果:</span>
              <div className="flex gap-4">
                <span className="text-green-600 font-bold">
                  覚えている: {results.filter(r => r.result === "know").length}
                </span>
                <span className="text-red-600 font-bold">
                  覚えていない: {results.filter(r => r.result === "dont-know").length}
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

export default function VocabularyFlashcardPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="読み込み中..." />}>
      <VocabularyFlashcardContent />
    </Suspense>
  );
}

