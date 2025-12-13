// IndexedDB ストレージ層

import { Course, Lesson, Card, Review, StudySession } from "@/types/models";

const DB_NAME = "instant_output_db";
const DB_VERSION = 2;

const STORES = {
  courses: "courses",
  lessons: "lessons",
  cards: "cards",
  reviews: "reviews",
  studySessions: "studySessions",
} as const;

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Courses store
        if (!db.objectStoreNames.contains(STORES.courses)) {
          const courseStore = db.createObjectStore(STORES.courses, {
            keyPath: "id",
          });
          courseStore.createIndex("startDate", "startDate", { unique: false });
        }

        // Lessons store
        if (!db.objectStoreNames.contains(STORES.lessons)) {
          const lessonStore = db.createObjectStore(STORES.lessons, {
            keyPath: "id",
          });
          lessonStore.createIndex("courseId", "courseId", { unique: false });
        }

        // Cards store
        if (!db.objectStoreNames.contains(STORES.cards)) {
          const cardStore = db.createObjectStore(STORES.cards, {
            keyPath: "id",
          });
          cardStore.createIndex("lessonId", "lessonId", { unique: false });
        }

        // Reviews store
        if (!db.objectStoreNames.contains(STORES.reviews)) {
          const reviewStore = db.createObjectStore(STORES.reviews, {
            keyPath: "cardId",
          });
          reviewStore.createIndex("dueDate", "dueDate", { unique: false });
        }

        // StudySessions store
        if (!db.objectStoreNames.contains(STORES.studySessions)) {
          const sessionStore = db.createObjectStore(STORES.studySessions, {
            keyPath: "id",
          });
          sessionStore.createIndex("date", "date", { unique: false });
        }
      };
    });
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
  }

  // Course operations
  async saveCourse(course: Course): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.courses, "readwrite");
      const store = tx.objectStore(STORES.courses);
      // Date型をISO文字列に変換
      const courseData = {
        ...course,
        startDate: course.startDate instanceof Date ? course.startDate.toISOString() : course.startDate,
      };
      const request = store.put(courseData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCourse(id: string): Promise<Course | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.courses, "readonly");
      const store = tx.objectStore(STORES.courses);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        // ISO文字列をDate型に変換
        resolve({
          ...result,
          startDate: new Date(result.startDate),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCourses(): Promise<Course[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.courses, "readonly");
      const store = tx.objectStore(STORES.courses);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        // ISO文字列をDate型に変換
        resolve(
          results.map((course: any) => ({
            ...course,
            startDate: new Date(course.startDate),
          }))
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Lesson operations
  async saveLesson(lesson: Lesson): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.lessons, "readwrite");
      const store = tx.objectStore(STORES.lessons);
      const request = store.put(lesson);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLesson(id: string): Promise<Lesson | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.lessons, "readonly");
      const store = tx.objectStore(STORES.lessons);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.lessons, "readonly");
      const store = tx.objectStore(STORES.lessons);
      const index = store.index("courseId");
      const request = index.getAll(courseId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllLessons(): Promise<Lesson[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.lessons, "readonly");
      const store = tx.objectStore(STORES.lessons);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Card operations
  async saveCard(card: Card): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readwrite");
      const store = tx.objectStore(STORES.cards);
      const request = store.put(card);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCard(id: string): Promise<Card | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readonly");
      const store = tx.objectStore(STORES.cards);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getCardsByLesson(lessonId: string): Promise<Card[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readonly");
      const store = tx.objectStore(STORES.cards);
      const index = store.index("lessonId");
      const request = index.getAll(lessonId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCards(): Promise<Card[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readonly");
      const store = tx.objectStore(STORES.cards);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCard(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readwrite");
      const store = tx.objectStore(STORES.cards);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCard(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readwrite");
      const store = tx.objectStore(STORES.cards);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReview(cardId: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.reviews, "readwrite");
      const store = tx.objectStore(STORES.reviews);
      const request = store.delete(cardId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Review operations
  async saveReview(review: Review): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.reviews, "readwrite");
      const store = tx.objectStore(STORES.reviews);
      // Date型をISO文字列に変換
      const reviewData = {
        ...review,
        dueDate: review.dueDate instanceof Date ? review.dueDate.toISOString() : review.dueDate,
      };
      const request = store.put(reviewData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getReview(cardId: string): Promise<Review | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.reviews, "readonly");
      const store = tx.objectStore(STORES.reviews);
      const request = store.get(cardId);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        // ISO文字列をDate型に変換
        resolve({
          ...result,
          dueDate: new Date(result.dueDate),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDueReviews(limit?: number): Promise<Review[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.reviews, "readonly");
      const store = tx.objectStore(STORES.reviews);
      const index = store.index("dueDate");
      const request = index.getAll();
      request.onsuccess = () => {
        const now = new Date();
        const results = request.result || [];
        // ISO文字列をDate型に変換してフィルタ
        const due = results
          .map((review: any) => ({
            ...review,
            dueDate: new Date(review.dueDate),
          }))
          .filter((review: Review) => review.dueDate <= now);
        const sorted = due.sort(
          (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
        );
        resolve(limit ? sorted.slice(0, limit) : sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllReviews(): Promise<Review[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.reviews, "readonly");
      const store = tx.objectStore(STORES.reviews);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        // ISO文字列をDate型に変換
        resolve(
          results.map((review: any) => ({
            ...review,
            dueDate: new Date(review.dueDate),
          }))
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReview(cardId: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.reviews, "readwrite");
      const store = tx.objectStore(STORES.reviews);
      const request = store.delete(cardId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // StudySession operations
  async saveStudySession(session: StudySession): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.studySessions, "readwrite");
      const store = tx.objectStore(STORES.studySessions);
      // Date型をISO文字列に変換
      const sessionData = {
        ...session,
        date: session.date instanceof Date ? session.date.toISOString() : session.date,
      };
      const request = store.put(sessionData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStudySession(id: string): Promise<StudySession | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.studySessions, "readonly");
      const store = tx.objectStore(STORES.studySessions);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        // ISO文字列をDate型に変換
        resolve({
          ...result,
          date: new Date(result.date),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllStudySessions(): Promise<StudySession[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.studySessions, "readonly");
      const store = tx.objectStore(STORES.studySessions);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        // ISO文字列をDate型に変換
        resolve(
          results.map((session: any) => ({
            ...session,
            date: new Date(session.date),
          }))
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStudySessionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StudySession[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.studySessions, "readonly");
      const store = tx.objectStore(STORES.studySessions);
      const index = store.index("date");
      const request = index.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        // ISO文字列をDate型に変換してフィルタ
        const filtered = results
          .map((session: any) => ({
            ...session,
            date: new Date(session.date),
          }))
          .filter(
            (session: StudySession) =>
              session.date >= startDate && session.date <= endDate
          );
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const storage = new StorageService();

