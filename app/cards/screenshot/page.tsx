"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { ocrService, OCRProgress } from "@/lib/ocr";
import { Lesson, Card } from "@/types/models";
import { processOcrText } from "@/lib/text-processing";

export default function ScreenshotCardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [promptJp, setPromptJp] = useState("");
  const [targetEn, setTargetEn] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [splitSentences, setSplitSentences] = useState<string[]>([]);
  const [selectedSentences, setSelectedSentences] = useState<Set<number>>(new Set());
  const [showSplitView, setShowSplitView] = useState(false);
  const progressUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ocrAbortControllerRef = useRef<AbortController | null>(null);

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

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 複数ファイル対応
    if (files.length > 1) {
      // 複数画像の場合は、最初の画像のみ処理（将来的に拡張可能）
      // 現在は1枚ずつ処理することを推奨
      alert(`複数の画像が選択されました。最初の画像のみ処理します。\n複数画像の一括処理は、今後実装予定です。`);
      processImageFile(files[0]);
    } else {
      processImageFile(files[0]);
    }
  }

  // 画像を最適化する関数（OCR処理を高速化）
  // OCRには高解像度は不要なので、積極的にリサイズ・圧縮
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

        // リサイズが必要かチェック（サイズまたは解像度）
        const needsResize =
          width > maxWidth ||
          height > maxHeight ||
          file.size > 1 * 1024 * 1024; // 1MB以上は必ず最適化

        if (!needsResize) {
          resolve(file);
          return;
        }

        // アスペクト比を維持してリサイズ
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

        // 画像の描画（スムージングを無効にして処理速度を向上）
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG形式で圧縮（OCRには十分）
        const outputType = "image/jpeg";
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: outputType,
                lastModified: Date.now(),
              });
              const newSize = optimizedFile.size;
              console.log(
                `画像を最適化: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(newSize / 1024 / 1024).toFixed(2)}MB (${width}x${height}px)`
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

  async function processImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      return;
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      alert("画像ファイルは10MB以下にしてください。");
      return;
    }

    // 画像選択時に自動的に最適化（読み込み段階で処理）
    // これによりOCR処理が大幅に高速化される
    try {
      const optimizedFile = await optimizeImageForOCR(file, 1600, 1600, 0.85);
      setImageFile(optimizedFile);
      
      // プレビュー用にリサイズ（表示用）
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(optimizedFile);
    } catch (error) {
      console.error("画像の最適化に失敗しました:", error);
      // 最適化に失敗した場合は元のファイルを使用
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  }

  async function handleExtractText() {
    if (!imageFile) {
      alert("画像を選択してください。");
      return;
    }

    setIsExtracting(true);
    setOcrProgress({ status: "初期化中...", progress: 0 });
    setExtractedText("");
    setOcrConfidence(null);

    // 90%以降の進捗が更新されない場合のフォールバック
    // 定期的に進捗を少しずつ増やす（最大95%まで）
    let lastProgress = 0;
    progressUpdateIntervalRef.current = setInterval(() => {
      setOcrProgress((prev) => {
        if (!prev) return prev;
        // 90%以上で進捗が更新されていない場合、少しずつ増やす
        if (prev.progress >= 0.9 && prev.progress < 0.95) {
          const newProgress = Math.min(prev.progress + 0.01, 0.95);
          lastProgress = newProgress;
          return {
            ...prev,
            progress: newProgress,
            status: prev.status || "画像を解析中...",
          };
        }
        return prev;
      });
    }, 2000); // 2秒ごとに更新

    // タイムアウト処理（2分に短縮）
    const timeoutId = setTimeout(() => {
      if (isExtracting) {
        if (progressUpdateIntervalRef.current) {
          clearInterval(progressUpdateIntervalRef.current);
        }
        setIsExtracting(false);
        setOcrProgress(null);
        alert(
          "処理がタイムアウトしました（2分）。\n\n画像が大きすぎる可能性があります。\n画像をリサイズしてから再度お試しください。"
        );
      }
    }, 2 * 60 * 1000); // 2分に短縮

    try {
      const result = await ocrService.extractText(imageFile, (progress) => {
        // 進捗が更新されたら、フォールバックの進捗をリセット
        lastProgress = progress.progress;
        setOcrProgress(progress);
      });

      clearTimeout(timeoutId);
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }

      setExtractedText(result.text);
      setOcrConfidence(result.confidence || null);

      // OCR結果を英語欄に自動入力（ユーザーが編集可能）
      if (
        result.text &&
        !result.text.includes("[OCR機能") &&
        !result.text.includes("利用できません")
      ) {
        setTargetEn(result.text);
        
        // 自動的に文章を分割
        const sentences = processOcrText(result.text);
        if (sentences.length > 1) {
          setSplitSentences(sentences);
          setSelectedSentences(new Set(sentences.map((_, i) => i))); // すべて選択
          setShowSplitView(true);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
      console.error("Failed to extract text:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "テキスト抽出に失敗しました。";
      alert(
        `${errorMessage}\n\nネットワーク接続を確認するか、手動でテキストを入力してください。`
      );
      setExtractedText("");
    } finally {
      setIsExtracting(false);
      setOcrProgress(null);
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
        progressUpdateIntervalRef.current = null;
      }
    }
  }

  async function handleSave() {
    if (!selectedLessonId) {
      alert("レッスンを選択してください。");
      return;
    }

    if (!targetEn.trim()) {
      alert("英語を入力してください。");
      return;
    }

    setIsSaving(true);
    try {
      const card: Card = {
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lessonId: selectedLessonId,
        prompt_jp: promptJp.trim() || "(後で追加)",
        target_en: targetEn.trim(),
        source_type: "screenshot",
        imageData: imagePreview || undefined, // 画像データを保存
      };
      await storage.saveCard(card);
      alert("カードを保存しました！");
      router.push(`/lessons/${selectedLessonId}`);
    } catch (error) {
      console.error("Failed to save card:", error);
      alert("カードの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveSplitCards() {
    if (!selectedLessonId) {
      alert("レッスンを選択してください。");
      return;
    }

    if (selectedSentences.size === 0) {
      alert("カードを作成する文章を選択してください。");
      return;
    }

    setIsSaving(true);
    try {
      await storage.init();
      const cardsToSave: Card[] = Array.from(selectedSentences).map((index) => {
        const sentence = splitSentences[index];
        return {
          id: `card_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          lessonId: selectedLessonId,
          prompt_jp: "(後で追加)",
          target_en: sentence.trim(),
          source_type: "screenshot",
          imageData: imagePreview || undefined,
        };
      });

      await Promise.all(cardsToSave.map(card => storage.saveCard(card)));
      alert(`${cardsToSave.length}枚のカードを作成しました！`);
      router.push(`/lessons/${selectedLessonId}`);
    } catch (error) {
      console.error("Failed to save cards:", error);
      alert("カードの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleSentenceSelection(index: number) {
    setSelectedSentences((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      return newSelection;
    });
  }

  function selectAllSentences() {
    setSelectedSentences(new Set(splitSentences.map((_, i) => i)));
  }

  function deselectAllSentences() {
    setSelectedSentences(new Set());
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setExtractedText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleCancelExtraction() {
    if (progressUpdateIntervalRef.current) {
      clearInterval(progressUpdateIntervalRef.current);
      progressUpdateIntervalRef.current = null;
    }
    setIsExtracting(false);
    setOcrProgress(null);
    // Tesseract.jsのworkerを終了（可能であれば）
    // 注意: 現在の実装ではworkerの終了は難しいため、状態をリセットするのみ
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
          <h1 className="text-3xl font-bold">スクリーンショットから追加</h1>
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

          {/* 画像アップロード */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              スクリーンショット画像
            </label>
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <p className="text-gray-600 mb-2">画像をクリックして選択</p>
                <p className="text-sm text-gray-500">
                  またはドラッグ&ドロップ（PNG, JPG, GIF対応）
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  ※ 大きな画像は自動的に最適化されます（最大1600x1600px）
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={handleImageSelect}
                  multiple
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExtractText}
                    disabled={isExtracting}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg"
                  >
                    {isExtracting ? "テキスト抽出中..." : "テキストを抽出（OCR）"}
                  </button>
                  {isExtracting && (
                    <button
                      onClick={handleCancelExtraction}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      キャンセル
                    </button>
                  )}
                </div>

                {/* OCR進捗表示 */}
                {isExtracting && ocrProgress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-blue-800 font-semibold">
                          {ocrProgress.status}
                        </p>
                        {/* 90%以降はアニメーションで処理中であることを示す */}
                        {ocrProgress.progress >= 0.9 && ocrProgress.progress < 1.0 && (
                          <span className="animate-pulse text-blue-600">●</span>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 font-mono">
                        {Math.round(ocrProgress.progress * 100)}%
                      </p>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 mb-2 relative overflow-hidden">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${ocrProgress.progress * 100}%` }}
                      />
                      {/* 90%以降はアニメーション効果 */}
                      {ocrProgress.progress >= 0.9 && ocrProgress.progress < 1.0 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      )}
                    </div>
                    {ocrProgress.progress < 0.3 && (
                      <div className="space-y-1 text-xs text-blue-700">
                        <p>⏳ 初回使用時は言語データのダウンロードが必要です</p>
                        <p>📦 英語データ: 約5MB、日本語データ: 約15MB</p>
                        <p>🌐 インターネット接続が必要です</p>
                        <p>⏱️ 通常は1-3分程度かかります</p>
                      </div>
                    )}
                    {ocrProgress.progress >= 0.3 && ocrProgress.progress < 0.9 && (
                      <p className="text-xs text-blue-600">
                        ✓ 言語データのダウンロードが完了しました
                      </p>
                    )}
                    {ocrProgress.progress >= 0.9 && ocrProgress.progress < 1.0 && (
                      <div className="space-y-1 text-xs text-blue-700">
                        <p className="font-semibold">🔄 画像からテキストを抽出中...</p>
                        <p>画像のサイズや複雑さによって時間がかかることがあります</p>
                        <p>通常は10-30秒程度です</p>
                        <p className="text-red-600 font-semibold mt-2">
                          ⚠️ 2分以上かかる場合は「キャンセル」ボタンで中断し、画像を小さくして再試行してください
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 抽出結果表示 */}
                {extractedText && !isExtracting && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-600 font-semibold">
                        抽出されたテキスト:
                      </p>
                      {ocrConfidence !== null && (
                        <p className="text-xs text-gray-500">
                          信頼度: {ocrConfidence.toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {extractedText}
                    </p>
                    {ocrConfidence !== null && ocrConfidence < 50 && (
                      <p className="text-xs text-yellow-600 mt-2">
                        ⚠️ 信頼度が低いため、抽出結果を確認・編集してください
                      </p>
                    )}
                    {extractedText && !showSplitView && (
                      <button
                        onClick={() => {
                          const sentences = processOcrText(extractedText);
                          if (sentences.length > 1) {
                            setSplitSentences(sentences);
                            setSelectedSentences(new Set(sentences.map((_, i) => i)));
                            setShowSplitView(true);
                          } else if (sentences.length === 1) {
                            alert("文章が1つしか見つかりませんでした。");
                          } else {
                            alert("有効な文章が見つかりませんでした。");
                          }
                        }}
                        className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                      >
                        📝 文章を自動分割してカードを作成
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 日本語入力 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              日本語（任意）
            </label>
            <textarea
              value={promptJp}
              onChange={(e) => setPromptJp(e.target.value)}
              placeholder="日本語文を入力（後で追加も可能）..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[80px]"
              rows={2}
            />
          </div>

          {/* 文章分割ビュー */}
          {showSplitView && splitSentences.length > 0 && (
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-800">
                  📝 文章を自動分割しました（{splitSentences.length}個）
                </h3>
                <button
                  onClick={() => setShowSplitView(false)}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  閉じる
                </button>
              </div>
              
              <div className="mb-4 flex gap-2">
                <button
                  onClick={selectAllSentences}
                  className="bg-purple-200 hover:bg-purple-300 text-purple-800 font-semibold py-2 px-4 rounded-lg text-sm"
                >
                  すべて選択
                </button>
                <button
                  onClick={deselectAllSentences}
                  className="bg-purple-200 hover:bg-purple-300 text-purple-800 font-semibold py-2 px-4 rounded-lg text-sm"
                >
                  選択解除
                </button>
                <span className="ml-auto text-sm text-purple-700 font-semibold">
                  {selectedSentences.size} / {splitSentences.length} 個選択中
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
                {splitSentences.map((sentence, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-lg p-3 border-2 cursor-pointer transition-colors ${
                      selectedSentences.has(index)
                        ? "border-purple-500 bg-purple-100"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => toggleSentenceSelection(index)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSentences.has(index)}
                        onChange={() => toggleSentenceSelection(index)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{sentence}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          文章 #{index + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveSplitCards}
                disabled={isSaving || selectedSentences.size === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg"
              >
                {isSaving ? "保存中..." : `選択した${selectedSentences.size}枚のカードを作成`}
              </button>
            </div>
          )}

          {/* 英語入力（分割ビューが表示されていない場合のみ） */}
          {!showSplitView && (
            <div>
              <label className="block text-sm font-semibold mb-2">
                英語（編集可能）
              </label>
              <textarea
                value={targetEn}
                onChange={(e) => setTargetEn(e.target.value)}
                placeholder="英語文を入力（OCR結果を編集できます）..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[100px]"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                OCRで抽出したテキストを編集できます
              </p>
            </div>
          )}

          {/* 保存ボタン（分割ビューが表示されていない場合のみ） */}
          {!showSplitView && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !targetEn.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => router.back()}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

