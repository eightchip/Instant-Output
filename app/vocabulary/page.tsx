"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card, Review, Lesson, VocabularyWord } from "@/types/models";
import { generateVocabularyList, getImportantWords, getWordMeaning } from "@/lib/vocabulary";
import { tts } from "@/lib/tts";
import LoadingSpinner from "@/components/LoadingSpinner";
import AudioPlaybackButton from "@/components/AudioPlaybackButton";
import VocabularyWordEditor from "@/components/VocabularyWordEditor";

// 編集モーダルコンポーネント
function VocabularyWordEditorModal({
  word,
  vocabularyWords,
  vocabulary,
  cards,
  onClose,
  onSave,
}: {
  word: string;
  vocabularyWords: Map<string, VocabularyWord>;
  vocabulary: Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>;
  cards: Card[];
  onClose: () => void;
  onSave: (updated: VocabularyWord) => Promise<void>;
}) {
  const [currentMeaning, setCurrentMeaning] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // vocabWordを直接取得（useMemoを使わず、毎回最新の値を取得）
  // vocabularyWordsのMapが更新されると、この値も自動的に更新される
  const vocabWord = vocabularyWords.get(word.toLowerCase());
  
  // デバッグログ
  useEffect(() => {
    console.log("VocabularyWordEditorModal vocabWord changed:", {
      word,
      vocabWord,
      hasHighlighted: !!vocabWord?.highlightedMeaning,
      hasExample: !!vocabWord?.exampleSentence,
      mapSize: vocabularyWords.size,
    });
  }, [word, vocabWord, vocabularyWords.size]);
  
  const wordData = vocabulary.get(word);

  useEffect(() => {
    async function loadMeaning() {
      setIsLoading(true);
      try {
        console.log("VocabularyWordEditorModal loadMeaning:", {
          word,
          vocabWord,
          hasHighlighted: !!vocabWord?.highlightedMeaning,
          hasExample: !!vocabWord?.exampleSentence,
        });
        
        // 保存された例文があればそれを使う
        if (vocabWord?.exampleSentence) {
          setExampleSentence(vocabWord.exampleSentence);
        } else {
          // 例文を取得
          const wordCards = wordData?.isIdiom
            ? cards.filter(card => {
                const lowerText = card.target_en.toLowerCase();
                const lowerWord = word.toLowerCase();
                return lowerText.includes(lowerWord);
              })
            : cards.filter(card => getImportantWords(card).includes(word.toLowerCase()));
          
          if (wordCards.length > 0) {
            setExampleSentence(wordCards[0].target_en);
          } else {
            setExampleSentence("");
          }
        }

        if (vocabWord?.meaning) {
          setCurrentMeaning(vocabWord.meaning);
        } else if (wordData) {
          const wordCards = wordData.isIdiom
            ? cards.filter(card => {
                const lowerText = card.target_en.toLowerCase();
                const lowerWord = word.toLowerCase();
                return lowerText.includes(lowerWord);
              })
            : cards.filter(card => getImportantWords(card).includes(word.toLowerCase()));
          
          if (wordCards.length > 0) {
            const meaning = await getWordMeaning(word, cards, wordData.isIdiom, vocabularyWords);
            setCurrentMeaning(meaning);
          } else {
            setCurrentMeaning("");
          }
        } else {
          setCurrentMeaning("");
        }
      } catch (error) {
        console.error("Failed to load meaning:", error);
        setCurrentMeaning("");
      } finally {
        setIsLoading(false);
      }
    }
    loadMeaning();
  }, [word, vocabWord, wordData, cards, vocabularyWords]);

  if (isLoading || !wordData) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <LoadingSpinner text="読み込み中..." />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">単語を編集</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <VocabularyWordEditor
            key={`${word}-${vocabWord?.updatedAt?.getTime() || 0}`}
            word={word}
            initialMeaning={currentMeaning}
            initialHighlightedMeaning={vocabWord?.highlightedMeaning || ""}
            initialExampleSentence={vocabWord?.exampleSentence || exampleSentence}
            initialIsLearned={vocabWord?.isLearned || false}
            initialIsWantToLearn={vocabWord?.isWantToLearn || false}
            initialNotes={vocabWord?.notes || ""}
            onSave={async (updated) => {
              await onSave(updated);
              onClose();
            }}
            onCancel={onClose}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

type FilterType = {
  idiomOnly: boolean;
  minDifficulty: number | null;
  maxDifficulty: number | null;
  minCount: number | null;
  maxCount: number | null;
  learnedOnly: boolean | null; // true: 学習済みのみ, false: 未学習のみ, null: すべて
  hideLearned: boolean; // 覚えた単語を非表示
  wantToLearnOnly: boolean; // 覚えたい単語のみ表示
};

export default function VocabularyPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [vocabulary, setVocabulary] = useState<Map<string, { count: number; difficulty: number; importance: number; isIdiom: boolean }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"importance" | "count" | "difficulty">("importance");
  const [filters, setFilters] = useState<FilterType>({
    idiomOnly: false,
    minDifficulty: null,
    maxDifficulty: null,
    minCount: null,
    maxCount: null,
    learnedOnly: null,
    hideLearned: false,
    wantToLearnOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [vocabularyWords, setVocabularyWords] = useState<Map<string, VocabularyWord>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await storage.init();
      const [allCards, allReviews, allLessons, allVocabWords] = await Promise.all([
        storage.getAllCards(),
        storage.getAllReviews(),
        storage.getAllLessons(),
        storage.getAllVocabularyWords(),
      ]);
      // テンプレートカードを除外
      const userCards = allCards.filter(card => card.source_type !== "template");
      setCards(userCards);
      setLessons(allLessons);
      
      // 復習情報をマップに変換
      const reviewsMap = new Map<string, Review>();
      for (const review of allReviews) {
        reviewsMap.set(review.cardId, review);
      }
      setReviews(reviewsMap);
      
      // 単語データをマップに変換
      const vocabWordsMap = new Map<string, VocabularyWord>();
      for (const vocabWord of allVocabWords) {
        vocabWordsMap.set(vocabWord.word.toLowerCase(), vocabWord);
      }
      setVocabularyWords(vocabWordsMap);
      
      // 既知のイディオム辞書を使用（無料）
      const vocab = generateVocabularyList(userCards);
      setVocabulary(vocab);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // 単語が含まれるカードの習得状況を計算
  function getWordMastery(word: string, isIdiom: boolean): { total: number; correct: number; rate: number; isLearned: boolean } {
    const wordCards = isIdiom
      ? cards.filter(card => {
          const lowerText = card.target_en.toLowerCase();
          const lowerWord = word.toLowerCase();
          return lowerText.includes(lowerWord);
        })
      : cards.filter(card => getImportantWords(card).includes(word.toLowerCase()));
    
    let total = 0;
    let correct = 0;
    
    for (const card of wordCards) {
      const review = reviews.get(card.id);
      if (review) {
        total++;
        if (review.lastResult === "OK") {
          correct++;
        }
      }
    }
    
    const rate = total > 0 ? (correct / total) * 100 : 0;
    const isLearned = total > 0 && rate >= 70; // 70%以上で学習済みとみなす
    
    return { total, correct, rate, isLearned };
  }

  const sortedVocabulary = Array.from(vocabulary.entries())
    .filter(([word, data]) => {
      // 検索クエリ
      if (searchQuery && !word.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // イディオムのみ
      if (filters.idiomOnly && !data.isIdiom) {
        return false;
      }
      
      // 難易度フィルタ
      if (filters.minDifficulty !== null && data.difficulty < filters.minDifficulty) {
        return false;
      }
      if (filters.maxDifficulty !== null && data.difficulty > filters.maxDifficulty) {
        return false;
      }
      
      // 出現回数フィルタ
      if (filters.minCount !== null && data.count < filters.minCount) {
        return false;
      }
      if (filters.maxCount !== null && data.count > filters.maxCount) {
        return false;
      }
      
      // 学習済み/未学習フィルタ
      if (filters.learnedOnly !== null) {
        const mastery = getWordMastery(word, data.isIdiom);
        if (filters.learnedOnly && !mastery.isLearned) {
          return false;
        }
        if (!filters.learnedOnly && mastery.isLearned) {
          return false;
        }
      }
      
      // 覚えた単語を非表示
      if (filters.hideLearned) {
        const vocabWord = vocabularyWords.get(word.toLowerCase());
        if (vocabWord?.isLearned) {
          return false;
        }
      }
      
      // 覚えたい単語のみ表示
      if (filters.wantToLearnOnly) {
        const vocabWord = vocabularyWords.get(word.toLowerCase());
        if (!vocabWord?.isWantToLearn) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "importance") {
        return b[1].importance - a[1].importance; // 重要度順
      } else if (sortBy === "count") {
        return b[1].count - a[1].count; // 出現回数順
      } else {
        return b[1].difficulty - a[1].difficulty; // 難易度順
      }
    });

  if (isLoading) {
    return <LoadingSpinner fullScreen text="語彙リストを生成中..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            📚 語彙リスト
          </h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            ← ホーム
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="単語を検索..."
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
            />
          </div>
          
          {/* フィルター表示/非表示トグル */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold rounded-lg transition-all text-sm"
            >
              {showFilters ? "▼ フィルターを隠す" : "▶ フィルターを表示"}
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">並び替え:</span>
              <button
                onClick={() => setSortBy("importance")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
                  sortBy === "importance"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg"
                }`}
              >
                重要度順
              </button>
              <button
                onClick={() => setSortBy("difficulty")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
                  sortBy === "difficulty"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg"
                }`}
              >
                難易度順
              </button>
              <button
                onClick={() => setSortBy("count")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
                  sortBy === "count"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg"
                }`}
              >
                出現回数順
              </button>
            </div>
          </div>

          {/* フィルター設定 */}
          {showFilters && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* イディオムのみ */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={filters.idiomOnly}
                      onChange={(e) => setFilters({ ...filters, idiomOnly: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    イディオムのみ表示
                  </label>
                </div>

                {/* 学習済み/未学習 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">学習状況:</label>
                  <select
                    value={filters.learnedOnly === null ? "all" : filters.learnedOnly ? "learned" : "unlearned"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters({
                        ...filters,
                        learnedOnly: value === "all" ? null : value === "learned",
                      });
                    }}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="all">すべて</option>
                    <option value="learned">学習済みのみ</option>
                    <option value="unlearned">未学習のみ</option>
                  </select>
                </div>

                {/* 覚えた単語を非表示 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={filters.hideLearned}
                      onChange={(e) => setFilters({ ...filters, hideLearned: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    覚えた単語を非表示
                  </label>
                </div>

                {/* 覚えたい単語のみ表示 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={filters.wantToLearnOnly}
                      onChange={(e) => setFilters({ ...filters, wantToLearnOnly: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    覚えたい単語のみ表示
                  </label>
                </div>

                {/* 難易度範囲 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">難易度範囲:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="最小"
                      value={filters.minDifficulty ?? ""}
                      onChange={(e) => setFilters({
                        ...filters,
                        minDifficulty: e.target.value ? parseInt(e.target.value, 10) : null,
                      })}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                    <span className="text-gray-500">〜</span>
                    <input
                      type="number"
                      placeholder="最大"
                      value={filters.maxDifficulty ?? ""}
                      onChange={(e) => setFilters({
                        ...filters,
                        maxDifficulty: e.target.value ? parseInt(e.target.value, 10) : null,
                      })}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>

                {/* 出現回数範囲 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">出現回数範囲:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="最小"
                      min="1"
                      value={filters.minCount ?? ""}
                      onChange={(e) => setFilters({
                        ...filters,
                        minCount: e.target.value ? parseInt(e.target.value, 10) : null,
                      })}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                    <span className="text-gray-500">〜</span>
                    <input
                      type="number"
                      placeholder="最大"
                      min="1"
                      value={filters.maxCount ?? ""}
                      onChange={(e) => setFilters({
                        ...filters,
                        maxCount: e.target.value ? parseInt(e.target.value, 10) : null,
                      })}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
              
              {/* フィルターリセット */}
              <button
                onClick={() => setFilters({
                  idiomOnly: false,
                  minDifficulty: null,
                  maxDifficulty: null,
                  minCount: null,
                  maxCount: null,
                  learnedOnly: null,
                  hideLearned: false,
                  wantToLearnOnly: false,
                })}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all text-sm"
              >
                フィルターをリセット
              </button>
            </div>
          )}

          <p className="text-sm text-gray-600">
            全{cards.length}枚のカードから {vocabulary.size}個の単語を抽出（表示: {sortedVocabulary.length}個）
          </p>
        </div>

        <div className="space-y-2">
          {sortedVocabulary.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-600">該当する単語がありません。</p>
            </div>
          ) : (
            sortedVocabulary.map(([word, data]) => {
              const mastery = getWordMastery(word, data.isIdiom);
              const masteryColor = mastery.rate >= 70 ? "text-green-600" : mastery.rate >= 50 ? "text-yellow-600" : mastery.total > 0 ? "text-orange-600" : "text-gray-400";
              
              return (
              <div
                key={word}
                className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 border-2 ${
                  data.isIdiom 
                    ? "border-l-4 border-purple-500 bg-gradient-to-r from-purple-50/50 to-white" 
                    : mastery.isLearned
                    ? "border-l-4 border-green-500 bg-gradient-to-r from-green-50/50 to-white"
                    : "border-transparent hover:border-indigo-200"
                }`}
              >
                <div>
                  <div className="w-full">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-xl font-bold text-blue-900">{word}</span>
                      {data.isIdiom && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                          イディオム
                        </span>
                      )}
                      {mastery.total > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            mastery.rate >= 70 
                              ? "bg-green-100 text-green-700" 
                              : mastery.rate >= 50 
                              ? "bg-yellow-100 text-yellow-700" 
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            習得率: {Math.round(mastery.rate)}% ({mastery.correct}/{mastery.total})
                          </span>
                          {mastery.isLearned && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                              ✓ 習得済み
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded">
                          未学習
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {data.count}回出現
                      </span>
                      <span className="text-xs text-gray-400">
                        難易度: {Math.round(data.difficulty)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 w-full">
                      {(() => {
                        // idiomの場合は、idiomが含まれるカードを検索
                        const exampleCards = data.isIdiom
                          ? cards.filter(card => {
                              const lowerText = card.target_en.toLowerCase();
                              const lowerWord = word.toLowerCase();
                              return lowerText.includes(lowerWord);
                            })
                          : cards.filter(card => getImportantWords(card).includes(word.toLowerCase()));
                        
                        if (exampleCards.length === 0) {
                          return (
                            <div className="text-gray-400 italic text-xs">
                              {data.isIdiom ? "このイディオムを含む例文が見つかりませんでした。" : "例文が見つかりませんでした。"}
                            </div>
                          );
                        }
                        
                        return exampleCards.slice(0, 3).map(card => (
                          <div key={card.id} className="mb-2 p-2 bg-gray-50 rounded border border-gray-200 w-full">
                            <div className="font-semibold text-gray-800 mb-1 break-words">
                              "{card.target_en}"
                            </div>
                            <div className="text-gray-600 text-xs break-words">
                              {card.prompt_jp}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWord(word);
                      }}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
                      title="編集"
                    >
                      ✏️ 編集
                    </button>
                    {tts.isAvailable() && (
                      <button
                        onClick={() => tts.speak(word, "en", 1)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                        title="音声読み上げ"
                      >
                        🔊
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/vocabulary/flashcard?words=${encodeURIComponent(word)}`)}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
                      title="この単語でフラッシュカード"
                    >
                      🃏 暗記
                    </button>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </main>

      {/* 単語詳細モーダル */}
      {selectedWord && (() => {
        const wordData = vocabulary.get(selectedWord);
        if (!wordData) return null;
        
        const wordCards = wordData.isIdiom
          ? cards.filter(card => {
              const lowerText = card.target_en.toLowerCase();
              const lowerWord = selectedWord.toLowerCase();
              return lowerText.includes(lowerWord);
            })
          : cards.filter(card => getImportantWords(card).includes(selectedWord.toLowerCase()));
        
        // レッスンIDを取得してレッスン名をマッピング
        const lessonMap = new Map<string, Lesson>();
        for (const lesson of lessons) {
          lessonMap.set(lesson.id, lesson);
        }
        
        const lessonIds = new Set(wordCards.map(card => card.lessonId).filter(Boolean));
        const wordLessons = Array.from(lessonIds).map(id => lessonMap.get(id)).filter(Boolean) as Lesson[];
        
        const mastery = getWordMastery(selectedWord, wordData.isIdiom);
        
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedWord(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-blue-900">{selectedWord}</h2>
                    {wordData.isIdiom && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded">
                        イディオム
                      </span>
                    )}
                    {tts.isAvailable() && (
                      <AudioPlaybackButton
                        text={selectedWord}
                        language="en"
                        size="md"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedWord(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                {/* 統計情報 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <div className="text-sm text-blue-700 mb-1">出現回数</div>
                    <div className="text-2xl font-bold text-blue-900">{wordData.count}回</div>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-200">
                    <div className="text-sm text-indigo-700 mb-1">難易度</div>
                    <div className="text-2xl font-bold text-indigo-900">{Math.round(wordData.difficulty)}</div>
                  </div>
                  <div className={`rounded-xl p-4 border-2 ${
                    mastery.rate >= 70 
                      ? "bg-green-50 border-green-200" 
                      : mastery.rate >= 50 
                      ? "bg-yellow-50 border-yellow-200" 
                      : mastery.total > 0
                      ? "bg-orange-50 border-orange-200"
                      : "bg-gray-50 border-gray-200"
                  }`}>
                    <div className={`text-sm mb-1 ${
                      mastery.rate >= 70 
                        ? "text-green-700" 
                        : mastery.rate >= 50 
                        ? "text-yellow-700" 
                        : mastery.total > 0
                        ? "text-orange-700"
                        : "text-gray-700"
                    }`}>
                      習得率
                    </div>
                    <div className={`text-2xl font-bold ${
                      mastery.rate >= 70 
                        ? "text-green-900" 
                        : mastery.rate >= 50 
                        ? "text-yellow-900" 
                        : mastery.total > 0
                        ? "text-orange-900"
                        : "text-gray-900"
                    }`}>
                      {mastery.total > 0 ? `${Math.round(mastery.rate)}%` : "未学習"}
                    </div>
                    {mastery.total > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {mastery.correct}/{mastery.total}回正解
                      </div>
                    )}
                  </div>
                </div>

                {/* レッスン一覧 */}
                {wordLessons.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">含まれるレッスン</h3>
                    <div className="flex flex-wrap gap-2">
                      {wordLessons.map(lesson => (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            setSelectedWord(null);
                            router.push(`/lessons/${lesson.id}`);
                          }}
                          className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold rounded-lg transition-all"
                        >
                          {lesson.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 使用例文 */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">
                    使用例文 ({wordCards.length}件)
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {wordCards.map(card => {
                      const review = reviews.get(card.id);
                      return (
                        <div 
                          key={card.id}
                          className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-indigo-300 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 mb-1">
                                "{card.target_en}"
                              </div>
                              <div className="text-gray-600 text-sm">
                                {card.prompt_jp}
                              </div>
                            </div>
                            {review && (
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                review.lastResult === "OK" 
                                  ? "bg-green-100 text-green-700" 
                                  : review.lastResult === "MAYBE" 
                                  ? "bg-yellow-100 text-yellow-700" 
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {review.lastResult}
                              </span>
                            )}
                          </div>
                          {card.lessonId && lessonMap.has(card.lessonId) && (
                            <div className="text-xs text-gray-500 mt-2">
                              レッスン: {lessonMap.get(card.lessonId)?.title}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 編集モーダル */}
      {editingWord && <VocabularyWordEditorModal
        key={editingWord}
        word={editingWord}
        vocabularyWords={vocabularyWords}
        vocabulary={vocabulary}
        cards={cards}
        onClose={() => setEditingWord(null)}
        onSave={async (updated) => {
          console.log("VocabularyPage onSave - updated:", updated);
          // 保存されたデータを直接vocabularyWordsに反映
          setVocabularyWords(prev => {
            const next = new Map(prev);
            next.set(updated.word.toLowerCase(), updated);
            console.log("VocabularyPage setVocabularyWords - new map size:", next.size);
            return next;
          });
          // データを再読み込み（念のため）
          await loadData();
        }}
      />}
    </div>
  );
}

