"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Source } from "@/types/ai-card";
import { generateCardCandidates } from "@/lib/text-processing";
import { isAdminAuthenticated, setAdminAuthenticated, verifyAdminPassword } from "@/lib/admin-auth";
import MessageDialog from "@/components/MessageDialog";
import LoadingSpinner from "@/components/LoadingSpinner";

function AICardContent() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [rawOcrText, setRawOcrText] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    // 認証状態をチェック
    setIsAuthenticated(isAdminAuthenticated());
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

  const handleLogin = () => {
    if (verifyAdminPassword(password)) {
      setAdminAuthenticated(true);
      setIsAuthenticated(true);
      setSavedPassword(password); // パスワードを保存（OCR実行時に使用）
      setPassword("");
    } else {
      setMessageDialog({
        isOpen: true,
        title: "認証エラー",
        message: "管理者パスワードが正しくありません。",
      });
    }
  };

  const handleOCR = async () => {
    if (!imageFile || !imagePreview) return;

    setIsProcessing(true);
    setProgress(0);
    setStatus("ChatGPT APIでOCR処理中...");

    try {
      // ChatGPT APIを使用してOCR実行
      setStatus("画像をアップロード中...");
      setProgress(0.2);

      const response = await fetch("/api/ai-ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: imagePreview,
          password: savedPassword, // 保存された管理者パスワードを送信
        }),
      });

      setProgress(0.5);
      setStatus("テキストを抽出中...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "OCR処理に失敗しました。");
      }

      const ocrResult = await response.json();
      setProgress(1.0);
      setStatus("OCR完了");

      setRawOcrText(ocrResult.text);

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
      setMessageDialog({
        isOpen: true,
        title: "OCRエラー",
        message: error instanceof Error ? error.message : "OCR処理に失敗しました。",
      });
      setStatus("エラー");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoCard = async () => {
    if (!rawOcrText || !sourceId) return;

    setIsProcessing(true);
    setStatus("自動分割・翻訳中...");
    setProgress(0);

    try {
      // 自動分割・自動翻訳を実行
      const result = await generateCardCandidates(rawOcrText, (step, progressValue) => {
        setStatus(step);
        setProgress(progressValue);
      });

      // Draftを保存
      await storage.init();
      const draft = {
        id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId,
        cards: result.cards,
        warnings: result.warnings,
        detected: result.detected,
        createdAt: new Date(),
      };
      await storage.saveDraft(draft);

      // レビュー画面へ
      router.push(`/cards/ai-card/review?draftId=${draft.id}`);
    } catch (error) {
      console.error("Auto card error:", error);
      setMessageDialog({
        isOpen: true,
        title: "自動分割・翻訳エラー",
        message: error instanceof Error ? error.message : "自動分割・翻訳に失敗しました。",
      });
      setStatus("エラー");
    } finally {
      setIsProcessing(false);
    }
  };

  // 認証が必要な場合
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h1 className="text-2xl font-bold mb-6 text-center dark:text-white">管理者認証</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
              AI-OCR機能を使用するには管理者パスワードが必要です。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-gray-300">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                  placeholder="管理者パスワードを入力"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
              >
                ログイン
              </button>
            </div>
          </div>
        </main>
        <MessageDialog
          isOpen={messageDialog.isOpen}
          title={messageDialog.title}
          message={messageDialog.message}
          onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold dark:text-white">AI-OCRでカード化（管理者専用）</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAdminAuthenticated(false);
                setIsAuthenticated(false);
                setSavedPassword(""); // パスワードをクリア
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ログアウト
            </button>
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ← 戻る
            </button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            📝 <strong>機能説明:</strong> ChatGPT APIを使用して画像から英文を抽出し、自動的に文単位で分割して日本語に翻訳します。
            翻訳結果は確認・編集してからカードとして保存できます。
          </p>
        </div>

        <div className="space-y-6">
            {/* ステップ1: 画像アップロード */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">ステップ1: 画像をアップロード</h2>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">ステップ2: ChatGPT APIでOCR実行</h2>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">OCR結果:</p>
                  <textarea
                    value={rawOcrText}
                    readOnly
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 min-h-[200px] bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* ステップ3: 自動分割・翻訳 */}
          {rawOcrText && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">ステップ3: 自動分割・翻訳</h2>
              <button
                onClick={handleAutoCard}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
              >
                {isProcessing ? "処理中..." : "自動分割・翻訳を実行"}
              </button>
              {isProcessing && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{status}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
}

export default function AICardPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="読み込み中..." />}>
      <AICardContent />
    </Suspense>
  );
}

