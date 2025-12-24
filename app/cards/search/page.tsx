"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card, Lesson, SourceType } from "@/types/models";
import { highlightText } from "@/lib/highlight";
import MessageDialog from "@/components/MessageDialog";
import { useBatchCardSelection } from "@/hooks/useBatchCardSelection";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import AudioPlaybackButton from "@/components/AudioPlaybackButton";
import CardEditor from "@/components/CardEditor";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import InfiniteScrollSentinel from "@/components/InfiniteScrollSentinel";
import { saveWordMeaning } from "@/lib/vocabulary";
import { tts } from "@/lib/tts";
import { isAdminAuthenticated, getSessionData } from "@/lib/admin-auth";

type FilterType = {
  lessonId?: string;
  sourceType?: SourceType;
  hasReview?: boolean;
  tag?: string;
};

export default function CardSearchPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterType>({});
  const [isLoading, setIsLoading] = useState(true);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordPosition, setSelectedWordPosition] = useState<{ x: number; y: number; width: number } | null>(null);
  const [selectedWordContext, setSelectedWordContext] = useState<string | null>(null); // 選択した単語のコンテキスト（カードの英文）
  const [isAddingVocabulary, setIsAddingVocabulary] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isListeningMode, setIsListeningMode] = useState(false); // 聞き流しモード
  
  // isListeningModeの最新値をrefに保持
  useEffect(() => {
    isListeningModeRef.current = isListeningMode;
  }, [isListeningMode]);
  const [listeningIndex, setListeningIndex] = useState(0); // 現在再生中のカードインデックス
  const [listeningInterval, setListeningInterval] = useState(3000); // 再生間隔（ミリ秒）
  const [useOpenAITTS, setUseOpenAITTS] = useState(false); // OpenAI TTSを使用するか
  const [openAIVoice, setOpenAIVoice] = useState<"alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer">("alloy"); // OpenAI TTS音声
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // 現在再生中の音声
  const playCardRef = useRef<((index: number) => Promise<void>) | null>(null); // playCard関数の参照
  const isListeningModeRef = useRef(false); // isListeningModeの最新値を保持
  const [debugLogs, setDebugLogs] = useState<string[]>([]); // デバッグログ
  const debugLogsRef = useRef<string[]>([]); // デバッグログのref

  const { displayedItems, sentinelRef } = useInfiniteScroll(filteredCards, {
    initialCount: 20,
    increment: 20,
  });

  const {
    selectedCards,
    isDeleting,
    toggleCardSelection,
    toggleSelectAll,
    clearSelection,
    handleBatchDelete,
  } = useBatchCardSelection(filteredCards, {
    onDeleteSuccess: () => {
      loadData();
      setIsBatchMode(false);
      setMessageDialog({
        isOpen: true,
        title: "削除完了",
        message: "選択したカードを削除しました。",
      });
    },
    onDeleteError: (error) => {
      setMessageDialog({
        isOpen: true,
        title: "削除エラー",
        message: "カードの削除に失敗しました。",
      });
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [cards, searchQuery, filters]);

  async function loadData() {
    try {
      await storage.init();
      const [allCards, allLessons] = await Promise.all([
        storage.getAllCards(),
        storage.getAllLessons(),
      ]);
      // テンプレートカードを除外
      const userCards = allCards.filter(card => card.source_type !== "template");
      setCards(userCards);
      setLessons(allLessons);
      setFilteredCards(userCards);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...cards];

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.prompt_jp.toLowerCase().includes(query) ||
          card.target_en.toLowerCase().includes(query) ||
          (card.tags && card.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // レッスンでフィルタ
    if (filters.lessonId) {
      filtered = filtered.filter(
        (card) => card.lessonId === filters.lessonId
      );
    }

    // タイプでフィルタ
    if (filters.sourceType) {
      filtered = filtered.filter(
        (card) => card.source_type === filters.sourceType
      );
    }

    // タグでフィルタ
    if (filters.tag) {
      filtered = filtered.filter(
        (card) => card.tags && card.tags.includes(filters.tag!)
      );
    }

    setFilteredCards(filtered);
  }

  function handleFilterChange(key: keyof FilterType, value: any) {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }

  function clearFilters() {
    setSearchQuery("");
    setFilters({});
  }

  // デバッグログを追加する関数（コンポーネントレベルで定義）
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    debugLogsRef.current = [...debugLogsRef.current.slice(-9), logMessage]; // 最新10件を保持
    setDebugLogs(debugLogsRef.current);
  };
  
  // 聞き流しモードの開始
  async function startListeningMode() {
    if (filteredCards.length === 0) return;
    
    // デバッグログをクリアして開始
    debugLogsRef.current = [];
    setDebugLogs([]);
    addDebugLog(`聞き流しモード開始: ${filteredCards.length}枚のカード`);
    
    // OpenAI TTSを使用する場合、管理者認証を確認
    if (useOpenAITTS && !isAdminAuthenticated()) {
      setMessageDialog({
        isOpen: true,
        title: "認証エラー",
        message: "OpenAI TTSを使用するには管理者ログインが必要です。",
      });
      setIsListeningMode(false);
      return;
    }
    
    if (useOpenAITTS) {
      addDebugLog(`ChatGPT音声を使用: ${openAIVoice}`);
    } else {
      addDebugLog(`Web Speech APIを使用`);
    }
    
    // 最初のカードを再生
    const playCard = async (currentIndex: number) => {
      if (currentIndex >= filteredCards.length) {
        // すべて再生完了
        addDebugLog(`すべてのカードの再生が完了しました`);
        setIsListeningMode(false);
        return;
      }

      const card = filteredCards[currentIndex];
      setListeningIndex(currentIndex);
      addDebugLog(`カード ${currentIndex + 1}/${filteredCards.length} を再生開始: "${card.target_en.substring(0, 50)}..."`);

      // OpenAI TTSを使用する場合
      if (useOpenAITTS && isAdminAuthenticated()) {
        try {
          // 既存の音声を停止
          if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.onended = null; // イベントハンドラをクリア
            currentAudioRef.current.onerror = null;
            currentAudioRef.current = null;
          }

          const sessionData = getSessionData();
          if (!sessionData) {
            setIsListeningMode(false);
            return;
          }

          // OpenAI TTS APIを呼び出し
          const response = await fetch("/api/openai-tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: card.target_en,
              voice: openAIVoice,
              sessionData,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("OpenAI TTS error:", errorData);
            addDebugLog(`OpenAI TTS API エラー: ${response.status}`);
            // エラーが発生しても次のカードに進む
            if (listeningTimeoutRef.current) {
              clearTimeout(listeningTimeoutRef.current);
            }
            listeningTimeoutRef.current = setTimeout(() => {
              // playCardRef.currentがnullの場合は直接playCardを呼ぶ
              if (playCardRef.current) {
                playCardRef.current(currentIndex + 1);
              } else {
                playCard(currentIndex + 1);
              }
            }, listeningInterval);
            return;
          }
          
          addDebugLog(`OpenAI TTS API レスポンス取得成功`);

          const data = await response.json();
          
          // base64デコードしてAudioオブジェクトを作成
          const audioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
          const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          const audio = new Audio(audioUrl);
          
          // 再生開始前にcurrentAudioRefに設定
          currentAudioRef.current = audio;
          
          // モバイルブラウザでの確実な動作のため、onendedとaddEventListenerの両方を使用
          const handleAudioEnded = () => {
            addDebugLog(`Audio ended for card ${currentIndex}, next: ${currentIndex + 1}, isListeningMode: ${isListeningModeRef.current}`);
            URL.revokeObjectURL(audioUrl);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
            // 既存のタイマーをクリア
            if (listeningTimeoutRef.current) {
              clearTimeout(listeningTimeoutRef.current);
            }
            // 音声再生が終了した後、再生間隔を待ってから次のカードを再生
            // 直接playCardを呼び出す（クロージャでcurrentIndexをキャプチャ）
            listeningTimeoutRef.current = setTimeout(() => {
              if (!isListeningModeRef.current) {
                addDebugLog(`Skipping next card: listening mode is false`);
                return;
              }
              addDebugLog(`Playing next card directly: ${currentIndex + 1}`);
              // 直接playCardを呼び出す（クロージャで関数自体をキャプチャ）
              playCard(currentIndex + 1);
            }, listeningInterval);
          };
          
          // 両方の方法でイベントハンドラを設定（モバイルブラウザの互換性のため）
          audio.onended = handleAudioEnded;
          audio.addEventListener('ended', handleAudioEnded, { once: true });
          
          // モバイルブラウザでの追加の安全策：timeupdateイベントで再生終了を監視
          let hasEnded = false;
          const checkAudioEnded = () => {
            if (!hasEnded && audio.ended && audio.currentTime >= audio.duration - 0.1) {
              hasEnded = true;
              audio.removeEventListener('timeupdate', checkAudioEnded);
              addDebugLog(`timeupdateイベントで再生終了を検出`);
              handleAudioEnded();
            }
          };
          audio.addEventListener('timeupdate', checkAudioEnded);
          
          // 音声の長さをログに記録
          audio.addEventListener('loadedmetadata', () => {
            addDebugLog(`音声の長さ: ${audio.duration.toFixed(2)}秒`);
          });

          audio.onerror = (event) => {
            console.error("Audio playback error:", event);
            URL.revokeObjectURL(audioUrl);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
            // 既存のタイマーをクリア
            if (listeningTimeoutRef.current) {
              clearTimeout(listeningTimeoutRef.current);
            }
            // エラーが発生しても次のカードに進む
            listeningTimeoutRef.current = setTimeout(() => {
              if (!isListeningModeRef.current) {
                return;
              }
              if (playCardRef.current) {
                playCardRef.current(currentIndex + 1);
              } else {
                playCard(currentIndex + 1);
              }
            }, listeningInterval);
          };

          // 音声再生を開始（Promiseを適切に処理）
          try {
            await audio.play();
            addDebugLog(`Audio started playing for card ${currentIndex}`);
          } catch (playError) {
            console.error("Failed to play audio:", playError);
            addDebugLog(`Failed to play audio for card ${currentIndex}: ${playError}`);
            // 再生に失敗した場合も次のカードに進む
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            if (listeningTimeoutRef.current) {
              clearTimeout(listeningTimeoutRef.current);
            }
            listeningTimeoutRef.current = setTimeout(() => {
              if (!isListeningModeRef.current) {
                return;
              }
              if (playCardRef.current) {
                playCardRef.current(currentIndex + 1);
              } else {
                playCard(currentIndex + 1);
              }
            }, listeningInterval);
          }
        } catch (error) {
          console.error("Failed to play OpenAI TTS:", error);
          // 既存のタイマーをクリア
          if (listeningTimeoutRef.current) {
            clearTimeout(listeningTimeoutRef.current);
          }
          // エラーが発生しても次のカードに進む
          listeningTimeoutRef.current = setTimeout(() => {
            if (!isListeningModeRef.current) {
              return;
            }
            if (playCardRef.current) {
              playCardRef.current(currentIndex + 1);
            } else {
              playCard(currentIndex + 1);
            }
          }, listeningInterval);
        }
      } else {
        // Web Speech APIを使用
        if (!tts.isAvailable()) {
          console.warn("音声読み上げは利用できません");
          setIsListeningMode(false);
          return;
        }

        // 既存の読み上げを停止
        tts.stop();

        // SpeechSynthesisUtteranceを直接作成して、onendイベントで次のカードを再生
        const utterance = new SpeechSynthesisUtterance(card.target_en);
        utterance.lang = "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        // 英語音声を明示的に選択
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(
          (voice) => voice.lang.startsWith("en") && voice.localService !== false
        ) || voices.find((voice) => voice.lang.startsWith("en"));
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }

        // 音声再生終了時に、再生間隔後に次のカードを再生
        utterance.onend = () => {
          if (listeningTimeoutRef.current) {
            clearTimeout(listeningTimeoutRef.current);
          }
          listeningTimeoutRef.current = setTimeout(() => {
            if (playCardRef.current && isListeningModeRef.current) {
              playCardRef.current(currentIndex + 1);
            }
          }, listeningInterval);
        };

        utterance.onerror = (event) => {
          console.error("TTS error:", event);
          if (listeningTimeoutRef.current) {
            clearTimeout(listeningTimeoutRef.current);
          }
          listeningTimeoutRef.current = setTimeout(() => {
            if (playCardRef.current && isListeningModeRef.current) {
              playCardRef.current(currentIndex + 1);
            }
          }, listeningInterval);
        };

        window.speechSynthesis.speak(utterance);
      }
    };

    // playCard関数をrefに保存（イベントハンドラから呼び出せるように）
    // 注意: playCard関数内でplayCardRef.currentを更新するのではなく、
    // ここで一度だけ設定する
    // ただし、playCard関数が定義された直後に設定する必要がある
    playCardRef.current = playCard;
    
    // 最初のカードを再生
    playCard(0);
  }

  // 聞き流しモードの停止
  useEffect(() => {
    if (!isListeningMode) {
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = null;
      }
      // Web Speech APIを停止
      tts.stop();
      // OpenAI TTSを停止
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    }
    return () => {
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [isListeningMode]);

  // 再生間隔が変更された場合、現在の再生を再開（音声再生中でない場合のみ）
  useEffect(() => {
    if (!isListeningMode || filteredCards.length === 0) return;
    
    // 現在のタイマーをクリア（次のカードへの遷移タイマー）
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
    
    // 音声再生中でない場合のみ再開（音声再生中はonendイベントで処理される）
    const isPlaying = useOpenAITTS 
      ? currentAudioRef.current && !currentAudioRef.current.paused && !currentAudioRef.current.ended
      : tts.getIsSpeaking();
    
    // 再生中でない場合のみ、現在のカードから再開
    if (!isPlaying && playCardRef.current) {
      // playCard関数を直接呼び出す（現在のカードから再開）
      playCardRef.current(listeningIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningInterval, useOpenAITTS, openAIVoice]);

  // 同じレッスン内のカードのみ並び替え可能
  const canReorder = filters.lessonId !== undefined && filters.lessonId !== "";

  async function handleCardReorder(draggedId: string, targetId: string) {
    if (!canReorder || !filters.lessonId) return;
    
    try {
      await storage.init();
      
      // 同じレッスンのカードのみ取得
      const lessonCards = await storage.getCardsByLesson(filters.lessonId);
      const userCards = lessonCards.filter(card => card.source_type !== "template");
      
      const draggedIndex = userCards.findIndex(c => c.id === draggedId);
      const targetIndex = userCards.findIndex(c => c.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      // カードを移動
      const [movedCard] = userCards.splice(draggedIndex, 1);
      userCards.splice(targetIndex, 0, movedCard);
      
      // 新しいorderを設定
      const updates: Promise<void>[] = [];
      for (let i = 0; i < userCards.length; i++) {
        const card = userCards[i];
        if (card.order !== i) {
          updates.push(storage.updateCard(card.id, { order: i }));
        }
      }
      
      await Promise.all(updates);
      await loadData();
      
      setMessageDialog({
        isOpen: true,
        title: "並び替え完了",
        message: "カードの順序を更新しました。",
      });
    } catch (error) {
      console.error("Failed to reorder cards:", error);
      setMessageDialog({
        isOpen: true,
        title: "エラー",
        message: "カードの並び替えに失敗しました。",
      });
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="カードを検索中..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🔍 カード検索
          </h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            ← ホーム
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 space-y-4 mb-6">
          {/* 検索バー */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              検索（日本語・英語）
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索..."
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
            />
          </div>

          {/* フィルタ */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">レッスン</label>
              <select
                value={filters.lessonId || ""}
                onChange={(e) => handleFilterChange("lessonId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900"
              >
                <option value="">すべて</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">タイプ</label>
              <select
                value={filters.sourceType || ""}
                onChange={(e) =>
                  handleFilterChange("sourceType", e.target.value || undefined)
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900"
              >
                <option value="">すべて</option>
                <option value="manual_pair">手入力（日英ペア）</option>
                <option value="manual_en">手入力（英語のみ）</option>
                <option value="screenshot">スクリーンショット</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">タグ</label>
              <select
                value={filters.tag || ""}
                onChange={(e) => handleFilterChange("tag", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900"
              >
                <option value="">すべて</option>
                {Array.from(
                  new Set(
                    cards
                      .flatMap((card) => card.tags || [])
                      .filter((tag) => tag.trim().length > 0)
                  )
                )
                  .sort()
                  .map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                フィルタ
              </label>
              <button
                onClick={clearFilters}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
              >
                リセット
              </button>
            </div>
          </div>
        </div>

        {/* 聞き流しモード */}
        {filteredCards.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-lg p-4 mb-6">
            {/* 再生中の文章表示（聞き流しモード時のみ、上に配置） */}
            {isListeningMode && (
              <div className="mb-4 p-3 bg-white/80 rounded-lg border border-green-300">
                <div className="text-xs text-gray-600 mb-1 font-semibold">
                  現在再生中: {listeningIndex + 1} / {filteredCards.length}
                </div>
                <div className="text-base text-gray-800 font-medium leading-relaxed">
                  {filteredCards[listeningIndex]?.target_en}
                </div>
              </div>
            )}
            
            {/* ボタンと再生間隔（下に配置） */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  if (isListeningMode) {
                    // 停止
                    tts.stop();
                    if (currentAudioRef.current) {
                      currentAudioRef.current.pause();
                      currentAudioRef.current = null;
                    }
                    if (listeningTimeoutRef.current) {
                      clearTimeout(listeningTimeoutRef.current);
                      listeningTimeoutRef.current = null;
                    }
                    setIsListeningMode(false);
                  } else {
                    // 開始
                    setIsListeningMode(true);
                    setListeningIndex(0);
                    startListeningMode();
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  isListeningMode
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isListeningMode ? "⏹ 聞き流し停止" : "🎧 聞き流しモード開始"}
              </button>
              {isListeningMode && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 font-semibold whitespace-nowrap">再生間隔:</label>
                  <select
                    value={listeningInterval}
                    onChange={(e) => {
                      setListeningInterval(Number(e.target.value));
                    }}
                    className="border border-gray-300 rounded px-2 py-1 bg-white text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value={1000}>1秒</option>
                    <option value={2000}>2秒</option>
                    <option value={3000}>3秒</option>
                    <option value={5000}>5秒</option>
                    <option value={10000}>10秒</option>
                    <option value={15000}>15秒</option>
                    <option value={30000}>30秒</option>
                  </select>
                </div>
              )}
            </div>
            {/* 音声設定（管理者のみ） */}
            {isAdminAuthenticated() && (
              <div className="mb-3 p-3 bg-white/50 rounded-lg border border-green-200">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useOpenAITTS}
                      onChange={(e) => setUseOpenAITTS(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-semibold text-gray-700">🤖 ChatGPT音声を使用（管理者専用）</span>
                  </label>
                  {useOpenAITTS && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700 font-semibold">音声:</label>
                      <select
                        value={openAIVoice}
                        onChange={(e) => setOpenAIVoice(e.target.value as typeof openAIVoice)}
                        className="border border-gray-300 rounded px-2 py-1 bg-white text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="alloy">Alloy（中性）</option>
                        <option value="echo">Echo（男性）</option>
                        <option value="fable">Fable（女性）</option>
                        <option value="onyx">Onyx（男性）</option>
                        <option value="nova">Nova（女性）</option>
                        <option value="shimmer">Shimmer（女性）</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
            {isListeningMode && (
              <>
                <p className="text-xs text-gray-600 mt-2">
                  💡 電車などの移動中に最適。フィルターで選んだカードを順番に再生します。
                  {useOpenAITTS && isAdminAuthenticated() && " ChatGPT音声で高品質な発音を楽しめます。"}
                </p>
                {/* デバッグログ表示（開発用） */}
                {debugLogs.length > 0 && (
                  <div className="mt-3 p-2 bg-black/80 rounded text-xs text-green-400 font-mono max-h-32 overflow-y-auto">
                    <div className="text-gray-400 mb-1">デバッグログ（最新10件）:</div>
                    {debugLogs.map((log, idx) => (
                      <div key={idx} className="mb-1">{log}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 一括操作 */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setIsBatchMode(!isBatchMode);
                  if (isBatchMode) {
                    clearSelection();
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isBatchMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isBatchMode ? "一括操作を終了" : "一括操作"}
              </button>
              {isBatchMode && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedCards.size}件選択中
                  </span>
                  <button
                    onClick={() => toggleSelectAll(filteredCards)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {selectedCards.size === filteredCards.length ? "すべて解除" : "すべて選択"}
                  </button>
                </>
              )}
            </div>
            {isBatchMode && selectedCards.size > 0 && (
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: "カードを削除",
                    message: `${selectedCards.size}枚のカードを削除しますか？\nこの操作は取り消せません。`,
                  });
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all"
              >
                {isDeleting ? "削除中..." : "選択したカードを削除"}
              </button>
            )}
          </div>
        </div>

        {/* 結果表示 */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredCards.length} / {cards.length} 件
        </div>

        {filteredCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">該当するカードがありません</h3>
              <p className="text-gray-600 mb-6">
                検索条件を変更するか、新しいカードを作成してください。
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={() => router.push("/cards/screenshot")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  ➕ カードを追加
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedItems.map((card, index) => {
              const isDraggable = canReorder && !isBatchMode && card.lessonId === filters.lessonId;
              return (
                    <div
                key={card.id}
                draggable={isDraggable}
                onDragStart={(e) => {
                  if (isDraggable) {
                    setDraggedCardId(card.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", card.id);
                  }
                }}
                onDragOver={(e) => {
                  if (isDraggable && draggedCardId && draggedCardId !== card.id && card.lessonId === filters.lessonId) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverCardId(card.id);
                  }
                }}
                onDragLeave={() => {
                  setDragOverCardId(null);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (draggedCardId && dragOverCardId && draggedCardId !== dragOverCardId && card.lessonId === filters.lessonId) {
                    await handleCardReorder(draggedCardId, dragOverCardId);
                  }
                  setDraggedCardId(null);
                  setDragOverCardId(null);
                }}
                className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 border-2 ${
                  isBatchMode && selectedCards.has(card.id)
                    ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300"
                    : dragOverCardId === card.id
                    ? "ring-2 ring-purple-400 bg-purple-50 border-purple-300"
                    : draggedCardId === card.id
                    ? "opacity-50 scale-95"
                    : "border-transparent hover:border-blue-200"
                } ${isBatchMode ? "cursor-pointer" : isDraggable ? "cursor-move" : ""}`}
                onClick={() => {
                  if (isBatchMode) {
                    toggleCardSelection(card.id);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {isBatchMode && (
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    )}
                    {isDraggable && (
                      <div 
                        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="ドラッグして並び替え（順序は保存されます）"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                {/* 画像サムネイル */}
                {card.imageData && (
                  <div className="mb-3">
                    <img
                      src={card.imageData}
                      alt="元画像"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const modal = document.createElement("div");
                        modal.className = "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
                        modal.onclick = () => modal.remove();
                        const img = document.createElement("img");
                        img.src = card.imageData!;
                        img.className = "max-w-full max-h-full object-contain";
                        img.onclick = (e) => e.stopPropagation();
                        modal.appendChild(img);
                        document.body.appendChild(modal);
                      }}
                    />
                  </div>
                )}
                <div className="mb-2">
                  <p className="text-gray-600 text-sm mb-1">日本語</p>
                  <p className="text-lg font-semibold">
                    {highlightText(card.prompt_jp, searchQuery)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-gray-600 text-sm">英語</p>
                    <span className="text-xs text-gray-500 italic">💡 単語を長押しかダブルクリックで辞書・語彙追加</span>
                  </div>
                  <p 
                    className="text-lg whitespace-pre-wrap break-words selectable-text"
                    onMouseUp={(e) => {
                      // ドラッグ状態をリセット（単語選択時）
                      if (draggedCardId) {
                        setDraggedCardId(null);
                      }
                      // 少し遅延させて選択範囲を取得（ブラウザの処理を待つ）
                      setTimeout(() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
                          const range = selection.getRangeAt(0);
                          const rect = range.getBoundingClientRect();
                          const selectedText = selection.toString().trim();
                          // 単語のみを抽出（句読点を除去）
                          const word = selectedText.replace(/[.,!?;:()\[\]{}'"]/g, '').split(/\s+/)[0];
                          if (word && word.length > 0 && rect.width > 0) {
                            setSelectedWord(word);
                            setSelectedWordContext(card.target_en); // カードの英文をコンテキストとして保存
                            // 選択範囲の中央下に表示
                            setSelectedWordPosition({ 
                              x: rect.left + rect.width / 2, 
                              y: rect.bottom + 5,
                              width: rect.width
                            });
                          }
                        }
                      }, 50);
                    }}
                    onTouchEnd={(e) => {
                      // ドラッグ状態をリセット（単語選択時）
                      if (draggedCardId) {
                        setDraggedCardId(null);
                      }
                      // モバイルでは少し長めの遅延を入れる（テキスト選択UIと競合しないように）
                      setTimeout(() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
                          const range = selection.getRangeAt(0);
                          const rect = range.getBoundingClientRect();
                          const selectedText = selection.toString().trim();
                          const word = selectedText.replace(/[.,!?;:()\[\]{}'"]/g, '').split(/\s+/)[0];
                          if (word && word.length > 0 && rect.width > 0) {
                            setSelectedWord(word);
                            setSelectedWordContext(card.target_en); // カードの英文をコンテキストとして保存
                            // 選択範囲の中央下に表示
                            setSelectedWordPosition({ 
                              x: rect.left + rect.width / 2, 
                              y: rect.bottom + 5,
                              width: rect.width
                            });
                          }
                        }
                      }, 200);
                    }}
                  >
                    {highlightText(card.target_en, searchQuery)}
                  </p>
                </div>
                {!isBatchMode && editingCardId === card.id ? (
                  <CardEditor
                    card={card}
                    onSave={async (updatedCard) => {
                      await storage.init();
                      await storage.saveCard(updatedCard);
                      await loadData();
                      setEditingCardId(null);
                    }}
                    onCancel={() => setEditingCardId(null)}
                    onDelete={async (cardId) => {
                      await storage.init();
                      const review = await storage.getReview(cardId);
                      if (review) {
                        await storage.deleteReview(cardId);
                      }
                      await storage.deleteCard(cardId);
                      await loadData();
                      setEditingCardId(null);
                    }}
                    showDelete={true}
                  />
                ) : (
                  !isBatchMode && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCardId(card.id);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            isOpen: true,
                            title: "カードを削除",
                            message: "このカードを削除しますか？\nこの操作は取り消せません。",
                          });
                          setCardToDelete(card.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                      >
                        削除
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await storage.init();
                            await storage.updateCard(card.id, { isFavorite: !card.isFavorite });
                            await loadData();
                          } catch (error) {
                            console.error("Failed to toggle favorite:", error);
                            setMessageDialog({
                              isOpen: true,
                              title: "更新エラー",
                              message: "お気に入りの更新に失敗しました。",
                            });
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          card.isFavorite
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md hover:shadow-lg"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        title={card.isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
                      >
                        <span>★</span>
                        <span>お気に入り</span>
                      </button>
                      <AudioPlaybackButton
                        text={card.target_en}
                        language="en"
                        size="sm"
                        className="flex-shrink-0"
                      />
                    </div>
                  )
                )}
              </div>
              );
            })}
            <InfiniteScrollSentinel sentinelRef={sentinelRef} />
          </div>
        )}
      </main>
      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={async () => {
          setConfirmDialog({ isOpen: false, title: "", message: "" });
          if (cardToDelete) {
            // 個別削除
            try {
              await storage.init();
              const review = await storage.getReview(cardToDelete);
              if (review) {
                await storage.deleteReview(cardToDelete);
              }
              await storage.deleteCard(cardToDelete);
              await loadData();
              setCardToDelete(null);
              setMessageDialog({
                isOpen: true,
                title: "削除完了",
                message: "カードを削除しました。",
              });
            } catch (error) {
              console.error("Failed to delete card:", error);
              setMessageDialog({
                isOpen: true,
                title: "削除エラー",
                message: "カードの削除に失敗しました。",
              });
            }
          } else {
            // 一括削除
            const cardIds = Array.from(selectedCards);
            await handleBatchDelete(cardIds);
          }
        }}
        onCancel={() => {
          setConfirmDialog({ isOpen: false, title: "", message: "" });
          setCardToDelete(null);
        }}
        variant="danger"
      />
      {/* 単語選択時のWeb辞書リンク */}
      {selectedWord && selectedWordPosition && (
        <div
          className="fixed z-50 bg-white border-2 border-blue-500 rounded-lg shadow-xl p-2 flex gap-2 items-center"
          style={{
            left: `${selectedWordPosition.x}px`,
            top: `${selectedWordPosition.y}px`,
            transform: 'translateX(-50%)',
            maxWidth: '90vw',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-gray-600 font-semibold mr-1 whitespace-nowrap">
            「{selectedWord}」
          </span>
          <button
            onClick={() => {
              const encodedWord = encodeURIComponent(selectedWord.toLowerCase());
              window.open(`https://dictionary.cambridge.org/dictionary/english/${encodedWord}`, '_blank');
              setSelectedWord(null);
              setSelectedWordPosition(null);
              setSelectedWordContext(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded text-xs whitespace-nowrap"
          >
            英英
          </button>
          <button
            onClick={() => {
              const encodedWord = encodeURIComponent(selectedWord.toLowerCase());
              window.open(`https://dictionary.cambridge.org/dictionary/english-japanese/${encodedWord}`, '_blank');
              setSelectedWord(null);
              setSelectedWordPosition(null);
              setSelectedWordContext(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 rounded text-xs whitespace-nowrap"
          >
            英日
          </button>
          <button
            onClick={async () => {
              if (!selectedWord) return;
              setIsAddingVocabulary(true);
              try {
                await storage.init();
                await saveWordMeaning(
                  selectedWord.toLowerCase(),
                  "", // 意味は空（後で編集可能）
                  undefined, // notes
                  undefined, // highlightedMeaning
                  selectedWordContext || undefined, // exampleSentence
                  false, // isLearned
                  false // isWantToLearn
                );
                setMessageDialog({
                  isOpen: true,
                  title: "追加完了",
                  message: `「${selectedWord}」を語彙リストに追加しました！`,
                });
                setSelectedWord(null);
                setSelectedWordPosition(null);
                setSelectedWordContext(null);
                window.getSelection()?.removeAllRanges();
              } catch (error) {
                console.error("Failed to add vocabulary:", error);
                setMessageDialog({
                  isOpen: true,
                  title: "追加エラー",
                  message: "語彙リストへの追加に失敗しました。",
                });
              } finally {
                setIsAddingVocabulary(false);
              }
            }}
            disabled={isAddingVocabulary}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-1.5 px-3 rounded text-xs whitespace-nowrap"
          >
            {isAddingVocabulary ? "追加中..." : "語彙追加"}
          </button>
          <button
            onClick={() => {
              setSelectedWord(null);
              setSelectedWordPosition(null);
              setSelectedWordContext(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-1.5 px-2 rounded text-xs"
            title="閉じる"
          >
            ✕
          </button>
        </div>
      )}
      {/* クリックで辞書リンクを閉じる */}
      {selectedWord && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setSelectedWord(null);
            setSelectedWordPosition(null);
            setSelectedWordContext(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </div>
  );
}

