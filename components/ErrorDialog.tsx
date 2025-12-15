"use client";

import { useEffect } from "react";

interface ErrorDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}

export default function ErrorDialog({
  isOpen,
  title,
  message,
  onClose,
  onRetry,
}: ErrorDialogProps) {
  useEffect(() => {
    if (isOpen) {
      // ESCキーで閉じる
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-2">
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              再試行
            </button>
          )}
          <button
            onClick={onClose}
            className={`${onRetry ? "bg-gray-500 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"} text-white font-semibold py-2 px-6 rounded-lg transition-colors`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

