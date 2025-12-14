"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson, Card, SourceType } from "@/types/models";
import MessageDialog from "@/components/MessageDialog";

type InputMode = "pair" | "english_only";

function NewCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedLessonId = searchParams.get("lessonId");

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    preSelectedLessonId || ""
  );
  const [inputMode, setInputMode] = useState<InputMode>("pair");
  const [promptJp, setPromptJp] = useState("");
  const [targetEn, setTargetEn] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecordingJp, setIsRecordingJp] = useState(false);
  const [isRecordingEn, setIsRecordingEn] = useState(false);
  const recognitionJpRef = useRef<any>(null);
  const recognitionEnRef = useRef<any>(null);
  const textareaJpRef = useRef<HTMLTextAreaElement>(null);
  const textareaEnRef = useRef<HTMLTextAreaElement>(null);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      await storage.init();
      const allLessons = await storage.getAllLessons();
      setLessons(allLessons);
      if (allLessons.length === 0) {
        setMessageDialog({
          isOpen: true,
          title: "レッスンが必要です",
          message: "まずレッスンを作成してください。",
        });
        setTimeout(() => {
          router.push("/lessons");
        }, 1500);
        return;
      }
    } catch (error) {
      console.error("Failed to load lessons:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedLessonId) {
      setMessageDialog({
        isOpen: true,
        title: "レッスンが選択されていません",
        message: "レッスンを選択してください。",
      });
      return;
    }

    if (inputMode === "pair") {
      if (!promptJp.trim() || !targetEn.trim()) {
        setMessageDialog({
          isOpen: true,
          title: "入力エラー",
          message: "日本語と英語の両方を入力してください。",
        });
        return;
      }
    } else {
      if (!targetEn.trim()) {
        setMessageDialog({
          isOpen: true,
          title: "入力エラー",
          message: "英語を入力してください。",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const card: Card = {
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lessonId: selectedLessonId,
        prompt_jp: promptJp.trim() || "(後で追加)",
        target_en: targetEn.trim(),
        source_type: inputMode === "pair" ? "manual_pair" : "manual_en",
      };
      await storage.saveCard(card);
      setMessageDialog({
        isOpen: true,
        title: "保存完了",
        message: "カードを保存しました！",
      });
      setTimeout(() => {
        router.push(`/lessons/${selectedLessonId}`);
      }, 1000);
    } catch (error) {
      console.error("Failed to save card:", error);
      setMessageDialog({
        isOpen: true,
        title: "保存エラー",
        message: "カードの保存に失敗しました。",
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
    const setText = lang === "jp" ? setPromptJp : setTargetEn;

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
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      recognitionRef.current = recognition;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setText((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      recognitionRef.current = null;
      if (event.error === "no-speech") {
        setMessageDialog({
          isOpen: true,
          title: "音声認識エラー",
          message: "音声が検出されませんでした。もう一度お試しください。",
        });
      } else if (event.error === "not-allowed") {
        setMessageDialog({
          isOpen: true,
          title: "マイクの許可が必要です",
          message: "マイクの使用が許可されていません。ブラウザの設定を確認してください。",
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">カードを追加</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* レッスン選択 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              レッスン
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">レッスンを選択...</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
            {lessons.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                レッスンがありません。{" "}
                <button
                  onClick={() => router.push("/lessons")}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  レッスンを作成
                </button>
              </p>
            )}
          </div>

          {/* 入力モード選択 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              登録方法
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode("pair")}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold ${
                  inputMode === "pair"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                日英ペア
              </button>
              <button
                onClick={() => setInputMode("english_only")}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold ${
                  inputMode === "english_only"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                英語のみ
              </button>
            </div>
          </div>

          {/* 日本語入力（ペアモードのみ） */}
          {inputMode === "pair" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold">
                  日本語
                </label>
                <button
                  type="button"
                  onClick={() => handleVoiceInput("jp")}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold ${
                    isRecordingJp
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <span>{isRecordingJp ? "⏹️" : "🎤"}</span>
                  <span>{isRecordingJp ? "停止" : "音声入力"}</span>
                </button>
              </div>
              <textarea
                ref={textareaJpRef}
                value={promptJp}
                onChange={(e) => setPromptJp(e.target.value)}
                placeholder="日本語文を入力...（音声入力にも対応）"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[100px]"
                rows={3}
              />
            </div>
          )}

          {/* 英語入力 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">
                英語 {inputMode === "english_only" && "(日本語は後で追加できます)"}
              </label>
              <button
                type="button"
                onClick={() => handleVoiceInput("en")}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold ${
                  isRecordingEn
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <span>{isRecordingEn ? "⏹️" : "🎤"}</span>
                <span>{isRecordingEn ? "停止" : "音声入力"}</span>
              </button>
            </div>
            <textarea
              ref={textareaEnRef}
              value={targetEn}
              onChange={(e) => setTargetEn(e.target.value)}
              placeholder="英語文を入力...（音声入力にも対応）"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[100px]"
              rows={3}
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
            >
              {isSaving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              キャンセル
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewCardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    }>
      <NewCardContent />
    </Suspense>
  );
}

