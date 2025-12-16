"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Card } from "@/types/models";
import { tts, TTSSpeed } from "@/lib/tts";
import MessageDialog from "@/components/MessageDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import VoiceInputButton from "@/components/VoiceInputButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import CardEditor from "@/components/CardEditor";

export default function EditCardPage() {
  const router = useRouter();
  const params = useParams();
  const cardId = params.id as string;
  const [card, setCard] = useState<Card | null>(null);
  const [promptJp, setPromptJp] = useState("");
  const [targetEn, setTargetEn] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
    targetEn?: string;
  }>({});
  const [isRecordingJp, setIsRecordingJp] = useState(false);
  const [isRecordingEn, setIsRecordingEn] = useState(false);
  const [isSpeakingEn, setIsSpeakingEn] = useState(false);
  const [isPausedEn, setIsPausedEn] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<TTSSpeed>(1);
  const [isTranslating, setIsTranslating] = useState(false);
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
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
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
      setErrors({ targetEn: "英語を入力してください" });
      return;
    }
    
    setErrors({});

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

  async function handleRetranslate() {
    if (!targetEn.trim()) {
      setMessageDialog({
        isOpen: true,
        title: "入力エラー",
        message: "英語を入力してください。",
      });
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: targetEn.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          setPromptJp(data.translatedText);
          setMessageDialog({
            isOpen: true,
            title: "翻訳完了",
            message: "日本語訳を更新しました。",
          });
        } else {
          setMessageDialog({
            isOpen: true,
            title: "翻訳失敗",
            message: "翻訳結果が取得できませんでした。",
          });
        }
      } else {
        const error = await response.json();
        setMessageDialog({
          isOpen: true,
          title: "翻訳エラー",
          message: `翻訳に失敗しました: ${error.message}`,
        });
      }
    } catch (error) {
      console.error("Translation error:", error);
      setMessageDialog({
        isOpen: true,
        title: "翻訳エラー",
        message: `翻訳処理中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      });
    } finally {
      setIsTranslating(false);
    }
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
    setConfirmDialog({
      isOpen: true,
      title: "カードを削除",
      message: "このカードを削除しますか？この操作は取り消せません。",
    });
  }

  async function executeDelete() {
    if (!card) return;

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
    return <LoadingSpinner fullScreen text="カードを読み込み中..." />;
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

        {card && (
          <CardEditor
            card={card}
            onSave={async (updatedCard) => {
              await storage.init();
              // importantWordsとtagsも保存
              const cardToSave: Card = {
                ...updatedCard,
                importantWords: card.importantWords,
                tags: card.tags,
              };
              await storage.saveCard(cardToSave);
              setMessageDialog({
                isOpen: true,
                title: "更新完了",
                message: "カードを更新しました！",
              });
              setTimeout(() => {
                router.back();
              }, 1000);
            }}
            onCancel={() => router.back()}
            onDelete={async (cardId) => {
              await storage.init();
              const review = await storage.getReview(cardId);
              if (review) {
                await storage.deleteReview(cardId);
              }
              await storage.deleteCard(cardId);
              setMessageDialog({
                isOpen: true,
                title: "削除完了",
                message: "カードを削除しました。",
              });
              setTimeout(() => {
                router.back();
              }, 1000);
            }}
            showDelete={true}
            autoFocus={true}
          />
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
          await executeDelete();
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "" })}
        variant="danger"
      />
    </div>
  );
}
