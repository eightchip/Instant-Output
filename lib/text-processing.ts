// テキスト処理（自動分割・自動翻訳）

import { DraftCard } from "@/types/ai-card";

/**
 * 英文を文単位で分割する
 * @param text OCRで取得した英文テキスト
 * @returns 分割された文の配列
 */
export function splitIntoSentences(text: string): string[] {
  // 基本的な文分割ルール
  // 1. 改行がある場合は改行で分割（ChatGPT APIの出力形式に合わせる）
  // 2. 改行がない場合は、ピリオド、感嘆符、疑問符で分割
  // 3. ただし、Mr. Mrs. Dr. などの略語は除外
  // 4. 引用符内の文は考慮

  if (!text || text.trim().length === 0) return [];

  // 改行がある場合は改行で分割（ChatGPT APIの出力は改行区切りの可能性が高い）
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // 改行がない場合は、ピリオド、感嘆符、疑問符で分割
  // テキストを正規化（連続する空白を1つに）
  const normalized = text.replace(/\s+/g, " ").trim();
  
  if (!normalized) return [];

  // 略語のリスト
  const abbreviations = [
    "Mr.", "Mrs.", "Dr.", "Ms.", "Prof.", "etc.", "vs.", "e.g.", "i.e.",
    "U.S.", "U.K.", "Ph.D.", "Jr.", "Sr.", "Inc.", "Ltd.", "Co.",
    "A.M.", "P.M.", "a.m.", "p.m.", "No.", "no.", "Vol.", "vol."
  ];

  const sentences: string[] = [];
  let currentSentence = "";
  let inQuotes = false;
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = i < normalized.length - 1 ? normalized[i + 1] : "";
    const nextNextChar = i < normalized.length - 2 ? normalized[i + 2] : "";
    
    currentSentence += char;
    
    // 引用符の処理
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      continue;
    }
    
    // 文の終わりを検出（引用符内でない場合）
    if (!inQuotes && (char === "." || char === "!" || char === "?")) {
      // より確実な文の終わり判定
      // 1. 終端の場合
      // 2. 次の文字が空白で、その次が大文字の場合
      // 3. 次の文字が空白で、その次が数字の場合（番号付きリスト）
      // 4. 次の文字が空白で、その次が空白の場合（複数の空白）
      const isEndOfSentence = 
        nextChar === "" || // 終端
        (nextChar === " " && (
          nextNextChar === "" || // 空白の後に終端
          (nextNextChar && nextNextChar === nextNextChar.toUpperCase() && nextNextChar !== nextNextChar.toLowerCase()) || // 大文字
          /[0-9]/.test(nextNextChar) // 数字
        ));
      
      if (isEndOfSentence) {
        const words = currentSentence.trim().split(/\s+/);
        const lastWord = words.length > 0 ? words[words.length - 1].replace(/[.,!?]+$/, "") : "";
        
        // 略語チェック（より厳密に）
        const isAbbreviation = abbreviations.some(abbr => 
          lastWord === abbr || lastWord.toLowerCase() === abbr.toLowerCase()
        );
        
        // 短い単語（2文字以下）でピリオドで終わる場合は略語の可能性が高い
        const isLikelyAbbreviation = lastWord.length <= 2 && char === ".";
        
        if (!isAbbreviation && !isLikelyAbbreviation) {
          const sentence = currentSentence.trim();
          if (sentence.length > 0) {
            sentences.push(sentence);
          }
          currentSentence = "";
          // 次の空白をスキップ
          if (nextChar === " ") {
            i++;
          }
        }
      }
    }
  }
  
  // 残りのテキストを追加
  if (currentSentence.trim().length > 0) {
    sentences.push(currentSentence.trim());
  }
  
  // 空の文をフィルタ
  return sentences.filter((s) => s.length > 0);
}

/**
 * OCRテキストを処理して文に分割
 * @param text OCRテキスト
 * @returns 分割された文の配列
 */
export function processOcrText(text: string): string[] {
  const cleaned = cleanOcrText(text);
  return splitIntoSentences(cleaned);
}

/**
 * 基本的なOCRノイズ除去
 * @param text OCRテキスト
 * @returns ノイズ除去済みテキスト
 */
export function cleanOcrText(text: string): string {
  let cleaned = text;

  // 連続する空白を1つに
  cleaned = cleaned.replace(/\s+/g, " ");

  // 改行を空白に（段落区切りは保持）
  cleaned = cleaned.replace(/\n+/g, " ");

  // よくあるOCRエラーを修正
  // 0 -> O, 1 -> I, | -> I など（文脈に依存するため、基本的なもののみ）
  cleaned = cleaned.replace(/\s+\|\s+/g, " I "); // | を I に（文脈依存）

  // 先頭・末尾の空白を削除
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * MyMemory Translation APIを使用して英文を日本語に翻訳
 * @param text 翻訳する英文
 * @param useChatGPT ChatGPT APIを使用するかどうか（デフォルト: false）
 * @param adminPassword 管理者パスワード（ChatGPT使用時のみ必要）
 * @returns 翻訳された日本語
 */
export async function translateToJapanese(
  text: string,
  useChatGPT: boolean = false,
  adminPassword?: string
): Promise<string> {
  try {
    // ChatGPT APIを使用する場合
    if (useChatGPT) {
      // パスワードが提供されていない場合はエラー
      if (!adminPassword || adminPassword.trim().length === 0) {
        console.error("ChatGPT翻訳には管理者パスワードが必要です");
        return `[翻訳エラー: 管理者パスワードが提供されていません]`;
      }

      const response = await fetch("/api/translate-chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          adminPassword: adminPassword.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`ChatGPT Translation API returned status ${response.status}`, errorData);
        // 認証エラーの場合は明確なメッセージを返す
        if (response.status === 401) {
          return `[翻訳エラー: 管理者パスワードが正しくありません。再度ログインしてください。]`;
        }
        return `[翻訳エラー: ${errorData.message || "API接続失敗"}]`;
      }

      const data = await response.json();
      if (data.translatedText) {
        return data.translatedText;
      } else {
        return `[翻訳エラー: 翻訳結果が取得できませんでした]`;
      }
    }

    // MyMemory Translation API（無料、制限あり）
    // 注意: 実際の運用では、レート制限やエラーハンドリングを考慮する必要があります
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(`Translation API returned status ${response.status}`);
      return `[翻訳エラー: API接続失敗]`;
    }

    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      // 翻訳結果が元のテキストと同じ場合は翻訳失敗とみなす
      if (translated === text) {
        return `[翻訳エラー: 翻訳結果が取得できませんでした]`;
      }
      return translated;
    } else {
      console.warn("Translation API response:", data);
      return `[翻訳エラー: 翻訳に失敗しました]`;
    }
  } catch (error) {
    console.error("Translation error:", error);
    // エラー時は元のテキストを返す（ユーザーが手動で編集できるように）
    return `[翻訳エラー: ${error instanceof Error ? error.message : "不明なエラー"}]`;
  }
}

/**
 * 複数の文を並列で翻訳（レート制限を考慮して順次実行）
 * @param sentences 翻訳する文の配列
 * @param onProgress 進捗コールバック
 * @param useChatGPT ChatGPT APIを使用するかどうか（デフォルト: false）
 * @param adminPassword 管理者パスワード（ChatGPT使用時のみ必要）
 * @returns 翻訳結果の配列
 */
export async function translateSentences(
  sentences: string[],
  onProgress?: (current: number, total: number) => void,
  useChatGPT: boolean = false,
  adminPassword?: string
): Promise<string[]> {
  const translations: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const translation = await translateToJapanese(sentences[i], useChatGPT, adminPassword);
    translations.push(translation);
    
    if (onProgress) {
      onProgress(i + 1, sentences.length);
    }

    // APIレート制限を考慮して少し待機
    // ChatGPTの場合は少し長めに待機（APIコストを考慮）
    const delay = useChatGPT ? 2000 : 1000;
    if (i < sentences.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return translations;
}

/**
 * OCRテキストからカード候補を生成（自動分割・自動翻訳）
 * @param rawOcrText OCRで取得した生テキスト
 * @param onProgress 進捗コールバック
 * @param useChatGPT ChatGPT APIを使用するかどうか（デフォルト: false）
 * @param adminPassword 管理者パスワード（ChatGPT使用時のみ必要）
 * @returns カード候補の配列
 */
export async function generateCardCandidates(
  rawOcrText: string,
  onProgress?: (step: string, progress: number) => void,
  useChatGPT: boolean = false,
  adminPassword?: string
): Promise<{
  cards: DraftCard[];
  warnings: string[];
  detected: {
    sentenceCount: number;
    language: string;
  };
}> {
  const warnings: string[] = [];
  
  // ステップ1: OCRテキストのクリーニング
  if (onProgress) onProgress("テキストをクリーニング中...", 0.1);
  const cleanedText = cleanOcrText(rawOcrText);

  // ステップ2: 文分割
  if (onProgress) onProgress("文を分割中...", 0.3);
  const sentences = splitIntoSentences(cleanedText);

  if (sentences.length === 0) {
    warnings.push("文が検出されませんでした。");
    return {
      cards: [],
      warnings,
      detected: {
        sentenceCount: 0,
        language: "en",
      },
    };
  }

  // ステップ3: 翻訳
  if (onProgress) onProgress(useChatGPT ? "ChatGPTで翻訳中..." : "翻訳中...", 0.5);
  const translations = await translateSentences(
    sentences,
    (current, total) => {
      if (onProgress) {
        onProgress(
          useChatGPT 
            ? `ChatGPTで翻訳中... (${current}/${total})` 
            : `翻訳中... (${current}/${total})`,
          0.5 + (current / total) * 0.4
        );
      }
    },
    useChatGPT,
    adminPassword
  );

  // ステップ4: カード候補を生成
  if (onProgress) onProgress("カード候補を生成中...", 0.9);
  const cards: DraftCard[] = sentences.map((sentence, index) => {
    const translation = translations[index] || `[翻訳失敗: ${sentence}]`;
    const needsReview = translation.startsWith("[翻訳エラー") || translation.startsWith("[翻訳失敗");

    return {
      en: sentence,
      jp: translation,
      confidence: needsReview ? 0.3 : 0.8, // 翻訳エラーの場合は低い信頼度
      needsReview,
      flags: needsReview ? ["translation_error"] : [],
      sourceSentence: sentence,
      notes: needsReview ? "翻訳に失敗しました。手動で修正してください。" : "",
    };
  });

  // 警告を追加
  if (sentences.length > 50) {
    warnings.push("大量の文が検出されました。処理に時間がかかる場合があります。");
  }

  const translationErrors = cards.filter((c) => c.needsReview).length;
  if (translationErrors > 0) {
    warnings.push(`${translationErrors}件の翻訳エラーが発生しました。手動で修正してください。`);
  }

  if (onProgress) onProgress("完了", 1.0);

  return {
    cards,
    warnings,
    detected: {
      sentenceCount: sentences.length,
      language: "en",
    },
  };
}
