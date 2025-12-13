"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Course, Lesson } from "@/types/models";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDuration, setNewCourseDuration] = useState(30);
  const [newCourseDailyTarget, setNewCourseDailyTarget] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await storage.init();
      const [allCourses, allLessons] = await Promise.all([
        storage.getAllCourses(),
        storage.getAllLessons(),
      ]);
      setCourses(allCourses);
      setLessons(allLessons);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCourse() {
    if (!newCourseTitle.trim()) {
      alert("コース名を入力してください。");
      return;
    }

    try {
      const newCourse: Course = {
        id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: newCourseTitle.trim(),
        startDate: new Date(),
        durationDays: newCourseDuration,
        dailyTarget: newCourseDailyTarget,
        lessonIds: [],
      };
      await storage.saveCourse(newCourse);
      setNewCourseTitle("");
      setNewCourseDuration(30);
      setNewCourseDailyTarget(5);
      setShowNewForm(false);
      await loadData();
    } catch (error) {
      console.error("Failed to create course:", error);
      alert("コースの作成に失敗しました。");
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
          <h1 className="text-3xl font-bold">コース管理</h1>
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← ホーム
          </button>
        </div>

        {/* 新規コース作成フォーム */}
        {showNewForm ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">新しいコースを作成</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  コース名
                </label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="コース名を入力..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  期間（日数）
                </label>
                <input
                  type="number"
                  value={newCourseDuration}
                  onChange={(e) => setNewCourseDuration(parseInt(e.target.value) || 30)}
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  1日の目標（問数）
                </label>
                <input
                  type="number"
                  value={newCourseDailyTarget}
                  onChange={(e) => setNewCourseDailyTarget(parseInt(e.target.value) || 5)}
                  min="1"
                  max="50"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCourse}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  作成
                </button>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewCourseTitle("");
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
            + 新しいコースを作成
          </button>
        )}

        {/* コース一覧 */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">コースがありません。</p>
            <p className="text-sm text-gray-500">
              コースは任意です。レッスン単体でも学習できます。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => {
              const courseLessons = lessons.filter((l) =>
                course.lessonIds.includes(l.id)
              );
              const daysElapsed = Math.floor(
                (new Date().getTime() - new Date(course.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              const progress = Math.min(
                (daysElapsed / course.durationDays) * 100,
                100
              );

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        開始日: {new Date(course.startDate).toLocaleDateString()}
                      </p>
                      <p>期間: {course.durationDays}日</p>
                      <p>1日の目標: {course.dailyTarget}問</p>
                      <p>レッスン数: {courseLessons.length}</p>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>進捗</span>
                        <span>
                          {daysElapsed}日 / {course.durationDays}日
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/courses/${course.id}`)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                  >
                    詳細を見る
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

