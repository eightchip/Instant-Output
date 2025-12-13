"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson, Card } from "@/types/models";
import { basicTemplates } from "@/lib/templates";

export default function TemplateCardPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(
    new Set()
  );
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

  function toggleTemplate(index: number) {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTemplates(newSelected);
  }

  function selectAll() {
    setSelectedTemplates(new Set(basicTemplates.map((_, i) => i)));
  }

  function deselectAll() {
    setSelectedTemplates(new Set());
  }

  async function handleSave() {
    if (!selectedLessonId) {
      alert("レッスンを選択してください。");
      return;
    }

    if (selectedTemplates.size === 0) {
      alert("追加するテンプレートを選択してください。");
      return;
    }

    setIsSaving(true);
    try {
      const cardsToSave: Card[] = Array.from(selectedTemplates).map((index) => {
        const template = basicTemplates[index];
        return {
          id: `card_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          lessonId: selectedLessonId,
          prompt_jp: template.prompt_jp,
          target_en: template.target_en,
          source_type: "template",
        };
      });

      // 並列で保存
      await Promise.all(cardsToSave.map((card) => storage.saveCard(card)));

      alert(`${cardsToSave.length}枚のカードを追加しました！`);
      router.push(`/lessons/${selectedLessonId}`);
    } catch (error) {
      console.error("Failed to save cards:", error);
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
          <h1 className="text-3xl font-bold">テンプレートから追加</h1>
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
          </div>

          {/* 選択操作 */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
            >
              すべて選択
            </button>
            <button
              onClick={deselectAll}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
            >
              選択解除
            </button>
          </div>

          {/* 選択数表示 */}
          <div className="text-sm text-gray-600">
            {selectedTemplates.size} / {basicTemplates.length} 個選択中
          </div>

          {/* テンプレート一覧 */}
          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {basicTemplates.map((template, index) => (
              <div
                key={index}
                onClick={() => toggleTemplate(index)}
                className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedTemplates.has(index)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.has(index)}
                    onChange={() => toggleTemplate(index)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">
                      {template.prompt_jp}
                    </p>
                    <p className="font-semibold">{template.target_en}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 保存ボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || selectedTemplates.size === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg"
            >
              {isSaving
                ? "保存中..."
                : `選択した${selectedTemplates.size}枚を追加`}
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

