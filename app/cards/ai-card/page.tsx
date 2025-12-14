"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { ocrService } from "@/lib/ocr";
import { Source } from "@/types/ai-card";
import { isPremiumEnabled, PREMIUM_FEATURES } from "@/lib/premium";

function AICardContent() {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [rawOcrText, setRawOcrText] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    setIsPremium(isPremiumEnabled(PREMIUM_FEATURES.AI_OCR));
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOCR = async () => {
    if (!imageFile || !imagePreview) return;

    setIsProcessing(true);
    setProgress(0);
    setStatus("OCR処理中...");

    try {
      // OCR実行
      const ocrResult = await ocrService.extractText(imageFile, (progress) => {
        setProgress(progress.progress);
        setStatus(progress.status);
      });

      setRawOcrText(ocrResult.text);
      setStatus("OCR完了");

      // Sourceを保存
      await storage.init();
      const source: Source = {
        id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageId: imagePreview, // base64データを保存
        rawOcrText: ocrResult.text,
        createdAt: new Date(),
      };
      await storage.saveSource(source);
      setSourceId(source.id);
    } catch (error) {
      console.error("OCR error:", error);
      alert("OCR処理に失敗しました。");
      setStatus("エラー");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAICard = async () => {
    if (!rawOcrText || !sourceId) return;

    setIsProcessing(true);
    setStatus("AI整形中...");

    try {
      const response = await fetch("/api/ai-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawOcrText }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "AI整形に失敗しました");
      }

      const aiResponse = await response.json();

      // Draftを保存
      await storage.init();
      const { saveDraft } = await import("@/lib/storage");
      const draft = {
        id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId,
        cards: aiResponse.cards,
        warnings: aiResponse.warnings,
        detected: aiResponse.detected,
        createdAt: new Date(),
      };
      await storage.saveDraft(draft);

      // レビュー画面へ
      router.push(`/cards/ai-card/review?draftId=${draft.id}`);
    } catch (error) {
      console.error("AI card error:", error);
      alert(error instanceof Error ? error.message : "AI整形に失敗しました。");
      setStatus("エラー");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">AIでカード化</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← 戻る
          </button>
        </div>

        {!isPremium && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔒</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  AI OCR機能はプレミアム機能です
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  AI OCR機能をご利用いただくには、アプリ内課金が必要です。
                  この機能はAPIコストがかかるため、無料ではご利用いただけません。
                </p>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>開発・テスト用:</strong> ブラウザのコンソールで以下のコマンドを実行すると、一時的に有効化できます。
                  </p>
                  <div className="space-y-2 mb-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">ステップ1: コンソールを開く</p>
                      <p className="text-xs text-gray-700">
                        Windows/Linux: <kbd className="bg-gray-200 px-1 py-0.5 rounded text-xs">F12</kbd> キー<br/>
                        Mac: <kbd className="bg-gray-200 px-1 py-0.5 rounded text-xs">Cmd + Option + I</kbd>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">ステップ2: コンソールタブを選択</p>
                      <p className="text-xs text-gray-700">デベロッパーツールの「Console」タブをクリック</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">ステップ3: コマンドを実行</p>
                      <p className="text-xs text-gray-700 mb-1">⚠️ セキュリティ警告が表示された場合:</p>
                      <p className="text-xs text-gray-600 mb-2 pl-2">
                        コンソールに <code className="bg-gray-200 px-1 rounded">allow pasting</code> と入力してEnterを押してから、コマンドを貼り付けます。
                      </p>
                      <p className="text-xs text-gray-700 mb-1">方法A: 1行目を実行</p>
                      <code className="text-xs bg-gray-100 p-2 rounded block font-mono break-all mb-2">
                        localStorage.setItem('instant_output_premium', JSON.stringify(&#123;'enabled': true, 'features': ['ai_ocr']&#125;));
                      </code>
                      <p className="text-xs text-gray-700 mb-1">方法B: 2行目を実行（またはブラウザのリロードボタンをクリック）</p>
                      <code className="text-xs bg-gray-100 p-2 rounded block font-mono break-all">
                        location.reload();
                      </code>
                    </div>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-semibold mb-2">
                      詳しい手順を見る
                    </summary>
                    <div className="text-gray-600 space-y-2 pl-2 border-l-2 border-gray-300">
                      <p><strong>Chrome/Edge:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>F12キーを押す、または右クリック→「検証」</li>
                        <li>「Console」タブを選択</li>
                        <li>下部の入力欄にコマンドを貼り付けてEnter</li>
                      </ul>
                      <p className="mt-2"><strong>Firefox:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>F12キーを押す、またはメニュー→「開発者ツール」</li>
                        <li>「コンソール」タブを選択</li>
                        <li>下部の入力欄にコマンドを貼り付けてEnter</li>
                      </ul>
                      <p className="mt-2"><strong>Safari (Mac):</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>設定→詳細→「開発メニューを表示」を有効化</li>
                        <li>Cmd + Option + C でコンソールを開く</li>
                        <li>コマンドを貼り付けてEnter</li>
                      </ul>
                    </div>
                  </details>
                </div>
                <button
                  onClick={() => router.back()}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  戻る
                </button>
              </div>
            </div>
          </div>
        )}

        {isPremium && (
          <div className="space-y-6">
            {/* ステップ1: 画像アップロード */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">ステップ1: 画像をアップロード</h2>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
              disabled={isProcessing}
            />
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-auto rounded-lg border border-gray-300"
                />
              </div>
            )}
          </div>

          {/* ステップ2: OCR */}
          {imageFile && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">ステップ2: OCR実行</h2>
              {!rawOcrText ? (
                <div>
                  <button
                    onClick={handleOCR}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
                  >
                    OCRを実行
                  </button>
                  {isProcessing && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{status}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">OCR結果:</p>
                  <textarea
                    value={rawOcrText}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[200px] bg-gray-50"
                  />
                </div>
              )}
            </div>
          )}

          {/* ステップ3: AI整形 */}
          {rawOcrText && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">ステップ3: AIでカード化</h2>
              <button
                onClick={handleAICard}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
              >
                {isProcessing ? "AI整形中..." : "AIでカード化"}
              </button>
              {isProcessing && (
                <p className="text-sm text-gray-600 mt-2">{status}</p>
              )}
            </div>
          )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AICardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    }>
      <AICardContent />
    </Suspense>
  );
}

