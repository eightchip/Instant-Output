"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { ocrService } from "@/lib/ocr";
import { Lesson, Card } from "@/types/models";

interface ProcessedImage {
  file: File;
  preview: string;
  extractedText: string;
  promptJp: string;
  targetEn: string;
  isProcessing: boolean;
  isCompleted: boolean;
}

export default function BatchScreenshotPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // 画像を最適化する関数（既存の関数を再利用）
  function optimizeImageForOCR(
    file: File,
    maxWidth: number = 1600,
    maxHeight: number = 1600,
    quality: number = 0.85
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const originalSize = file.size;

        const needsResize =
          width > maxWidth ||
          height > maxHeight ||
          file.size > 1 * 1024 * 1024;

        if (!needsResize) {
          resolve(file);
          return;
        }

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = "image/jpeg";
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, ".jpg"),
                {
                  type: outputType,
                  lastModified: Date.now(),
                }
              );
              resolve(optimizedFile);
            } else {
              reject(new Error("Failed to optimize image"));
            }
          },
          outputType,
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      alert("画像ファイルを選択してください。");
      return;
    }

    // 各画像を最適化してプレビューを作成
    const processedImages: ProcessedImage[] = [];
    for (const file of imageFiles) {
      try {
        const optimized = await optimizeImageForOCR(file);
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(optimized);
        });

        processedImages.push({
          file: optimized,
          preview,
          extractedText: "",
          promptJp: "",
          targetEn: "",
          isProcessing: false,
          isCompleted: false,
        });
      } catch (error) {
        console.error("Failed to process image:", error);
      }
    }

    setImages((prev) => [...prev, ...processedImages]);
  }

  async function handleExtractAll() {
    if (!selectedLessonId) {
      alert("レッスンを選択してください。");
      return;
    }

    if (images.length === 0) {
      alert("画像を選択してください。");
      return;
    }

    setIsProcessing(true);

    // 各画像を順番にOCR処理
    for (let i = 0; i < images.length; i++) {
      setImages((prev) =>
        prev.map((img, idx) =>
          idx === i ? { ...img, isProcessing: true } : img
        )
      );

      try {
        const result = await ocrService.extractText(images[i].file);
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === i
              ? {
                  ...img,
                  extractedText: result.text,
                  targetEn: result.text,
                  isProcessing: false,
                  isCompleted: true,
                }
              : img
          )
        );
      } catch (error) {
        console.error("Failed to extract text:", error);
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === i ? { ...img, isProcessing: false } : img
          )
        );
      }
    }

    setIsProcessing(false);
  }

  async function handleSaveAll() {
    if (!selectedLessonId) {
      alert("レッスンを選択してください。");
      return;
    }

    const completedImages = images.filter(
      (img) => img.isCompleted && img.targetEn.trim()
    );

    if (completedImages.length === 0) {
      alert("保存できるカードがありません。");
      return;
    }

    try {
      await storage.init();
      const cardsToSave: Card[] = completedImages.map((img) => ({
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lessonId: selectedLessonId,
        prompt_jp: img.promptJp.trim() || "(後で追加)",
        target_en: img.targetEn.trim(),
        source_type: "screenshot",
      }));

      await Promise.all(cardsToSave.map((card) => storage.saveCard(card)));
      alert(`${cardsToSave.length}枚のカードを保存しました！`);
      router.push(`/lessons/${selectedLessonId}`);
    } catch (error) {
      console.error("Failed to save cards:", error);
      alert("カードの保存に失敗しました。");
    }
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateImage(index: number, field: "promptJp" | "targetEn", value: string) {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, [field]: value } : img))
    );
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
          <h1 className="text-3xl font-bold">複数画像から一括追加</h1>
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
            <label className="block text-sm font-semibold mb-2">レッスン</label>
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

          {/* 画像選択 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              画像を選択（複数可）
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <p className="text-gray-600 mb-2">画像をクリックして選択</p>
              <p className="text-sm text-gray-500">
                またはドラッグ&ドロップ（複数選択可）
              </p>
              <p className="text-xs text-gray-400 mt-2">
                ※ 大きな画像は自動的に最適化されます
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* 画像一覧 */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  選択した画像 ({images.length}枚)
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExtractAll}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    {isProcessing ? "処理中..." : "すべてOCR処理"}
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={
                      isProcessing ||
                      images.filter((img) => img.isCompleted && img.targetEn.trim())
                        .length === 0
                    }
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    すべて保存
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={img.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            日本語（任意）
                          </label>
                          <input
                            type="text"
                            value={img.promptJp}
                            onChange={(e) =>
                              handleUpdateImage(index, "promptJp", e.target.value)
                            }
                            placeholder="日本語を入力..."
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            英語
                          </label>
                          <textarea
                            value={img.targetEn}
                            onChange={(e) =>
                              handleUpdateImage(index, "targetEn", e.target.value)
                            }
                            placeholder="英語を入力（OCR結果を編集可）..."
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[60px]"
                            rows={2}
                          />
                        </div>
                        {img.extractedText && (
                          <p className="text-xs text-gray-500">
                            OCR結果: {img.extractedText.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                    {img.isProcessing && (
                      <div className="text-sm text-blue-600">OCR処理中...</div>
                    )}
                    {img.isCompleted && (
                      <div className="text-sm text-green-600">✓ 完了</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

