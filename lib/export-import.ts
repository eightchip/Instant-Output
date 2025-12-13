// データのエクスポート/インポート機能

import { storage } from "./storage";
import { Course, Lesson, Card, Review, StudySession } from "@/types/models";

export interface ExportData {
  version: string;
  exportDate: string;
  courses: Course[];
  lessons: Lesson[];
  cards: Card[];
  reviews: Review[];
  studySessions: StudySession[];
}

/**
 * すべてのデータをエクスポート
 */
export async function exportAllData(): Promise<ExportData> {
  await storage.init();

  const [courses, lessons, cards, reviews, studySessions] = await Promise.all([
    storage.getAllCourses(),
    storage.getAllLessons(),
    storage.getAllCards(),
    storage.getAllReviews(),
    storage.getAllStudySessions(),
  ]);

  return {
    version: "1.0",
    exportDate: new Date().toISOString(),
    courses,
    lessons,
    cards,
    reviews,
    studySessions,
  };
}

/**
 * データをJSONファイルとしてダウンロード
 */
export function downloadExportData(data: ExportData, filename?: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `instant_output_backup_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * インポートデータの検証
 */
export function validateImportData(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["無効なデータ形式です"] };
  }

  // 必須フィールドのチェック
  if (!Array.isArray(data.courses)) {
    errors.push("coursesが配列ではありません");
  }
  if (!Array.isArray(data.lessons)) {
    errors.push("lessonsが配列ではありません");
  }
  if (!Array.isArray(data.cards)) {
    errors.push("cardsが配列ではありません");
  }
  if (!Array.isArray(data.reviews)) {
    errors.push("reviewsが配列ではありません");
  }
  if (!Array.isArray(data.studySessions)) {
    errors.push("studySessionsが配列ではありません");
  }

  // 基本的な型チェック
  if (data.cards && Array.isArray(data.cards)) {
    data.cards.forEach((card: any, index: number) => {
      if (!card.id) errors.push(`cards[${index}]: idがありません`);
      if (!card.lessonId) errors.push(`cards[${index}]: lessonIdがありません`);
      if (!card.target_en) errors.push(`cards[${index}]: target_enがありません`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * データをインポート
 */
export async function importAllData(
  data: ExportData,
  options: { merge?: boolean; overwrite?: boolean } = {}
): Promise<{ success: boolean; message: string }> {
  try {
    await storage.init();

    const validation = validateImportData(data);
    if (!validation.valid) {
      return {
        success: false,
        message: `データの検証に失敗しました:\n${validation.errors.join("\n")}`,
      };
    }

    if (options.overwrite) {
      // 既存データをすべて削除（実装が必要）
      // 現在はマージのみ対応
    }

    // データをインポート
    const promises: Promise<void>[] = [];

    // Courses
    for (const course of data.courses) {
      promises.push(storage.saveCourse(course));
    }

    // Lessons
    for (const lesson of data.lessons) {
      promises.push(storage.saveLesson(lesson));
    }

    // Cards
    for (const card of data.cards) {
      promises.push(storage.saveCard(card));
    }

    // Reviews
    for (const review of data.reviews) {
      promises.push(storage.saveReview(review));
    }

    // StudySessions
    for (const session of data.studySessions) {
      promises.push(storage.saveStudySession(session));
    }

    await Promise.all(promises);

    return {
      success: true,
      message: `データをインポートしました:\n- コース: ${data.courses.length}\n- レッスン: ${data.lessons.length}\n- カード: ${data.cards.length}\n- 復習: ${data.reviews.length}\n- 学習履歴: ${data.studySessions.length}`,
    };
  } catch (error) {
    console.error("Import failed:", error);
    return {
      success: false,
      message: `インポートに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
    };
  }
}

