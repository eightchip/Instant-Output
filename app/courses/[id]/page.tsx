"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { Course, Lesson } from "@/types/models";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId]);

  async function loadData() {
    try {
      await storage.init();
      const [courseData, lessonsData] = await Promise.all([
        storage.getCourse(courseId),
        storage.getAllLessons(),
      ]);
      setCourse(courseData);
      setAllLessons(lessonsData || []);
      if (courseData) {
        const lessons = lessonsData.filter((l) =>
          courseData.lessonIds.includes(l.id)
        );
        setCourseLessons(lessons);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddLesson(lessonId: string) {
    if (!course) return;

    if (course.lessonIds.includes(lessonId)) {
      alert("このレッスンは既に追加されています。");
      return;
    }

    try {
      const updatedCourse: Course = {
        ...course,
        lessonIds: [...course.lessonIds, lessonId],
      };
      await storage.saveCourse(updatedCourse);
      await loadData();
    } catch (error) {
      console.error("Failed to add lesson:", error);
      alert("レッスンの追加に失敗しました。");
    }
  }

  async function handleRemoveLesson(lessonId: string) {
    if (!course) return;

    try {
      const updatedCourse: Course = {
        ...course,
        lessonIds: course.lessonIds.filter((id) => id !== lessonId),
      };
      await storage.saveCourse(updatedCourse);
      await loadData();
    } catch (error) {
      console.error("Failed to remove lesson:", error);
      alert("レッスンの削除に失敗しました。");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">コースが見つかりません。</div>
      </div>
    );
  }

  const daysElapsed = Math.floor(
    (new Date().getTime() - new Date(course.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const progress = Math.min((daysElapsed / course.durationDays) * 100, 100);
  const availableLessons = allLessons.filter(
    (l) => !course.lessonIds.includes(l.id)
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <button
            onClick={() => router.push("/courses")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        {/* コース情報 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-600">
              開始日: {new Date(course.startDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              期間: {course.durationDays}日
            </p>
            <p className="text-sm text-gray-600">
              1日の目標: {course.dailyTarget}問
            </p>
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>進捗</span>
              <span>
                {daysElapsed}日 / {course.durationDays}日
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* コースに含まれるレッスン */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">このコースのレッスン</h2>
          {courseLessons.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center text-gray-600">
              レッスンがありません。
            </div>
          ) : (
            <div className="space-y-2">
              {courseLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{lesson.title}</h3>
                    <button
                      onClick={() => router.push(`/lessons/${lesson.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                    >
                      詳細を見る
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveLesson(lesson.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-1 px-3 rounded-lg text-sm"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* レッスンを追加 */}
        {availableLessons.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">レッスンを追加</h2>
            <div className="space-y-2">
              {availableLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{lesson.title}</h3>
                  </div>
                  <button
                    onClick={() => handleAddLesson(lesson.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-lg text-sm"
                  >
                    追加
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {availableLessons.length === 0 && allLessons.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-600">
            すべてのレッスンが追加済みです。
          </div>
        )}

        {allLessons.length === 0 && (
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <p className="text-gray-600 mb-2">レッスンがありません。</p>
            <button
              onClick={() => router.push("/lessons")}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              レッスンを作成
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

