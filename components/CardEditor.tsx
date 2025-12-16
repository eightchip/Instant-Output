"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/types/models";
import { storage } from "@/lib/storage";
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
  const [errors, setErrors] = useState<{
    targetEn?: string;
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
          <label className="block text-sm font-semibold mb-2">
            日本語
            <AudioPlaybackButton
              text={promptJp}
              language="jp"
              size="sm"
              className="ml-2"
            />
          </label>
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
                onResult={(text) => {
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
                onResult={(text) => {
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

