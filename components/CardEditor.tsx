"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/types/models";
import { storage } from "@/lib/storage";
import { saveWordMeaning } from "@/lib/vocabulary";
import AudioPlaybackButton from "./AudioPlaybackButton";
import VoiceInputButton from "./VoiceInputButton";
import MessageDialog from "./MessageDialog";
import ConfirmDialog from "./ConfirmDialog";

interface CardEditorProps {
  card: Card;
  onSave: (updatedCard: Card) => Promise<void>;
  onCancel?: () => void;
  onDelete?: (cardId: string) => Promise<void>;
  showDelete?: boolean;
  autoFocus?: boolean;
}

export default function CardEditor({
  card,
  onSave,
  onCancel,
  onDelete,
  showDelete = false,
  autoFocus = false,
}: CardEditorProps) {
  const [promptJp, setPromptJp] = useState(card.prompt_jp);
  const [targetEn, setTargetEn] = useState(card.target_en);
  const [notes, setNotes] = useState(card.notes || "");
  const [isFavorite, setIsFavorite] = useState(card.isFavorite || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showAddVocabulary, setShowAddVocabulary] = useState(false);
  const [vocabWord, setVocabWord] = useState("");
  const [vocabMeaning, setVocabMeaning] = useState("");
  const [vocabExample, setVocabExample] = useState("");
  const [isAddingVocabulary, setIsAddingVocabulary] = useState(false);
  const [errors, setErrors] = useState<{
    targetEn?: string;
    vocabWord?: string;
    vocabMeaning?: string;
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const textareaJpRef = useRef<HTMLTextAreaElement>(null);
  const textareaEnRef = useRef<HTMLTextAreaElement>(null);
  const textareaNotesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPromptJp(card.prompt_jp);
    setTargetEn(card.target_en);
    setNotes(card.notes || "");
    setIsFavorite(card.isFavorite || false);
  }, [card]);

  useEffect(() => {
    // テキストエリアの高さを自動調整
    if (textareaJpRef.current) {
      textareaJpRef.current.style.height = "auto";
      textareaJpRef.current.style.height = `${textareaJpRef.current.scrollHeight}px`;
    }
    if (textareaEnRef.current) {
      textareaEnRef.current.style.height = "auto";
      textareaEnRef.current.style.height = `${textareaEnRef.current.scrollHeight}px`;
    }
    if (textareaNotesRef.current) {
      textareaNotesRef.current.style.height = "auto";
      textareaNotesRef.current.style.height = `${textareaNotesRef.current.scrollHeight}px`;
    }
  }, [promptJp, targetEn, notes]);

  useEffect(() => {
    if (autoFocus && textareaEnRef.current) {
      textareaEnRef.current.focus();
    }
  }, [autoFocus]);

  const handleRetranslate = async () => {
    if (!targetEn.trim()) {
      setMessageDialog({
        isOpen: true,
        title: "翻訳エラー",
        message: "英語を入力してください。",
      });
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: targetEn.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessageDialog({
          isOpen: true,
          title: "翻訳エラー",
          message: errorData.message || "翻訳に失敗しました。",
        });
        return;
      }

      const data = await response.json();
      if (data.translatedText) {
        setPromptJp(data.translatedText);
      }
    } catch (error) {
      console.error("Translation error:", error);
      setMessageDialog({
        isOpen: true,
        title: "翻訳エラー",
        message: "翻訳処理中にエラーが発生しました。",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!targetEn.trim()) {
      setErrors({ targetEn: "英語を入力してください" });
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const updatedCard: Card = {
        ...card,
        prompt_jp: promptJp.trim() || "(後で追加)",
        target_en: targetEn.trim(),
        notes: notes.trim() || undefined,
        isFavorite: isFavorite,
      };

      await onSave(updatedCard);
      setMessageDialog({
        isOpen: true,
        title: "更新完了",
        message: "カードを更新しました！",
      });
    } catch (error) {
      console.error("Failed to save card:", error);
      setMessageDialog({
        isOpen: true,
        title: "更新エラー",
        message: "カードの更新に失敗しました。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setConfirmDialog({
      isOpen: true,
      title: "カードを削除",
      message: "このカードを削除しますか？\nこの操作は取り消せません。",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        setIsDeleting(true);
        try {
          await onDelete(card.id);
          setMessageDialog({
            isOpen: true,
            title: "削除完了",
            message: "カードを削除しました。",
          });
        } catch (error) {
          console.error("Failed to delete card:", error);
          setMessageDialog({
            isOpen: true,
            title: "削除エラー",
            message: "カードの削除に失敗しました。",
          });
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleAddVocabulary = async () => {
    if (!vocabWord.trim()) {
      setErrors({ vocabWord: "単語または表現を入力してください" });
      return;
    }
    if (!vocabMeaning.trim()) {
      setErrors({ vocabMeaning: "意味を入力してください" });
      return;
    }

    setErrors({});
    setIsAddingVocabulary(true);

    try {
      await saveWordMeaning(
        vocabWord.trim().toLowerCase(),
        vocabMeaning.trim(),
        undefined, // notes
        undefined, // highlightedMeaning
        vocabExample.trim() || targetEn.trim(), // exampleSentence (入力がない場合はカードの英文を使用)
        false, // isLearned
        false // isWantToLearn
      );
      setMessageDialog({
        isOpen: true,
        title: "追加完了",
        message: "語彙リストに追加しました！",
      });
      // フォームをリセット
      setVocabWord("");
      setVocabMeaning("");
      setVocabExample("");
      setShowAddVocabulary(false);
    } catch (error) {
      console.error("Failed to add vocabulary:", error);
      setMessageDialog({
        isOpen: true,
        title: "追加エラー",
        message: "語彙リストへの追加に失敗しました。",
      });
    } finally {
      setIsAddingVocabulary(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
        {/* 画像サムネイル */}
        {card.imageData && (
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">元の画像</label>
            <img
              src={card.imageData}
              alt="元画像"
              className="max-w-xs max-h-48 rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                const modal = document.createElement("div");
                modal.className = "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
                modal.onclick = () => modal.remove();
                const img = document.createElement("img");
                img.src = card.imageData!;
                img.className = "max-w-full max-h-full object-contain";
                img.onclick = (e) => e.stopPropagation();
                modal.appendChild(img);
                document.body.appendChild(modal);
              }}
            />
          </div>
        )}

        {/* 日本語 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold">
              日本語
              <AudioPlaybackButton
                text={promptJp}
                language="jp"
                size="sm"
                className="ml-2"
              />
            </label>
            {targetEn.trim() && (
              <button
                onClick={handleRetranslate}
                disabled={isTranslating}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-1 px-3 rounded-lg transition-colors"
              >
                {isTranslating ? "翻訳中..." : "🔄 再翻訳"}
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              ref={textareaJpRef}
              value={promptJp}
              onChange={(e) => setPromptJp(e.target.value)}
              placeholder="日本語を入力..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 resize-none overflow-hidden"
              rows={2}
            />
            <div className="absolute bottom-2 right-2">
              <VoiceInputButton
                language="jp"
                onInsert={(text) => {
                  setPromptJp((prev) => prev + (prev ? " " : "") + text);
                }}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* 英語 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            英語
            <AudioPlaybackButton
              text={targetEn}
              language="en"
              size="sm"
              className="ml-2"
            />
            {errors.targetEn && (
              <span className="text-red-600 text-sm ml-2">{errors.targetEn}</span>
            )}
          </label>
          <div className="relative">
            <textarea
              ref={textareaEnRef}
              value={targetEn}
              onChange={(e) => setTargetEn(e.target.value)}
              placeholder="英語を入力..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 resize-none overflow-hidden"
              rows={2}
            />
            <div className="absolute bottom-2 right-2">
              <VoiceInputButton
                language="en"
                onInsert={(text) => {
                  setTargetEn((prev) => prev + (prev ? " " : "") + text);
                }}
                size="sm"
              />
            </div>
          </div>
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

        {/* お気に入り */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-5 h-5 text-yellow-600 rounded"
            />
            <span className="text-sm font-semibold">⭐ お気に入り</span>
          </label>
        </div>

        {/* ボタン */}
        <div className="flex gap-3 pt-4 border-t flex-wrap">
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
          <button
            onClick={() => {
              setShowAddVocabulary(!showAddVocabulary);
              if (!showAddVocabulary) {
                // 語彙追加フォームを開く際に、カードの内容を初期値として設定
                setVocabExample(targetEn.trim());
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {showAddVocabulary ? "語彙追加を閉じる" : "📚 語彙リストに追加"}
          </button>
          {showDelete && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isDeleting ? "削除中..." : "削除"}
            </button>
          )}
        </div>
        
        {/* 語彙リスト追加フォーム */}
        {showAddVocabulary && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">語彙リストに追加</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  単語または表現 <span className="text-red-500">*</span>
                  {errors.vocabWord && (
                    <span className="text-red-600 text-sm ml-2">{errors.vocabWord}</span>
                  )}
                </label>
                <input
                  type="text"
                  value={vocabWord}
                  onChange={(e) => setVocabWord(e.target.value)}
                  placeholder="例: wonderful, break down, etc."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  意味（日本語訳） <span className="text-red-500">*</span>
                  {errors.vocabMeaning && (
                    <span className="text-red-600 text-sm ml-2">{errors.vocabMeaning}</span>
                  )}
                </label>
                <textarea
                  value={vocabMeaning}
                  onChange={(e) => setVocabMeaning(e.target.value)}
                  placeholder="意味を入力..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  例文（英文）
                </label>
                <textarea
                  value={vocabExample}
                  onChange={(e) => setVocabExample(e.target.value)}
                  placeholder="例文を入力（未入力の場合はカードの英文を使用）"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 resize-none"
                  rows={2}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleAddVocabulary}
                  disabled={isAddingVocabulary}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  {isAddingVocabulary ? "追加中..." : "語彙リストに追加"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVocabulary(false);
                    setVocabWord("");
                    setVocabMeaning("");
                    setVocabExample("");
                    setErrors({});
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
        variant="danger"
      />
    </>
  );
}

