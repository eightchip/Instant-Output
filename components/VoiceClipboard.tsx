"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VoiceClipboardItem {
  id: string;
  text: string;
  language: "jp" | "en";
  timestamp: number;
}

interface VoiceClipboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
  items: VoiceClipboardItem[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

export default function VoiceClipboard({
  isOpen,
  onClose,
  onInsert,
  items,
  onDelete,
  onClear,
}: VoiceClipboardProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>音声入力クリップボード</DialogTitle>
          <DialogDescription>
            保存された音声入力テキストを選択して挿入できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              保存されたテキストがありません
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800 whitespace-nowrap">
                        {item.language === "jp" ? "日本語" : "英語"}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {item.text}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        onInsert(item.text);
                        onClose();
                      }}
                      size="sm"
                      variant="default"
                    >
                      挿入
                    </Button>
                    <Button
                      onClick={() => onDelete(item.id)}
                      size="sm"
                      variant="outline"
                    >
                      削除
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button onClick={onClear} variant="destructive" disabled={items.length === 0}>
            すべて削除
          </Button>
          <Button onClick={onClose} variant="outline">
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

