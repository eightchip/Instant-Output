// IndexedDB ストレージ層

import { Course, Lesson, Card, Review, StudySession } from "@/types/models";
import { Source, Draft } from "@/types/ai-card";

const DB_NAME = "instant_output_db";
const DB_VERSION = 3; // バージョンを3に更新

const STORES = {
  courses: "courses",
  lessons: "lessons",
  cards: "cards",
  reviews: "reviews",
  studySessions: "studySessions",
  sources: "sources",
  drafts: "drafts",
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

        // Sources store
        if (!db.objectStoreNames.contains(STORES.sources)) {
          const sourceStore = db.createObjectStore(STORES.sources, {
            keyPath: "id",
          });
          sourceStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Drafts store
        if (!db.objectStoreNames.contains(STORES.drafts)) {
          const draftStore = db.createObjectStore(STORES.drafts, {
            keyPath: "id",
          });
          draftStore.createIndex("sourceId", "sourceId", { unique: false });
          draftStore.createIndex("createdAt", "createdAt", { unique: false });
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

  async deleteCourse(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.courses, "readwrite");
      const store = tx.objectStore(STORES.courses);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
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

  async deleteLesson(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.lessons, "readwrite");
      const store = tx.objectStore(STORES.lessons);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
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

  async updateCard(id: string, updates: Partial<Card>): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readwrite");
      const store = tx.objectStore(STORES.cards);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const card = getRequest.result;
        if (!card) {
          reject(new Error(`Card with id ${id} not found`));
          return;
        }
        const updatedCard = { ...card, ...updates };
        const putRequest = store.put(updatedCard);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteCards(ids: string[]): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readwrite");
      const store = tx.objectStore(STORES.cards);
      let completed = 0;
      let hasError = false;

      ids.forEach((id) => {
        const request = store.delete(id);
        request.onsuccess = () => {
          completed++;
          if (completed === ids.length && !hasError) {
            resolve();
          }
        };
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });
    });
  }

  async moveCardsToLesson(cardIds: string[], targetLessonId: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.cards, "readwrite");
      const store = tx.objectStore(STORES.cards);
      let completed = 0;
      let hasError = false;

      cardIds.forEach((id) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const card = getRequest.result;
          if (!card) {
            completed++;
            if (completed === cardIds.length && !hasError) {
              resolve();
            }
            return;
          }
          const updatedCard = { ...card, lessonId: targetLessonId };
          const putRequest = store.put(updatedCard);
          putRequest.onsuccess = () => {
            completed++;
            if (completed === cardIds.length && !hasError) {
              resolve();
            }
          };
          putRequest.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(putRequest.error);
            }
          };
        };
        getRequest.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(getRequest.error);
          }
        };
      });
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

  // Source operations
  async saveSource(source: Source): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.sources, "readwrite");
      const store = tx.objectStore(STORES.sources);
      const sourceData = {
        ...source,
        createdAt: source.createdAt instanceof Date ? source.createdAt.toISOString() : source.createdAt,
      };
      const request = store.put(sourceData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSource(id: string): Promise<Source | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.sources, "readonly");
      const store = tx.objectStore(STORES.sources);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        resolve({
          ...result,
          createdAt: new Date(result.createdAt),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSources(): Promise<Source[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.sources, "readonly");
      const store = tx.objectStore(STORES.sources);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        resolve(
          results.map((source: any) => ({
            ...source,
            createdAt: new Date(source.createdAt),
          }))
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Draft operations
  async saveDraft(draft: Draft): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.drafts, "readwrite");
      const store = tx.objectStore(STORES.drafts);
      const draftData = {
        ...draft,
        createdAt: draft.createdAt instanceof Date ? draft.createdAt.toISOString() : draft.createdAt,
      };
      const request = store.put(draftData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDraft(id: string): Promise<Draft | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.drafts, "readonly");
      const store = tx.objectStore(STORES.drafts);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        resolve({
          ...result,
          createdAt: new Date(result.createdAt),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDraftBySource(sourceId: string): Promise<Draft | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.drafts, "readonly");
      const store = tx.objectStore(STORES.drafts);
      const index = store.index("sourceId");
      const request = index.get(sourceId);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        resolve({
          ...result,
          createdAt: new Date(result.createdAt),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDraft(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.drafts, "readwrite");
      const store = tx.objectStore(STORES.drafts);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storage = new StorageService();

