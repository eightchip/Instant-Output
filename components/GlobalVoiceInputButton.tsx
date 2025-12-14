"use client";

import { useVoiceInput } from "@/contexts/VoiceInputContext";
import { useState, useRef, useEffect } from "react";

interface GlobalVoiceInputButtonProps {
  language?: "jp" | "en";
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "floating" | "inline";
}

export default function GlobalVoiceInputButton({
  language = "jp",
  className = "",
  size = "md",
  variant = "floating",
}: GlobalVoiceInputButtonProps) {
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

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-14 h-14 text-lg",
  };

  const buttonClasses = variant === "floating"
    ? `fixed bottom-6 right-6 ${sizeClasses[size]} bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110`
    : `inline-flex items-center justify-center ${sizeClasses[size]} bg-blue-600 hover:bg-blue-700 text-white rounded-lg`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`${buttonClasses} ${className}`}
        title="音声入力"
      >
        🎤
      </button>

      {showMenu && (
        <div className={`absolute ${variant === "floating" ? "bottom-16 right-0" : "top-full left-0 mt-2"} bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50`}>
          <button
            onClick={() => {
              openVoiceInput("jp", insertText);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <span>🎤</span>
            <span>日本語音声入力</span>
          </button>
          <button
            onClick={() => {
              openVoiceInput("en", insertText);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <span>🎤</span>
            <span>英語音声入力</span>
          </button>
          <div className="border-t border-gray-200 my-1" />
          <button
            onClick={() => {
              openVoiceClipboard(insertText);
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

