"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card } from "@/types/models";
import { tts, TTSSpeed } from "@/lib/tts";
import MessageDialog from "@/components/MessageDialog";

export default function EditCardPage() {
  const router = useRouter();
  const params = useParams();
  const cardId = params.id as string;
  const [card, setCard] = useState<Card | null>(null);
  const [promptJp, setPromptJp] = useState("");
  const [targetEn, setTargetEn] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecordingJp, setIsRecordingJp] = useState(false);
  const [isRecordingEn, setIsRecordingEn] = useState(false);
  const [isSpeakingEn, setIsSpeakingEn] = useState(false);
  const [isPausedEn, setIsPausedEn] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<TTSSpeed>(1);
  const recognitionJpRef = useRef<any>(null);
  const recognitionEnRef = useRef<any>(null);
  const textareaJpRef = useRef<HTMLTextAreaElement>(null);
  const textareaEnRef = useRef<HTMLTextAreaElement>(null);
  const ttsCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    loadCard();

    // クリーンアップ: コンポーネントアンマウント時にTTSを停止
    return () => {
      tts.stop();
      if (ttsCheckIntervalRef.current) {
        clearInterval(ttsCheckIntervalRef.current);
      }
    };
  }, [cardId]);

  // TTSの状態を監視
  useEffect(() => {
    if (!tts.isAvailable()) return;

    const checkTTSState = () => {
      setIsSpeakingEn(tts.getIsSpeaking());
      setIsPausedEn(tts.getIsPaused());
    };

    // 定期的に状態をチェック
    ttsCheckIntervalRef.current = setInterval(checkTTSState, 100);

    return () => {
      if (ttsCheckIntervalRef.current) {
        clearInterval(ttsCheckIntervalRef.current);
      }
    };
  }, []);

  // テキストエリアの自動リサイズ
  useLayoutEffect(() => {
    if (textareaJpRef.current) {
      textareaJpRef.current.style.height = "auto";
      textareaJpRef.current.style.height = `${textareaJpRef.current.scrollHeight}px`;
    }
    if (textareaEnRef.current) {
      textareaEnRef.current.style.height = "auto";
      textareaEnRef.current.style.height = `${textareaEnRef.current.scrollHeight}px`;
    }
  }, [promptJp, targetEn]);

  async function loadCard() {
    try {
      await storage.init();
      const cardData = await storage.getCard(cardId);
      if (!cardData) {
        setMessageDialog({
          isOpen: true,
          title: "カードが見つかりません",
          message: "カードが見つかりません。",
        });
        setTimeout(() => {
          router.back();
        }, 1500);
        return;
      }
      setCard(cardData);
      setPromptJp(cardData.prompt_jp);
      setTargetEn(cardData.target_en);
    } catch (error) {
      console.error("Failed to load card:", error);
      setMessageDialog({
        isOpen: true,
        title: "読み込みエラー",
        message: "カードの読み込みに失敗しました。",
      });
      setTimeout(() => {
        router.back();
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!card) return;

    if (!targetEn.trim()) {
      setMessageDialog({
        isOpen: true,
        title: "入力エラー",
        message: "英語を入力してください。",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updatedCard: Card = {
        ...card,
        prompt_jp: promptJp.trim() || "(後で追加)",
        target_en: targetEn.trim(),
        notes: card.notes || undefined,
        importantWords: card.importantWords && card.importantWords.length > 0 ? card.importantWords : undefined,
      };
      await storage.saveCard(updatedCard);
      setMessageDialog({
        isOpen: true,
        title: "更新完了",
        message: "カードを更新しました！",
      });
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error("Failed to save card:", error);
      setMessageDialog({
        isOpen: true,
        title: "更新エラー",
        message: "カードの更新に失敗しました。",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleVoiceInput(lang: "jp" | "en") {
    const langCode = lang === "jp" ? "ja-JP" : "en-US";
    const setIsRecording = lang === "jp" ? setIsRecordingJp : setIsRecordingEn;
    const textareaRef = lang === "jp" ? textareaJpRef : textareaEnRef;
    const recognitionRef = lang === "jp" ? recognitionJpRef : recognitionEnRef;

    // 既に録音中の場合は停止
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setMessageDialog({
        isOpen: true,
        title: "音声認識エラー",
        message: "お使いのブラウザは音声認識に対応していません。",
      });
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.continuous = true; // 連続認識に変更
    recognition.interimResults = true; // 中間結果も取得

    recognition.onstart = () => {
      setIsRecording(true);
      recognitionRef.current = recognition;
    };

    recognition.onresult = (event: any) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // カーソル位置を取得（状態更新前に保存）
      const cursorPosition = textarea.selectionStart;
      const currentText = lang === "jp" ? promptJp : targetEn;
      
      // 認識されたテキストを取得（中間結果も含む）
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      // カーソル位置にテキストを挿入
      const newText =
        currentText.substring(0, cursorPosition) +
        transcript +
        currentText.substring(cursorPosition);

      // 新しいカーソル位置を計算
      const newCursorPosition = cursorPosition + transcript.length;

      // 状態を更新
      if (lang === "jp") {
        setPromptJp(newText);
      } else {
        setTargetEn(newText);
      }

      // カーソル位置を復元（requestAnimationFrameを使用して確実に実行）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = newCursorPosition;
            textareaRef.current.selectionEnd = newCursorPosition;
            textareaRef.current.focus();
          }
        });
      });
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }

  function stopVoiceInput(lang: "jp" | "en") {
    const recognitionRef = lang === "jp" ? recognitionJpRef : recognitionEnRef;
    const setIsRecording = lang === "jp" ? setIsRecordingJp : setIsRecordingEn;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
    }
  }

  async function handleDelete() {
    if (!card) return;

    if (!confirm("このカードを削除しますか？\n関連する復習データも削除されます。")) {
      return;
    }

    try {
      await storage.init();
      // カードに関連するReviewも削除
      const review = await storage.getReview(card.id);
      if (review) {
        await storage.deleteReview(card.id);
      }
      // カードを削除
      await storage.deleteCard(card.id);
      setMessageDialog({
        isOpen: true,
        title: "削除完了",
        message: "カードを削除しました。",
      });
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error("Failed to delete card:", error);
      setMessageDialog({
        isOpen: true,
        title: "削除エラー",
        message: "カードの削除に失敗しました。",
      });
    }
  }

  const handleTTSPlay = () => {
    if (!targetEn.trim()) {
      setMessageDialog({
        isOpen: true,
        title: "入力エラー",
        message: "英語を入力してください。",
      });
      return;
    }

    if (isPausedEn) {
      tts.resume();
    } else if (isSpeakingEn) {
      tts.stop();
    } else {
      tts.speak(targetEn, "en", ttsSpeed);
    }
  };

  const handleTTSSpeedChange = (speed: TTSSpeed) => {
    setTtsSpeed(speed);
    if (isSpeakingEn && !isPausedEn) {
      // 現在読み上げ中の場合は、新しい速度で再読み上げ
      tts.stop();
      setTimeout(() => {
        if (targetEn.trim()) {
          tts.speak(targetEn, "en", speed);
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

  if (!card) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">カードを編集</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* お気に入り */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold">お気に入り</label>
            <button
              onClick={async () => {
                if (!card) return;
                try {
                  await storage.init();
                  await storage.updateCard(card.id, { isFavorite: !card.isFavorite });
                  await loadCard();
                } catch (error) {
                  console.error("Failed to toggle favorite:", error);
                  setMessageDialog({
                    isOpen: true,
                    title: "更新エラー",
                    message: "お気に入りの更新に失敗しました。",
                  });
                }
              }}
              className={`text-3xl ${card.isFavorite ? "text-yellow-500" : "text-gray-300"} hover:text-yellow-500 transition-colors`}
              title={card.isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
            >
              {card.isFavorite ? "✅" : "⬜"}
            </button>
          </div>

          {/* メモ・ノート */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              📝 メモ・ノート（覚え方のコツなど）
            </label>
            <textarea
              value={card.notes || ""}
              onChange={(e) => {
                if (card) {
                  setCard({ ...card, notes: e.target.value });
                }
              }}
              placeholder="このカードを覚えるためのコツ、関連情報、例文などを記録..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[100px] resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              練習時に表示されます。覚え方のコツや関連情報を記録しておくと便利です。
            </p>
          </div>

          {/* 重要単語・表現 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              ⭐ 重要単語・表現（カンマ区切り）
            </label>
            <input
              type="text"
              value={card.importantWords ? card.importantWords.join(", ") : ""}
              onChange={(e) => {
                if (card) {
                  const words = e.target.value
                    .split(",")
                    .map(w => w.trim())
                    .filter(w => w.length > 0);
                  setCard({ ...card, importantWords: words });
                }
              }}
              placeholder="例: important, remember, useful"
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
            <p className="text-xs text-gray-500 mt-1">
              このカードで覚えたい重要な単語や表現を入力してください。練習時にハイライト表示されます。
            </p>
            {card.importantWords && card.importantWords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {card.importantWords.map((word, index) => (
                  <span
                    key={index}
                    className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 元画像表示 */}
          {card.imageData && (
            <div>
              <label className="block text-sm font-semibold mb-2">
                元画像
              </label>
              <div className="relative">
                <img
                  src={card.imageData}
                  alt="元画像"
                  className="w-full max-w-md h-auto rounded-lg border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    const modal = document.createElement("div");
                    modal.className = "fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50";
                    modal.onclick = () => modal.remove();
                    const img = document.createElement("img");
                    img.src = card.imageData!;
                    img.className = "max-w-full max-h-full object-contain";
                    img.onclick = (e) => e.stopPropagation();
                    const closeBtn = document.createElement("button");
                    closeBtn.className = "absolute top-4 right-4 bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-200";
                    closeBtn.textContent = "× 閉じる";
                    closeBtn.onclick = () => modal.remove();
                    modal.appendChild(closeBtn);
                    modal.appendChild(img);
                    document.body.appendChild(modal);
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">クリックで拡大表示</p>
              </div>
            </div>
          )}
          
          {/* 日本語入力 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              日本語
            </label>
            <div className="flex gap-2">
              <textarea
                ref={textareaJpRef}
                value={promptJp}
                onChange={(e) => {
                  const cursorPos = e.target.selectionStart;
                  setPromptJp(e.target.value);
                  // 自動リサイズ
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  // カーソル位置を復元
                  requestAnimationFrame(() => {
                    if (textareaJpRef.current) {
                      textareaJpRef.current.selectionStart = cursorPos;
                      textareaJpRef.current.selectionEnd = cursorPos;
                    }
                  });
                }}
                placeholder="日本語文を入力..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 min-h-[100px] resize-none overflow-hidden"
                style={{ height: "auto" }}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleVoiceInput("jp")}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                    isRecordingJp
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                  title={isRecordingJp ? "音声入力を停止" : "音声入力（日本語）"}
                >
                  {isRecordingJp ? "⏹" : "🎤"}
                </button>
                {isRecordingJp && (
                  <button
                    onClick={() => stopVoiceInput("jp")}
                    className="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-600 hover:bg-gray-700 text-white"
                    title="停止"
                  >
                    停止
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 英語入力 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              英語
            </label>
            <div className="flex gap-2">
              <textarea
                ref={textareaEnRef}
                value={targetEn}
                onChange={(e) => {
                  const cursorPos = e.target.selectionStart;
                  setTargetEn(e.target.value);
                  // 自動リサイズ
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  // カーソル位置を復元
                  requestAnimationFrame(() => {
                    if (textareaEnRef.current) {
                      textareaEnRef.current.selectionStart = cursorPos;
                      textareaEnRef.current.selectionEnd = cursorPos;
                    }
                  });
                }}
                placeholder="英語文を入力..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 min-h-[100px] resize-none overflow-hidden"
                style={{ height: "auto" }}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleVoiceInput("en")}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                    isRecordingEn
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                  title={isRecordingEn ? "Stop recording" : "Voice input (English)"}
                >
                  {isRecordingEn ? "⏹" : "🎤"}
                </button>
                {isRecordingEn && (
                  <button
                    onClick={() => stopVoiceInput("en")}
                    className="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-600 hover:bg-gray-700 text-white"
                    title="Stop"
                  >
                    停止
                  </button>
                )}
                {/* TTSボタン */}
                {tts.isAvailable() && targetEn.trim() && (
                  <>
                    <button
                      onClick={handleTTSPlay}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                        isSpeakingEn && !isPausedEn
                          ? "bg-red-500 hover:bg-red-600"
                          : isPausedEn
                          ? "bg-yellow-500 hover:bg-yellow-600"
                          : "bg-blue-600 hover:bg-blue-700"
                      } text-white`}
                      title={isSpeakingEn && !isPausedEn ? "停止" : isPausedEn ? "再開" : "音声読み上げ"}
                    >
                      {isSpeakingEn && !isPausedEn ? "⏹" : isPausedEn ? "▶" : "🔊"}
                    </button>
                    <select
                      value={ttsSpeed}
                      onChange={(e) => handleTTSSpeedChange(Number(e.target.value) as TTSSpeed)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* カード情報 */}
          <div className="text-sm text-gray-600">
            <p>タイプ: {card.source_type}</p>
            <p>レッスンID: {card.lessonId}</p>
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || !targetEn.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg"
            >
              {isSaving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              削除
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              キャンセル
            </button>
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
