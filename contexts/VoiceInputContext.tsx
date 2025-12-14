"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import VoiceInputModal from "@/components/VoiceInputModal";
import VoiceClipboard from "@/components/VoiceClipboard";
import {
  getVoiceClipboardItems,
  saveVoiceClipboardItem,
  deleteVoiceClipboardItem,
  clearVoiceClipboard,
  VoiceClipboardItem,
} from "@/lib/voice-clipboard";

interface VoiceInputContextType {
  openVoiceInput: (language: "jp" | "en", onInsert?: (text: string) => void) => void;
  openVoiceClipboard: (onInsert?: (text: string) => void) => void;
  insertText: (text: string) => void;
}

const VoiceInputContext = createContext<VoiceInputContextType | undefined>(undefined);

export function VoiceInputProvider({ children }: { children: React.ReactNode }) {
  const [showVoiceInputModal, setShowVoiceInputModal] = useState(false);
  const [voiceInputLanguage, setVoiceInputLanguage] = useState<"jp" | "en">("jp");
  const [voiceInputOnInsert, setVoiceInputOnInsert] = useState<((text: string) => void) | undefined>(undefined);
  
  const [showVoiceClipboard, setShowVoiceClipboard] = useState(false);
  const [voiceClipboardOnInsert, setVoiceClipboardOnInsert] = useState<((text: string) => void) | undefined>(undefined);
  const [voiceClipboardItems, setVoiceClipboardItems] = useState<VoiceClipboardItem[]>([]);

  const loadVoiceClipboard = useCallback(() => {
    setVoiceClipboardItems(getVoiceClipboardItems());
  }, []);

  const openVoiceInput = useCallback((language: "jp" | "en", onInsert?: (text: string) => void) => {
    setVoiceInputLanguage(language);
    setVoiceInputOnInsert(() => onInsert);
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
  }, [voiceInputOnInsert]);

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
      }}
    >
      {children}
      <VoiceInputModal
        isOpen={showVoiceInputModal}
        language={voiceInputLanguage}
        onClose={() => {
          setShowVoiceInputModal(false);
          setVoiceInputOnInsert(undefined);
        }}
        onInsert={handleVoiceInputInsert}
        onSaveToClipboard={handleVoiceInputSave}
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

