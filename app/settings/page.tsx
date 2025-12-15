"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import {
  exportAllData,
  downloadExportData,
  importAllData,
  validateImportData,
} from "@/lib/export-import";
import {
  getSRSConfig,
  saveSRSConfig,
  resetSRSConfig,
  SRSConfig,
} from "@/lib/srs-config";
import MessageDialog from "@/components/MessageDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function SettingsPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [srsConfig, setSrsConfig] = useState<SRSConfig>(getSRSConfig());
  const [showSRSConfig, setShowSRSConfig] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      downloadExportData(data);
      setMessageDialog({
        isOpen: true,
        title: "エクスポート完了",
        message: "データをエクスポートしました！",
      });
    } catch (error) {
      console.error("Export failed:", error);
      setMessageDialog({
        isOpen: true,
        title: "エクスポートエラー",
        message: "エクスポートに失敗しました。",
      });
    } finally {
      setIsExporting(false);
    }
  }

  function handleImportFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        // データの検証
        const validation = validateImportData(data);
        if (!validation.valid) {
          setMessageDialog({
            isOpen: true,
            title: "データ検証エラー",
            message: `データの検証に失敗しました:\n${validation.errors.join("\n")}`,
          });
          return;
        }

        // 確認
        const confirmMessage = `以下のデータをインポートします:\n- コース: ${data.courses?.length || 0}\n- レッスン: ${data.lessons?.length || 0}\n- カード: ${data.cards?.length || 0}\n- 復習: ${data.reviews?.length || 0}\n- 学習履歴: ${data.studySessions?.length || 0}\n\n既存のデータとマージされます。`;
        if (!confirm(confirmMessage)) {
          return;
        }

        setIsImporting(true);
        setImportMessage("");

        const result = await importAllData(data, { merge: true });
        setImportMessage(result.message);

        if (result.success) {
          setMessageDialog({
            isOpen: true,
            title: "インポート完了",
            message: result.message,
          });
          // ホームに戻る
          setTimeout(() => {
            router.push("/");
          }, 1500);
        } else {
          setMessageDialog({
            isOpen: true,
            title: "インポートエラー",
            message: result.message,
          });
        }
      } catch (error) {
        console.error("Import failed:", error);
        setMessageDialog({
          isOpen: true,
          title: "インポートエラー",
          message: "インポートに失敗しました。JSONファイルが正しい形式か確認してください。",
        });
      } finally {
        setIsImporting(false);
        // ファイル入力のリセット
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.readAsText(file);
  }

  function handleSRSConfigChange(field: keyof SRSConfig, value: number) {
    setSrsConfig((prev) => ({ ...prev, [field]: value }));
  }

  function handleSRSSave() {
    try {
      saveSRSConfig(srsConfig);
      setMessageDialog({
        isOpen: true,
        title: "保存完了",
        message: "SRS設定を保存しました！",
      });
    } catch (error) {
      console.error("Failed to save SRS config:", error);
      setMessageDialog({
        isOpen: true,
        title: "保存エラー",
        message: "設定の保存に失敗しました。",
      });
    }
  }

  function handleSRSReset() {
    if (confirm("SRS設定をデフォルト値にリセットしますか？")) {
      resetSRSConfig();
      setSrsConfig(getSRSConfig());
      setMessageDialog({
        isOpen: true,
        title: "リセット完了",
        message: "SRS設定をリセットしました。",
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">設定</h1>
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← ホーム
          </button>
        </div>

        <div className="space-y-6">
          {/* データエクスポート */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">データのエクスポート</h2>
            <p className="text-sm text-gray-600 mb-4">
              すべてのデータをJSON形式でダウンロードします。
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
            >
              {isExporting ? "エクスポート中..." : "データをエクスポート"}
            </button>
          </div>

          {/* データインポート */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">データのインポート</h2>
            <p className="text-sm text-gray-600 mb-4">
              JSON形式のデータファイルをインポートします。
              既存のデータとマージされます。
            </p>
            <div className="space-y-3">
              <input
                type="file"
                accept=".json"
                onChange={handleImportFileSelect}
                disabled={isImporting}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 disabled:bg-gray-100"
              />
              {isImporting && (
                <div className="text-sm text-blue-600">インポート中...</div>
              )}
              {importMessage && (
                <div className="text-sm text-gray-600 whitespace-pre-line">
                  {importMessage}
                </div>
              )}
            </div>
          </div>

          {/* SRS設定 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">復習間隔設定（SRS）</h2>
              <button
                onClick={() => setShowSRSConfig(!showSRSConfig)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showSRSConfig ? "設定を隠す" : "設定を表示"}
              </button>
            </div>
            {showSRSConfig && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  復習間隔の計算方法を調整できます。変更は次回の学習から適用されます。
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OK時の間隔倍率: {srsConfig.okMultiplier}x
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={srsConfig.okMultiplier}
                      onChange={(e) =>
                        handleSRSConfigChange(
                          "okMultiplier",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1.0x</span>
                      <span>5.0x</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MAYBE時の間隔倍率: {srsConfig.maybeMultiplier}x
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={srsConfig.maybeMultiplier}
                      onChange={(e) =>
                        handleSRSConfigChange(
                          "maybeMultiplier",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.1x</span>
                      <span>1.0x</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NG時の間隔: {srsConfig.ngInterval}日
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      step="1"
                      value={srsConfig.ngInterval}
                      onChange={(e) =>
                        handleSRSConfigChange(
                          "ngInterval",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1日</span>
                      <span>7日</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最小間隔: {srsConfig.minInterval}日
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={srsConfig.minInterval}
                      onChange={(e) =>
                        handleSRSConfigChange(
                          "minInterval",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大間隔: {srsConfig.maxInterval}日
                    </label>
                    <input
                      type="range"
                      min="7"
                      max="365"
                      step="1"
                      value={srsConfig.maxInterval}
                      onChange={(e) =>
                        handleSRSConfigChange(
                          "maxInterval",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      初回学習の間隔: {srsConfig.initialInterval}日
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      step="1"
                      value={srsConfig.initialInterval}
                      onChange={(e) =>
                        handleSRSConfigChange(
                          "initialInterval",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSRSSave}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleSRSReset}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    リセット
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ 注意事項</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>エクスポートしたデータは安全に保管してください</li>
              <li>インポート時は既存データとマージされます</li>
              <li>データの上書きはできません（マージのみ）</li>
              <li>インポート前にエクスポートしてバックアップを取ることを推奨します</li>
            </ul>
          </div>
        </div>
      </main>
      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          setConfirmDialog({ isOpen: false, title: "", message: "" });
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "" })}
        variant="danger"
      />
    </div>
  );
}

