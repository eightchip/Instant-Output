"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson } from "@/types/models";

export default function LessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      await storage.init();
      const allLessons = await storage.getAllLessons();
      setLessons(allLessons);
    } catch (error) {
      console.error("Failed to load lessons:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateLesson() {
    if (!newLessonTitle.trim()) {
      alert("レッスン名を入力してください。");
      return;
    }

    try {
      const newLesson: Lesson = {
        id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: newLessonTitle.trim(),
      };
      await storage.saveLesson(newLesson);
      setNewLessonTitle("");
      setShowNewForm(false);
      await loadLessons();
    } catch (error) {
      console.error("Failed to create lesson:", error);
      alert("レッスンの作成に失敗しました。");
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
          <h1 className="text-3xl font-bold">レッスン管理</h1>
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← ホーム
          </button>
        </div>

        {/* 新規レッスン作成フォーム */}
        {showNewForm ? (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">新しいレッスンを作成</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="レッスン名を入力..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateLesson();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateLesson}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  作成
                </button>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewLessonTitle("");
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mb-6"
          >
            + 新しいレッスンを作成
          </button>
        )}

        {/* レッスン一覧 */}
        {lessons.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">レッスンがありません。</p>
            <p className="text-sm text-gray-500">
              新しいレッスンを作成して、カードを追加しましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{lesson.title}</h3>
                    <button
                      onClick={() => router.push(`/cards/new?lessonId=${lesson.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                    >
                      + カードを追加
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/lessons/${lesson.id}`)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                  >
                    詳細
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

