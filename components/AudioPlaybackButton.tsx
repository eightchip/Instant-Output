"use client";

import { useState, useEffect, useRef } from "react";
import { tts, TTSSpeed } from "@/lib/tts";
import VoiceInputButton from "./VoiceInputButton";

interface AudioPlaybackButtonProps {
  text: string;
  language: "jp" | "en";
  onInsert?: (text: string) => void;
  className?: string;
  size?: "sm" | "md";
  showSpeedControl?: boolean;
  japaneseText?: string; // 英語音声入力時に表示する日本語テキスト
}

export default function AudioPlaybackButton({
  text,
  language,
  onInsert,
  className = "",
  size = "sm",
  showSpeedControl = false,
  japaneseText,
}: AudioPlaybackButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<TTSSpeed>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // TTSの状態を監視
    const checkTTSState = () => {
      setIsSpeaking(tts.getIsSpeaking());
      setIsPaused(tts.getIsPaused());
    };

    intervalRef.current = setInterval(checkTTSState, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handlePlay = () => {
    if (isSpeaking && !isPaused) {
      // 停止
      tts.stop();
      setIsSpeaking(false);
      setIsPaused(false);
    } else if (isPaused) {
      // 再開
      tts.resume();
      setIsPaused(false);
    } else {
      // 再生（TTSサービスは"ja"を期待するので変換）
      const ttsLanguage = language === "jp" ? "ja" : "en";
      tts.speak(text, ttsLanguage, ttsSpeed);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const handleSpeedChange = (speed: TTSSpeed) => {
    setTtsSpeed(speed);
    // 再生中なら再読み上げ（TTSサービスは"ja"を期待するので変換）
    if (isSpeaking && !isPaused) {
      tts.stop();
      const ttsLanguage = language === "jp" ? "ja" : "en";
      tts.speak(text, ttsLanguage, speed);
    }
  };

  const sizeClasses = {
    sm: "text-xs py-1 px-3",
    md: "text-sm py-2 px-4",
  };

  if (!tts.isAvailable()) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showSpeedControl && (
        <select
          value={ttsSpeed}
          onChange={(e) => handleSpeedChange(Number(e.target.value) as TTSSpeed)}
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <option value={0.5}>0.5x</option>
          <option value={0.75}>0.75x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      )}
      <button
        onClick={handlePlay}
        className={`${sizeClasses[size]} rounded-lg font-semibold ${
          isSpeaking && !isPaused
            ? "bg-red-500 hover:bg-red-600"
            : isPaused
            ? "bg-yellow-500 hover:bg-yellow-600"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white`}
        title={isSpeaking && !isPaused ? "停止" : isPaused ? "再開" : "音声読み上げ"}
      >
        {isSpeaking && !isPaused ? "⏹" : isPaused ? "▶" : "🔊"}
      </button>
      {onInsert && (
        <VoiceInputButton
          language={language}
          onInsert={onInsert}
          size={size}
          japaneseText={japaneseText}
        />
      )}
    </div>
  );
}

