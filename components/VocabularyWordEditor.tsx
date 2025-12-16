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
  initialIsLearned,
  initialIsWantToLearn,
  initialNotes = "",
  onSave,
  onCancel,
  autoFocus = false,
}: VocabularyWordEditorProps) {
  const [meaning, setMeaning] = useState(initialMeaning);
  const [notes, setNotes] = useState(initialNotes);
  const [isLearned, setIsLearned] = useState(initialIsLearned);
  const [isWantToLearn, setIsWantToLearn] = useState(initialIsWantToLearn);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
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
    setMeaning(initialMeaning);
    setNotes(initialNotes);
    setIsLearned(initialIsLearned);
    setIsWantToLearn(initialIsWantToLearn);
  }, [initialMeaning, initialNotes, initialIsLearned, initialIsWantToLearn]);

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

  const handleSave = async () => {
    if (!meaning.trim()) {
      setErrors({ meaning: "意味を入力してください" });
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      // 意味を保存
      await saveWordMeaning(word, meaning.trim(), notes.trim() || undefined);
      
      // フラグを更新
      await updateWordLearnedStatus(word, isLearned);
      await updateWordWantToLearnStatus(word, isWantToLearn);

      // 更新されたデータを取得
      const updated = await storage.getVocabularyWord(word);
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
              text={word}
              language="en"
              size="sm"
              className="ml-2"
            />
          </label>
          <div className="text-xl font-bold text-blue-900 p-3 bg-gray-50 rounded-lg">
            {word}
          </div>
        </div>

        {/* 意味 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            意味
            {errors.meaning && (
              <span className="text-red-600 text-sm ml-2">{errors.meaning}</span>
            )}
          </label>
          <textarea
            ref={textareaMeaningRef}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="意味を入力..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 resize-none overflow-hidden"
            rows={2}
          />
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
