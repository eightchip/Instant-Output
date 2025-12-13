"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson, Card, SourceType } from "@/types/models";

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

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      await storage.init();
      const allLessons = await storage.getAllLessons();
      setLessons(allLessons);
      if (allLessons.length === 0) {
        alert("まずレッスンを作成してください。");
        router.push("/lessons");
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
      alert("レッスンを選択してください。");
      return;
    }

    if (inputMode === "pair") {
      if (!promptJp.trim() || !targetEn.trim()) {
        alert("日本語と英語の両方を入力してください。");
        return;
      }
    } else {
      if (!targetEn.trim()) {
        alert("英語を入力してください。");
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
      alert("カードを保存しました！");
      router.push(`/lessons/${selectedLessonId}`);
    } catch (error) {
      console.error("Failed to save card:", error);
      alert("カードの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
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
              <label className="block text-sm font-semibold mb-2">
                日本語
              </label>
              <textarea
                value={promptJp}
                onChange={(e) => setPromptJp(e.target.value)}
                placeholder="日本語文を入力..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[100px]"
                rows={3}
              />
            </div>
          )}

          {/* 英語入力 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              英語 {inputMode === "english_only" && "(日本語は後で追加できます)"}
            </label>
            <textarea
              value={targetEn}
              onChange={(e) => setTargetEn(e.target.value)}
              placeholder="英語文を入力..."
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

