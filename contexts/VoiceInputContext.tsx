"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import VoiceInputModal from "@/components/VoiceInputModal";
import VoiceClipboard from "@/components/VoiceClipboard";
import {
  getVoiceClipboardItems,
  saveVoiceClipboardItem,
  deleteVoiceClipboardItem,
  clearVoiceClipboard,
  VoiceClipboardItem,
} from "@/lib/voice-clipboard";
import { storage } from "@/lib/storage";
import { Card } from "@/types/models";

interface VoiceInputContextType {
  openVoiceInput: (language: "jp" | "en", onInsert?: (text: string) => void, japaneseText?: string) => void;
  openVoiceClipboard: (onInsert?: (text: string) => void) => void;
  insertText: (text: string) => void;
  saveAsCard?: (text: string, language: "jp" | "en") => void;
}

const VoiceInputContext = createContext<VoiceInputContextType | undefined>(undefined);

export function VoiceInputProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showVoiceInputModal, setShowVoiceInputModal] = useState(false);
  const [voiceInputLanguage, setVoiceInputLanguage] = useState<"jp" | "en">("jp");
  const [voiceInputOnInsert, setVoiceInputOnInsert] = useState<((text: string) => void) | undefined>(undefined);
  const [voiceInputJapaneseText, setVoiceInputJapaneseText] = useState<string | undefined>(undefined);
  const [isGlobalVoiceInput, setIsGlobalVoiceInput] = useState(false);
  
  const [showVoiceClipboard, setShowVoiceClipboard] = useState(false);
  const [voiceClipboardOnInsert, setVoiceClipboardOnInsert] = useState<((text: string) => void) | undefined>(undefined);
  const [voiceClipboardItems, setVoiceClipboardItems] = useState<VoiceClipboardItem[]>([]);

  const loadVoiceClipboard = useCallback(() => {
    setVoiceClipboardItems(getVoiceClipboardItems());
  }, []);

  const openVoiceInput = useCallback((language: "jp" | "en", onInsert?: (text: string) => void, japaneseText?: string) => {
    setVoiceInputLanguage(language);
    setVoiceInputOnInsert(() => onInsert);
    setVoiceInputJapaneseText(japaneseText);
    setIsGlobalVoiceInput(!onInsert); // onInsertがない場合はグローバル音声入力
    setShowVoiceInputModal(true);
  }, []);

  const openVoiceClipboard = useCallback((onInsert?: (text: string) => void) => {
    setVoiceClipboardOnInsert(() => onInsert);
    loadVoiceClipboard();
    setShowVoiceClipboard(true);
  }, [loadVoiceClipboard]);

  const handleVoiceInputInsert = useCallback((text: string) => {
    if (voiceInputOnInsert) {
      voiceInputOnInsert(text);
    }
    setShowVoiceInputModal(false);
    setVoiceInputOnInsert(undefined);
    setIsGlobalVoiceInput(false);
  }, [voiceInputOnInsert]);

  const saveAsCard = useCallback(async (text: string, language: "jp" | "en") => {
    try {
      await storage.init();
      const lessons = await storage.getAllLessons();
      if (lessons.length === 0) {
        // レッスンがない場合はレッスン作成ページに遷移
        router.push("/lessons?createFirst=true");
        setShowVoiceInputModal(false);
        setIsGlobalVoiceInput(false);
        return;
      }

      // 最初のレッスンを使用
      const lessonId = lessons[0].id;
      
      // カードを作成
      const card: Card = {
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lessonId: lessonId,
        prompt_jp: language === "jp" ? text : "(後で追加)",
        target_en: language === "en" ? text : "(後で追加)",
        source_type: language === "jp" ? "manual_pair" : "manual_en",
      };
      
      await storage.saveCard(card);
      
      // 保存完了メッセージを表示するために、カード作成ページに遷移
      router.push(`/cards/new?lessonId=${lessonId}&saved=true&text=${encodeURIComponent(text)}&language=${language}`);
      
      setShowVoiceInputModal(false);
      setIsGlobalVoiceInput(false);
    } catch (error) {
      console.error("Failed to save card:", error);
      setShowVoiceInputModal(false);
      setIsGlobalVoiceInput(false);
    }
  }, [router]);

  const handleVoiceInputSave = useCallback((text: string, language: "jp" | "en") => {
    saveVoiceClipboardItem(text, language);
    loadVoiceClipboard();
  }, [loadVoiceClipboard]);

  const handleVoiceClipboardInsert = useCallback((text: string) => {
    if (voiceClipboardOnInsert) {
      voiceClipboardOnInsert(text);
    }
    setShowVoiceClipboard(false);
    setVoiceClipboardOnInsert(undefined);
  }, [voiceClipboardOnInsert]);

  const handleVoiceClipboardDelete = useCallback((id: string) => {
    deleteVoiceClipboardItem(id);
    loadVoiceClipboard();
  }, [loadVoiceClipboard]);

  const handleVoiceClipboardClear = useCallback(() => {
    clearVoiceClipboard();
    loadVoiceClipboard();
  }, [loadVoiceClipboard]);

  // グローバルなテキスト挿入機能（クリップボード経由）
  const insertText = useCallback((text: string) => {
    // アクティブなテキスト入力フィールドに挿入
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
      const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const value = input.value;
      const newValue = value.substring(0, start) + text + value.substring(end);
      input.value = newValue;
      
      // カーソル位置を更新
      const newCursorPos = start + text.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      
      // ReactのonChangeイベントを発火
      const event = new Event("input", { bubbles: true });
      input.dispatchEvent(event);
    }
  }, []);

  return (
    <VoiceInputContext.Provider
      value={{
        openVoiceInput,
        openVoiceClipboard,
        insertText,
        saveAsCard: isGlobalVoiceInput ? saveAsCard : undefined,
      }}
    >
      {children}
      <VoiceInputModal
        isOpen={showVoiceInputModal}
        language={voiceInputLanguage}
        onClose={() => {
          setShowVoiceInputModal(false);
          setVoiceInputOnInsert(undefined);
          setVoiceInputJapaneseText(undefined);
          setIsGlobalVoiceInput(false);
        }}
        onInsert={handleVoiceInputInsert}
        onSaveToClipboard={handleVoiceInputSave}
        onSaveAsCard={isGlobalVoiceInput ? saveAsCard : undefined}
        japaneseText={voiceInputJapaneseText}
      />
      <VoiceClipboard
        isOpen={showVoiceClipboard}
        onClose={() => {
          setShowVoiceClipboard(false);
          setVoiceClipboardOnInsert(undefined);
        }}
        onInsert={handleVoiceClipboardInsert}
        items={voiceClipboardItems}
        onDelete={handleVoiceClipboardDelete}
        onClear={handleVoiceClipboardClear}
      />
    </VoiceInputContext.Provider>
  );
}

export function useVoiceInput() {
  const context = useContext(VoiceInputContext);
  if (context === undefined) {
    throw new Error("useVoiceInput must be used within a VoiceInputProvider");
  }
  return context;
}

