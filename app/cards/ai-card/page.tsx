"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { Source } from "@/types/ai-card";
import { generateCardCandidates, processOcrText } from "@/lib/text-processing";
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
  const [useChatGPTTranslation, setUseChatGPTTranslation] = useState(true); // デフォルトでChatGPT翻訳を使用
  const [isEditingOcrText, setIsEditingOcrText] = useState(false);
  const [editingOcrText, setEditingOcrText] = useState("");
  const ocrTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    // 認証状態をチェック
    const authenticated = isAdminAuthenticated();
    setIsAuthenticated(authenticated);
    
    // 認証されていない場合は、保存されたパスワードもクリア
    if (!authenticated) {
      setSavedPassword("");
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像サイズのチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      setMessageDialog({
        isOpen: true,
        title: "画像サイズエラー",
        message: "画像サイズが大きすぎます。10MB以下の画像を選択してください。",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      // 画像をリサイズ（必要に応じて）
      try {
        const resizedBase64 = await resizeImageIfNeeded(base64, 2048); // 最大2048px
        setImagePreview(resizedBase64);
      } catch (error) {
        console.error("Image resize error:", error);
        setImagePreview(base64); // リサイズに失敗した場合は元の画像を使用
      }
    };
    reader.readAsDataURL(file);
  };

  // 画像をリサイズする関数
  const resizeImageIfNeeded = (base64: string, maxSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // サイズがmaxSize以下の場合はリサイズ不要
        if (width <= maxSize && height <= maxSize) {
          resolve(base64);
          return;
        }

        // アスペクト比を保ちながらリサイズ
        if (width > height) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.8);
        resolve(resizedBase64);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64;
    });
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
        let errorMessage = "OCR処理に失敗しました。";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonError) {
          // JSONパースに失敗した場合は、テキストとして読み込む
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      let ocrResult;
      try {
        ocrResult = await response.json();
      } catch (jsonError) {
        // JSONパースに失敗した場合
        const responseText = await response.text();
        throw new Error(`無効なレスポンス形式: ${responseText.substring(0, 200)}`);
      }
      setProgress(1.0);
      setStatus("OCR完了");

      setRawOcrText(ocrResult.text);
      setEditingOcrText(ocrResult.text); // 編集用のテキストも設定

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
    // 編集モードの場合は保存を促す
    if (isEditingOcrText) {
      setMessageDialog({
        isOpen: true,
        title: "編集を保存",
        message: "OCR結果を編集しています。先に「保存」ボタンをクリックしてから、自動分割・翻訳を実行してください。",
      });
      return;
    }

    if (!rawOcrText || !sourceId) return;

    // ChatGPT翻訳を使用する場合、パスワードが必須
    if (useChatGPTTranslation && !savedPassword) {
      setMessageDialog({
        isOpen: true,
        title: "認証エラー",
        message: "ChatGPT翻訳を使用するには、管理者パスワードが必要です。再度ログインしてください。",
      });
      return;
    }

    setIsProcessing(true);
    setStatus(useChatGPTTranslation ? "ChatGPTで自動分割・翻訳中..." : "自動分割・翻訳中...");
    setProgress(0);

    try {
      // 自動分割・自動翻訳を実行
      const result = await generateCardCandidates(
        rawOcrText,
        (step, progressValue) => {
          setStatus(step);
          setProgress(progressValue);
        },
        useChatGPTTranslation, // ChatGPT翻訳を使用するかどうか
        useChatGPTTranslation ? savedPassword : undefined // ChatGPT使用時のみパスワードを渡す
      );

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
      <div className="flex min-h-screen flex-col bg-gray-50">
        <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h1 className="text-2xl font-bold mb-6 text-center">管理者認証</h1>
            <p className="text-sm text-gray-600 mb-4 text-center">
              AI-OCR機能を使用するには管理者パスワードが必要です。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900"
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">AI-OCRでカード化（管理者専用）</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAdminAuthenticated(false);
                setIsAuthenticated(false);
                setSavedPassword(""); // パスワードをクリア
                setRawOcrText(""); // OCR結果もクリア
                setSourceId(null);
                setImageFile(null);
                setImagePreview(null);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ログアウト
            </button>
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 戻る
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📝 <strong>機能説明:</strong> ChatGPT APIを使用して画像から英文を抽出し、自動的に文単位で分割して日本語に翻訳します。
            翻訳結果は確認・編集してからカードとして保存できます。
          </p>
        </div>

        <div className="space-y-6">
            {/* ステップ1: 画像アップロード */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">ステップ1: 画像をアップロード</h2>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 bg-white text-gray-900"
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
              <h2 className="text-xl font-semibold mb-4">ステップ2: ChatGPT APIでOCR実行</h2>
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
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">OCR結果:</p>
                    <button
                      onClick={() => {
                        setEditingOcrText(rawOcrText);
                        setIsEditingOcrText(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      全画面で編集
                    </button>
                  </div>
                  <textarea
                    value={rawOcrText}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[200px] bg-gray-50 text-gray-900"
                    placeholder="OCR結果がここに表示されます"
                  />
                </div>
              )}
            </div>
          )}

          {/* ステップ3: 自動分割・翻訳 */}
          {rawOcrText && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">ステップ3: 自動分割・翻訳</h2>
              
              {/* 翻訳方法の選択 */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold mb-2">翻訳方法を選択</label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="translationMethod"
                      value="chatgpt"
                      checked={useChatGPTTranslation}
                      onChange={() => setUseChatGPTTranslation(true)}
                      className="mr-2"
                      disabled={isProcessing}
                    />
                    <div>
                      <span className="font-semibold text-blue-600">ChatGPT翻訳（推奨）</span>
                      <p className="text-xs text-gray-600 ml-6">
                        高精度な翻訳。イギリス英語にも対応。Oxfordなどの教材に最適。
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="translationMethod"
                      value="mymemory"
                      checked={!useChatGPTTranslation}
                      onChange={() => setUseChatGPTTranslation(false)}
                      className="mr-2"
                      disabled={isProcessing}
                    />
                    <div>
                      <span className="font-semibold text-gray-600">MyMemory翻訳（無料）</span>
                      <p className="text-xs text-gray-600 ml-6">
                        無料の翻訳API。精度は中程度。1日10,000文字まで。
                      </p>
                    </div>
                  </label>
                </div>
              </div>

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

          {/* 全画面編集モーダル（スクリーンショット機能と同じ） */}
          {isEditingOcrText && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    抽出されたテキストを編集
                  </h3>
                  <button
                    onClick={() => {
                      setEditingOcrText(rawOcrText);
                      setIsEditingOcrText(false);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700 font-semibold">
                      改行を入れるとその位置で分割されます
                    </label>
                    <button
                      onClick={handleInsertLineBreak}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-lg flex items-center gap-1"
                      title="カーソル位置に改行を挿入（分割位置を明示）"
                    >
                      ⏎ 改行を挿入
                    </button>
                  </div>
                  <textarea
                    ref={ocrTextareaRef}
                    value={editingOcrText}
                    onChange={(e) => setEditingOcrText(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800 bg-white whitespace-pre-wrap break-words min-h-[400px]"
                    rows={20}
                    placeholder="OCRで抽出されたテキストを編集できます。改行を入れるとその位置で分割されます。改行がない場合は、ピリオドや？などの句読点で自動分割されます。"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">
                    💡 ヒント: 「改行を挿入」ボタンで分割位置を明示できます。改行がない場合は、ピリオド（.）や疑問符（?）などで自動分割されます。
                  </p>
                </div>
                <div className="flex gap-3 p-4 border-t">
                  <button
                    onClick={() => {
                      setEditingOcrText(rawOcrText);
                      setIsEditingOcrText(false);
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg text-base"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={async () => {
                      setRawOcrText(editingOcrText);
                      setIsEditingOcrText(false);
                      // Sourceを更新
                      if (sourceId) {
                        await storage.init();
                        const source = await storage.getSource(sourceId);
                        if (source) {
                          source.rawOcrText = editingOcrText;
                          await storage.saveSource(source);
                        }
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg text-base"
                  >
                    ✓ 保存
                  </button>
                </div>
              </div>
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

