"use client";

import { useState, useRef, useEffect } from "react";
import { VocabularyWord } from "@/types/models";
import { storage } from "@/lib/storage";
import { saveWordMeaning, updateWordLearnedStatus, updateWordWantToLearnStatus } from "@/lib/vocabulary";
import MessageDialog from "./MessageDialog";
import AudioPlaybackButton from "./AudioPlaybackButton";

interface VocabularyWordEditorProps {
  word: string;
  initialMeaning: string;
  initialHighlightedMeaning?: string;
  initialExampleSentence?: string;
  initialIsLearned: boolean;
  initialIsWantToLearn: boolean;
  initialNotes?: string;
  onSave: (updated: VocabularyWord) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export default function VocabularyWordEditor({
  word,
  initialMeaning,
  initialHighlightedMeaning,
  initialExampleSentence,
  initialIsLearned,
  initialIsWantToLearn,
  initialNotes = "",
  onSave,
  onCancel,
  autoFocus = false,
}: VocabularyWordEditorProps) {
  const [wordValue, setWordValue] = useState(word);
  const [meaning, setMeaning] = useState(initialMeaning);
  const [highlightedMeaning, setHighlightedMeaning] = useState(initialHighlightedMeaning || "");
  const [exampleSentence, setExampleSentence] = useState(initialExampleSentence || "");
  const [notes, setNotes] = useState(initialNotes);
  const [isLearned, setIsLearned] = useState(initialIsLearned);
  const [isWantToLearn, setIsWantToLearn] = useState(initialIsWantToLearn);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [errors, setErrors] = useState<{
    word?: string;
    meaning?: string;
  }>({});
  const [messageDialog, setMessageDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const textareaMeaningRef = useRef<HTMLTextAreaElement>(null);
  const textareaNotesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setWordValue(word);
    setMeaning(initialMeaning);
    setHighlightedMeaning(initialHighlightedMeaning || "");
    setExampleSentence(initialExampleSentence || "");
    setNotes(initialNotes);
    setIsLearned(initialIsLearned);
    setIsWantToLearn(initialIsWantToLearn);
  }, [word, initialMeaning, initialHighlightedMeaning, initialExampleSentence, initialNotes, initialIsLearned, initialIsWantToLearn]);
  
  // デバッグ用：保存されたデータを確認
  useEffect(() => {
    console.log("VocabularyWordEditor props updated:", {
      word,
      initialMeaning,
      initialHighlightedMeaning,
      initialExampleSentence,
      initialIsLearned,
      initialIsWantToLearn,
      initialNotes,
    });
  }, [word, initialMeaning, initialHighlightedMeaning, initialExampleSentence, initialIsLearned, initialIsWantToLearn, initialNotes]);

  useEffect(() => {
    // テキストエリアの高さを自動調整
    if (textareaMeaningRef.current) {
      textareaMeaningRef.current.style.height = "auto";
      textareaMeaningRef.current.style.height = `${textareaMeaningRef.current.scrollHeight}px`;
    }
    if (textareaNotesRef.current) {
      textareaNotesRef.current.style.height = "auto";
      textareaNotesRef.current.style.height = `${textareaNotesRef.current.scrollHeight}px`;
    }
  }, [meaning, notes]);

  useEffect(() => {
    if (autoFocus && textareaMeaningRef.current) {
      textareaMeaningRef.current.focus();
    }
  }, [autoFocus]);

  const handleTextSelection = () => {
    const textarea = textareaMeaningRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selected = meaning.substring(start, end);
      setSelectedText(selected);
    } else {
      setSelectedText("");
    }
  };

  // モバイル対応: touchイベントでも選択を検出
  const handleTouchEnd = () => {
    // 少し遅延させて選択範囲を取得（モバイルブラウザの処理を待つ）
    setTimeout(() => {
      handleTextSelection();
    }, 100);
  };

  const handleSaveHighlight = () => {
    if (selectedText.trim()) {
      setHighlightedMeaning(selectedText.trim());
      setSelectedText("");
      // 選択を解除
      if (textareaMeaningRef.current) {
        textareaMeaningRef.current.setSelectionRange(0, 0);
      }
    }
  };

  const handleClearHighlight = () => {
    setHighlightedMeaning("");
  };

  const handleSave = async () => {
    const trimmedWord = wordValue.trim().toLowerCase();
    const trimmedMeaning = meaning.trim();

    if (!trimmedWord) {
      setErrors({ word: "単語を入力してください" });
      return;
    }

    if (!trimmedMeaning) {
      setErrors({ meaning: "意味を入力してください" });
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const wordChanged = trimmedWord !== word.toLowerCase();
      
      // 単語が変更された場合、古い単語のデータを削除
      if (wordChanged) {
        await storage.deleteVocabularyWord(word);
      }

      // 意味を保存（ハイライト、例文、フラグも含む）
      // 空文字列の場合はundefinedに変換
      const trimmedHighlighted = highlightedMeaning.trim();
      const trimmedExample = exampleSentence.trim();
      const trimmedNotes = notes.trim();
      
      await saveWordMeaning(
        trimmedWord, 
        trimmedMeaning, 
        trimmedNotes || undefined,
        trimmedHighlighted || undefined,
        trimmedExample || undefined,
        isLearned,
        isWantToLearn
      );

      // 更新されたデータを取得
      const updated = await storage.getVocabularyWord(trimmedWord);
      if (updated) {
        await onSave(updated);
      }

      setMessageDialog({
        isOpen: true,
        title: "更新完了",
        message: "単語情報を更新しました！",
      });
    } catch (error) {
      console.error("Failed to save vocabulary word:", error);
      setMessageDialog({
        isOpen: true,
        title: "更新エラー",
        message: "単語情報の更新に失敗しました。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
        {/* 単語 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            単語
            <AudioPlaybackButton
              text={wordValue}
              language="en"
              size="sm"
              className="ml-2"
            />
            {errors.word && (
              <span className="text-red-600 text-sm ml-2">{errors.word}</span>
            )}
          </label>
          <input
            type="text"
            value={wordValue}
            onChange={(e) => setWordValue(e.target.value)}
            placeholder="単語を入力..."
            className="w-full text-xl font-bold text-blue-900 p-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* 英文全体 */}
        {exampleSentence && (
          <div>
            <label className="block text-sm font-semibold mb-2">英文</label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-gray-900">
              {exampleSentence}
            </div>
          </div>
        )}

        {/* 意味 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            意味（該当部分を選択してハイライトできます）
            {errors.meaning && (
              <span className="text-red-600 text-sm ml-2">{errors.meaning}</span>
            )}
          </label>
          <textarea
            ref={textareaMeaningRef}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            onSelect={handleTextSelection}
            onTouchEnd={handleTouchEnd}
            onMouseUp={handleTextSelection}
            placeholder="意味を入力..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 resize-none overflow-hidden"
            rows={4}
          />
          
          {/* 選択テキストとハイライト保存ボタン */}
          {selectedText && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-gray-700 mb-2">
                選択中: <span className="font-semibold">{selectedText}</span>
              </div>
              <button
                onClick={handleSaveHighlight}
                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded"
              >
                この部分をハイライトとして保存
              </button>
            </div>
          )}

          {/* 現在のハイライト表示 */}
          {highlightedMeaning && (
            <div className="mt-2 p-3 bg-indigo-50 border-2 border-indigo-300 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-indigo-900">ハイライトされた意味:</span>
                <button
                  onClick={handleClearHighlight}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                >
                  クリア
                </button>
              </div>
              <div className="text-base font-semibold text-indigo-900 bg-yellow-200 px-2 py-1 rounded">
                {highlightedMeaning}
              </div>
            </div>
          )}
        </div>

        {/* メモ */}
        <div>
          <label className="block text-sm font-semibold mb-2">メモ</label>
          <textarea
            ref={textareaNotesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="メモを入力..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 resize-none overflow-hidden"
            rows={2}
          />
        </div>

        {/* フラグ */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isLearned}
              onChange={(e) => setIsLearned(e.target.checked)}
              className="w-5 h-5 text-green-600 rounded"
            />
            <span className="text-sm font-semibold">✓ 覚えた</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isWantToLearn}
              onChange={(e) => setIsWantToLearn(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="text-sm font-semibold">⭐ 覚えたい</span>
          </label>
        </div>

        {/* ボタン */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>

      <MessageDialog
        isOpen={messageDialog.isOpen}
        title={messageDialog.title}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, title: "", message: "" })}
      />
    </>
  );
}
