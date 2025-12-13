// レッスン管理ユーティリティ

import { storage } from "./storage";
import { Lesson } from "@/types/models";

const DEFAULT_LESSON_TITLE = "デフォルトレッスン";

/**
 * デフォルトレッスンを取得または作成
 */
export async function getOrCreateDefaultLesson(): Promise<Lesson> {
  await storage.init();
  
  const allLessons = await storage.getAllLessons();
  
  // 既存のデフォルトレッスンを探す
  const defaultLesson = allLessons.find(
    (lesson) => lesson.title === DEFAULT_LESSON_TITLE && !lesson.courseId
  );
  
  if (defaultLesson) {
    return defaultLesson;
  }
  
  // デフォルトレッスンを作成
  const newLesson: Lesson = {
    id: `lesson_${Date.now()}`,
    title: DEFAULT_LESSON_TITLE,
  };
  
  await storage.saveLesson(newLesson);
  return newLesson;
}

