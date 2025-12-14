/**
 * 音声入力クリップボード管理
 * localStorageを使用して音声入力テキストを一時保存
 */

export interface VoiceClipboardItem {
  id: string;
  text: string;
  language: "jp" | "en";
  timestamp: number;
}

const STORAGE_KEY = "instant_output_voice_clipboard";
const MAX_ITEMS = 20; // 最大保存数

export function getVoiceClipboardItems(): VoiceClipboardItem[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const items: VoiceClipboardItem[] = JSON.parse(stored);
    // タイムスタンプでソート（新しい順）
    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to load voice clipboard:", error);
    return [];
  }
}

export function saveVoiceClipboardItem(text: string, language: "jp" | "en"): void {
  if (typeof window === "undefined") return;
  
  try {
    const items = getVoiceClipboardItems();
    const newItem: VoiceClipboardItem = {
      id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      language,
      timestamp: Date.now(),
    };
    
    // 新しいアイテムを先頭に追加
    items.unshift(newItem);
    
    // 最大数を超えた場合は古いものを削除
    if (items.length > MAX_ITEMS) {
      items.splice(MAX_ITEMS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save voice clipboard item:", error);
  }
}

export function deleteVoiceClipboardItem(id: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const items = getVoiceClipboardItems();
    const filtered = items.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete voice clipboard item:", error);
  }
}

export function clearVoiceClipboard(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear voice clipboard:", error);
  }
}

