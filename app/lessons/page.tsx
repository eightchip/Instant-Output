"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Lesson } from "@/types/models";
import MessageDialog from "@/components/MessageDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; lessonIdToDelete: string | null }>({
    isOpen: false,
    title: "",
    message: "",
    lessonIdToDelete: null,
  });

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
      setErrors({ title: "レッスン名を入力してください" });
      return;
    }
    
    setErrors({});

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
      setMessageDialog({
        isOpen: true,
        title: "エラー",
        message: "レッスンの作成に失敗しました。",
      });
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="レッスンを読み込み中..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            📖 レッスン管理
          </h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            ← ホーム
          </button>
        </div>

        {/* 新規レッスン作成フォーム */}
        {showNewForm ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">新しいレッスンを作成</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newLessonTitle}
                onChange={(e) => {
                  setNewLessonTitle(e.target.value);
                  if (errors.title) {
                    setErrors({ ...errors, title: undefined });
                  }
                }}
                placeholder="レッスン名を入力..."
                className={`w-full border rounded-lg px-4 py-2 ${
                  errors.title
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateLesson();
                  }
                }}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  {errors.title}
                </p>
              )}
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
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">レッスンがありません</h3>
              <p className="text-gray-600 mb-6">
                新しいレッスンを作成して、カードを追加しましょう。
              </p>
              <button
                onClick={() => setShowNewForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                ➕ 最初のレッスンを作成
              </button>
            </div>
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/lessons/${lesson.id}`)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                    >
                      詳細
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: "レッスンを削除",
                          message: `レッスン「${lesson.title}」とその中のすべてのカードを削除しますか？\nこの操作は取り消せません。`,
                          lessonIdToDelete: lesson.id,
                        });
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
          if (confirmDialog.lessonIdToDelete) {
            setConfirmDialog({ isOpen: false, title: "", message: "", lessonIdToDelete: null });
            try {
              await storage.init();
              // レッスンに属するカードを取得
              const cards = await storage.getCardsByLesson(confirmDialog.lessonIdToDelete);
              // カードとレビューを削除
              for (const card of cards) {
                const review = await storage.getReview(card.id);
                if (review) {
                  await storage.deleteReview(card.id);
                }
                await storage.deleteCard(card.id);
              }
              // レッスンを削除
              await storage.deleteLesson(confirmDialog.lessonIdToDelete);
              await loadLessons();
              setMessageDialog({
                isOpen: true,
                title: "削除完了",
                message: "レッスンを削除しました。",
              });
            } catch (error) {
              console.error("Failed to delete lesson:", error);
              setMessageDialog({
                isOpen: true,
                title: "削除エラー",
                message: "レッスンの削除に失敗しました。",
              });
            }
          }
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", lessonIdToDelete: null })}
        variant="danger"
      />
    </div>
  );
}

