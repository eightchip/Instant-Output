// OCR機能のインターフェース（後で差し替え可能な設計）

// Tesseract.jsはクライアントサイドでのみ動作するため、動的インポートを使用

// logger関数はWorkerに渡せないため、使用しない
// 進捗は時間ベースでシミュレートする

export interface OCRResult {
  text: string;
  confidence?: number;
}

export interface OCRProgress {
  status: string;
  progress: number; // 0-1
}

export interface OCRService {
  /**
   * 画像からテキストを抽出する
   * @param imageFile 画像ファイル
   * @param onProgress 進捗コールバック（オプション）
   * @returns 抽出されたテキスト
   */
  extractText(
    imageFile: File,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult>;
}

/**
 * Tesseract.jsを使用したOCR実装
 */
class TesseractOCRService implements OCRService {
  private worker: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private initProgressCallback: ((progress: OCRProgress) => void) | null = null;

  private async initializeWorker(
    onProgress?: (progress: OCRProgress) => void
  ) {
    if (this.isInitialized && this.worker) {
      return;
    }

    // 既に初期化中の場合は待機
    if (this.initPromise) {
      // 進捗コールバックを追加
      if (onProgress) {
        this.initProgressCallback = onProgress;
      }
      return this.initPromise;
    }

    // 進捗コールバックを保存
    if (onProgress) {
      this.initProgressCallback = onProgress;
    }

    this.initPromise = (async () => {
      try {
        // 進捗: ライブラリの読み込み開始
        if (this.initProgressCallback) {
          this.initProgressCallback({
            status: "Tesseract.jsを読み込み中...",
            progress: 0.05,
          });
        }

        // 動的インポートでTesseract.jsを読み込む
        const { createWorker } = await import("tesseract.js");

        // 進捗: ライブラリ読み込み完了
        if (this.initProgressCallback) {
          this.initProgressCallback({
            status: "Workerを作成中...",
            progress: 0.1,
          });
        }

        // 英語と日本語の両方に対応
        this.worker = await createWorker("eng+jpn", 1, {
          logger: (m: any) => {
            // 初期化中の進捗を報告
            if (this.initProgressCallback && m.status) {
              let progressValue = 0.1;
              let statusText = m.status;

              // ステータスに応じて進捗を設定
              if (m.status === "loading tesseract core") {
                progressValue = 0.15;
                statusText = "Tesseractコアを読み込み中...";
              } else if (m.status === "loading language traineddata") {
                progressValue = 0.2;
                statusText = "言語データをダウンロード中...";
              } else if (m.status.includes("eng.traineddata")) {
                progressValue = 0.4;
                statusText = "英語データをダウンロード中...";
              } else if (m.status.includes("jpn.traineddata")) {
                progressValue = 0.6;
                statusText = "日本語データをダウンロード中...";
              } else if (m.status === "initializing tesseract") {
                progressValue = 0.8;
                statusText = "Tesseractを初期化中...";
              } else if (m.status === "initializing api") {
                progressValue = 0.9;
                statusText = "APIを初期化中...";
              } else if (m.status === "ready") {
                progressValue = 1.0;
                statusText = "準備完了";
              }

              // 進捗パーセンテージがある場合は使用
              if (m.progress !== undefined) {
                progressValue = 0.1 + m.progress * 0.8; // 0.1から0.9の範囲にマッピング
              }

              this.initProgressCallback({
                status: statusText,
                progress: progressValue,
              });
            }
          },
        });

        this.isInitialized = true;
        this.initProgressCallback = null;
      } catch (error) {
        console.error("Failed to initialize Tesseract worker:", error);
        this.initPromise = null;
        this.initProgressCallback = null;
        throw new Error(
          `OCRの初期化に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`
        );
      }
    })();

    return this.initPromise;
  }

  async extractText(
    imageFile: File,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    try {
      // 初期化（進捗コールバック付き）
      await this.initializeWorker(onProgress);

      // 認識処理開始
      if (onProgress) {
        onProgress({
          status: "画像を解析中...",
          progress: 0.9,
        });
      }

      // 進捗をシミュレート（実際の進捗は取得できないため）
      let progressInterval: NodeJS.Timeout | null = null;
      if (onProgress) {
        let currentProgress = 0.9;
        progressInterval = setInterval(() => {
          if (currentProgress < 0.99) {
            currentProgress += 0.01;
            onProgress({
              status: "テキストを認識中...",
              progress: currentProgress,
            });
          }
        }, 500); // 0.5秒ごとに進捗を更新
      }

      // loggerはWorkerに渡せないため、使用しない
      // 進捗は時間ベースでシミュレートする
      const result = await this.worker.recognize(imageFile);

      // 進捗シミュレーションを停止
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // 認識処理完了後の進捗更新
      if (onProgress) {
        onProgress({
          status: "完了",
          progress: 1.0,
        });
      }

      // 完了
      if (onProgress) {
        onProgress({
          status: "完了",
          progress: 1.0,
        });
      }

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
      };
    } catch (error) {
      console.error("OCR extraction failed:", error);
      throw new Error(
        `テキスト抽出に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`
      );
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

/**
 * ダミーOCR実装（フォールバック用）
 */
class DummyOCRService implements OCRService {
  async extractText(
    imageFile: File,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.1;
        if (onProgress) {
          onProgress({
            status: "処理中...",
            progress: Math.min(progress, 0.9),
          });
        }
        if (progress >= 1) {
          clearInterval(interval);
          resolve({
            text: "[OCR機能は利用できません。手動でテキストを入力してください。]",
            confidence: 0,
          });
        }
      }, 200);
    });
  }
}

// Tesseract.jsを使用したOCRサービスをエクスポート
// エラー時はダミーサービスにフォールバック
let ocrServiceInstance: OCRService | null = null;

export async function getOCRService(): Promise<OCRService> {
  if (ocrServiceInstance) {
    return ocrServiceInstance;
  }

  try {
    ocrServiceInstance = new TesseractOCRService();
    return ocrServiceInstance;
  } catch (error) {
    console.warn("Failed to initialize Tesseract, using dummy service:", error);
    ocrServiceInstance = new DummyOCRService();
    return ocrServiceInstance;
  }
}

// デフォルトエクスポート（後方互換性のため）
export const ocrService: OCRService = {
  async extractText(
    imageFile: File,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    const service = await getOCRService();
    return service.extractText(imageFile, onProgress);
  },
};
