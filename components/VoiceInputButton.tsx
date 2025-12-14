"use client";

import { useVoiceInput } from "@/contexts/VoiceInputContext";
import { useState, useRef, useEffect } from "react";

interface VoiceInputButtonProps {
  language: "jp" | "en";
  onInsert?: (text: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function VoiceInputButton({
  language,
  onInsert,
  className = "",
  size = "sm",
}: VoiceInputButtonProps) {
  const { openVoiceInput, openVoiceClipboard, insertText } = useVoiceInput();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleInsert = (text: string) => {
    if (onInsert) {
      onInsert(text);
    } else {
      insertText(text);
    }
  };

  const sizeClasses = {
    sm: "text-xs py-1 px-3",
    md: "text-sm py-2 px-4",
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`${sizeClasses[size]} bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg flex items-center gap-1 ${className}`}
        title="音声入力"
      >
        🎤 音声
      </button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50">
          <button
            onClick={() => {
              openVoiceInput(language, handleInsert);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <span>🎤</span>
            <span>{language === "jp" ? "日本語" : "英語"}音声入力</span>
          </button>
          <div className="border-t border-gray-200 my-1" />
          <button
            onClick={() => {
              openVoiceClipboard(handleInsert);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <span>📋</span>
            <span>クリップボード</span>
          </button>
        </div>
      )}
    </div>
  );
}

