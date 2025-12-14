// OCRテキストの後処理（記号除去、文章分割など）

/**
 * OCR結果から無駄な記号やノイズを除去
 */
export function cleanOcrText(text: string): string {
  return text
    // 改行を空白に変換（複数の改行は1つの空白に）
    .replace(/\n+/g, " ")
    // タブを空白に変換
    .replace(/\t+/g, " ")
    // 複数の空白を1つに
    .replace(/\s+/g, " ")
    // 不要な記号を除去（ただし、文の終わりの句読点は保持）
    .replace(/[^\w\s.,!?;:'"()[\]{}]/g, "")
    // 文頭・文末の空白を除去
    .trim();
}

/**
 * テキストを文章ごとに分割
 */
export function splitIntoSentences(text: string): string[] {
  // まずクリーニング
  const cleaned = cleanOcrText(text);
  
  // 文章の区切り文字で分割（. ! ? の後）
  // 省略記号（Mr. Dr. etc. など）を考慮
  const commonAbbreviations = ['mr', 'mrs', 'ms', 'dr', 'prof', 'etc', 'vs', 'e.g', 'i.e', 'a.m', 'p.m', 'u.s', 'u.k'];
  
  const sentences: string[] = [];
  let currentSentence = "";
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    currentSentence += char;
    
    // 文の終わりを検出（. ! ? の後、空白または終端）
    if ((char === "." || char === "!" || char === "?") && 
        (i === cleaned.length - 1 || cleaned[i + 1] === " " || cleaned[i + 1] === "\n")) {
      
      // 省略記号かチェック（直前の単語を確認）
      const beforeDot = currentSentence.slice(0, -1).trim().toLowerCase();
      const lastWord = beforeDot.split(/\s+/).pop() || "";
      const isAbbreviation = commonAbbreviations.some(abbr => lastWord.endsWith(abbr));
      
      // 省略記号でない場合のみ文章を分割
      if (!isAbbreviation) {
        const trimmed = currentSentence.trim();
        if (trimmed.length > 0) {
          sentences.push(trimmed);
        }
        currentSentence = "";
        // 次の空白をスキップ
        if (i < cleaned.length - 1 && cleaned[i + 1] === " ") {
          i++;
        }
      }
    }
  }
  
  // 残りのテキストを追加
  if (currentSentence.trim().length > 0) {
    sentences.push(currentSentence.trim());
  }
  
  // 空の文章を除去
  return sentences.filter(s => s.length > 0);
}

/**
 * 文章が有効かチェック（短すぎる、長すぎる、記号のみなどを除外）
 */
export function isValidSentence(sentence: string): boolean {
  const trimmed = sentence.trim();
  
  // 空文字列は無効
  if (trimmed.length === 0) return false;
  
  // 短すぎる（3文字未満）は無効
  if (trimmed.length < 3) return false;
  
  // 長すぎる（500文字超）は無効（おそらく分割ミス）
  if (trimmed.length > 500) return false;
  
  // アルファベットが含まれていない場合は無効
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  // 記号のみの場合は無効
  if (!/[a-zA-Z0-9]/.test(trimmed)) return false;
  
  return true;
}

/**
 * OCRテキストを処理して有効な文章のリストを返す
 */
export function processOcrText(text: string): string[] {
  const cleaned = cleanOcrText(text);
  const sentences = splitIntoSentences(cleaned);
  return sentences.filter(isValidSentence);
}

