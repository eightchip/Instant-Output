"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VoiceInputModalProps {
  isOpen: boolean;
  language: "jp" | "en";
  onClose: () => void;
  onInsert: (text: string) => void;
  onSaveToClipboard?: (text: string, language: "jp" | "en") => void;
  onSaveAsCard?: (text: string, language: "jp" | "en") => void;
  japaneseText?: string; // 日本語テキスト（英語音声入力時に表示）
}

export default function VoiceInputModal({
  isOpen,
  language,
  onClose,
  onInsert,
  onSaveToClipboard,
  onSaveAsCard,
  japaneseText,
}: VoiceInputModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [finalText, setFinalText] = useState("");
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // モーダルを画面中央に配置
      // モーダルが表示された後に正確な位置を計算
      const updatePosition = () => {
        if (modalRef.current) {
          const rect = modalRef.current.getBoundingClientRect();
          const centerX = (window.innerWidth - rect.width) / 2;
          const centerY = (window.innerHeight - rect.height) / 2;
          setPosition({ x: Math.max(0, centerX), y: Math.max(0, centerY) });
        } else {
          // フォールバック: デフォルト幅を想定
          const modalWidth = 450;
          const modalHeight = 400; // 推定高さ
          const centerX = (window.innerWidth - modalWidth) / 2;
          const centerY = (window.innerHeight - modalHeight) / 2;
          setPosition({ x: Math.max(0, centerX), y: Math.max(0, centerY) });
        }
      };
      
      // モーダルが表示された後に位置を更新
      setTimeout(updatePosition, 10);
      // リサイズ時にも位置を更新
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // ボタンや入力フィールドでのドラッグを防ぐ
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }
    
    if (modalRef.current) {
      setIsDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      e.preventDefault();
    }
  };

  useEffect(() => {
    let animationFrameId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && modalRef.current) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // 画面内に制限
        const maxX = window.innerWidth - modalRef.current.offsetWidth;
        const maxY = window.innerHeight - modalRef.current.offsetHeight;
        
        lastX = Math.max(0, Math.min(newX, maxX));
        lastY = Math.max(0, Math.min(newY, maxY));
        
        // requestAnimationFrameでスムーズに更新
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
          setPosition({ x: lastX, y: lastY });
        });
      }
    };

    const handleMouseUp = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && modalRef.current && e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = modalRef.current.getBoundingClientRect();
        const newX = touch.clientX - dragStart.x;
        const newY = touch.clientY - dragStart.y;
        
        // 画面内に制限
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        lastX = Math.max(0, Math.min(newX, maxX));
        lastY = Math.max(0, Math.min(newY, maxY));
        
        // requestAnimationFrameでスムーズに更新
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
          setPosition({ x: lastX, y: lastY });
        });
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, dragStart]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // ボタンや入力フィールドでのドラッグを防ぐ
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }
    
    if (modalRef.current) {
      setIsDragging(true);
      const touch = e.touches[0];
      const rect = modalRef.current.getBoundingClientRect();
      setDragStart({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  };

  const langCode = language === "jp" ? "ja-JP" : "en-US";
  const langName = language === "jp" ? "日本語" : "英語";

  function startRecording() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("お使いのブラウザは音声認識に対応していません。");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setRecognizedText("");
      setFinalText("");
      recognitionRef.current = recognition;
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setFinalText(finalTranscript.trim());
      setRecognizedText(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        // 音声が検出されない場合は自動的に停止
        stopRecording();
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }

  function handleInsert() {
    const textToInsert = finalText || recognizedText;
    if (textToInsert.trim()) {
      onInsert(textToInsert.trim());
      setFinalText("");
      setRecognizedText("");
      onClose();
    }
  }

  function handleSaveToClipboard() {
    const textToSave = finalText || recognizedText;
    if (textToSave.trim() && onSaveToClipboard) {
      onSaveToClipboard(textToSave.trim(), language);
      setFinalText("");
      setRecognizedText("");
    }
  }

  function handleSaveAsCard() {
    const textToSave = finalText || recognizedText;
    if (textToSave.trim() && onSaveAsCard) {
      onSaveAsCard(textToSave.trim(), language);
      setFinalText("");
      setRecognizedText("");
      onClose();
    }
  }

  const displayText = finalText || recognizedText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className="sm:max-w-[450px] max-h-[70vh] overflow-y-auto"
        style={{ 
          position: 'fixed',
          left: `${position.x}px !important`,
          top: `${position.y}px !important`,
          transform: 'none !important',
          margin: 0,
          cursor: isDragging ? 'grabbing' : 'default',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          willChange: isDragging ? 'transform' : 'auto',
        } as React.CSSProperties}
      >
        <DialogHeader 
          className="cursor-move select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <DialogTitle className="text-lg">{langName}音声入力</DialogTitle>
          <DialogDescription className="text-sm">
            マイクに向かって話してください。認識されたテキストが表示されます。
            <span className="block mt-1 text-xs text-gray-500">（ヘッダーをドラッグして移動できます）</span>
          </DialogDescription>
        </DialogHeader>

        {/* 日本語テキスト表示（英語音声入力時） */}
        {language === "en" && japaneseText && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p className="text-xs text-blue-700 font-semibold mb-1">日本語</p>
            <p className="text-base text-blue-900 font-medium">{japaneseText}</p>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white shadow-lg`}
            >
              {isRecording ? "⏹" : "🎤"}
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 min-h-[80px] max-h-[150px] overflow-y-auto">
            {displayText ? (
              <p className="text-base text-gray-800 whitespace-pre-wrap break-words overflow-wrap-anywhere word-break-break-word">
                {displayText}
                {recognizedText && !finalText && (
                  <span className="text-gray-400">|</span>
                )}
              </p>
            ) : (
              <p className="text-gray-400 text-center">
                {isRecording ? "音声を認識中..." : "録音ボタンを押して開始してください"}
              </p>
            )}
          </div>

          {displayText && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleInsert}
                  className="flex-1 text-sm py-2"
                  variant="default"
                >
                  テキストを挿入
                </Button>
                {onSaveToClipboard && (
                  <Button
                    onClick={handleSaveToClipboard}
                    className="flex-1 text-sm py-2"
                    variant="outline"
                  >
                    クリップボードに保存
                  </Button>
                )}
              </div>
              {onSaveAsCard && (
                <Button
                  onClick={handleSaveAsCard}
                  className="w-full text-sm py-2 bg-green-600 hover:bg-green-700 text-white"
                  variant="default"
                >
                  💾 カードとして保存
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button onClick={onClose} variant="outline" className="text-sm py-2">
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

