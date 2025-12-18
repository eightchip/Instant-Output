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
import { isAdminAuthenticated, getSessionData } from "@/lib/admin-auth";

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
  const [useWhisper, setUseWhisper] = useState(false); // Whisper APIを使用するか
  const [isTranscribing, setIsTranscribing] = useState(false); // Whisper APIで転写中か
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
  const isAdmin = isAdminAuthenticated();
  const canUseWhisper = isAdmin && language === "en"; // 管理者かつ英語の場合のみWhisper使用可能

  // Whisper APIを使用した音声認識
  async function startWhisperRecording() {
    try {
      setIsRecording(true);
      setIsTranscribing(false);
      setRecognizedText("");
      setFinalText("");
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (audioChunksRef.current.length === 0) {
          setIsRecording(false);
          return;
        }

        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // base64に変換
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          try {
            // セッションデータを取得
            const sessionData = getSessionData();
            
            if (!sessionData) {
              setRecognizedText("[エラー: 管理者セッションが無効です。再度ログインしてください]");
              setIsRecording(false);
              setIsTranscribing(false);
              return;
            }
            
            const response = await fetch("/api/whisper-transcribe", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                audioBase64: base64Audio,
                sessionData: sessionData,
                language: "en",
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error("Whisper API error:", errorData);
              setRecognizedText(`[エラー: ${errorData.message || "音声認識に失敗しました"}]`);
              setIsRecording(false);
              setIsTranscribing(false);
              return;
            }

            const data = await response.json();
            if (data.text) {
              setFinalText(data.text);
              setRecognizedText("");
            }
          } catch (error) {
            console.error("Whisper transcription error:", error);
            setRecognizedText("[エラー: 音声認識処理中にエラーが発生しました]");
          } finally {
            setIsRecording(false);
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Failed to start Whisper recording:", error);
      setIsRecording(false);
      setRecognizedText("[エラー: マイクへのアクセスに失敗しました]");
    }
  }

  function startRecording() {
    // 管理者かつ英語の場合、Whisper APIを使用
    if (useWhisper && canUseWhisper) {
      startWhisperRecording();
      return;
    }

    // 通常のWeb Speech API
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
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

        {/* Whisper API切り替え（管理者かつ英語の場合のみ） */}
        {canUseWhisper && (
          <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useWhisper}
                onChange={(e) => setUseWhisper(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
                disabled={isRecording}
              />
              <span className="text-sm font-semibold text-purple-700">
                🤖 Whisper APIを使用（高精度・管理者専用）
              </span>
            </label>
            <p className="text-xs text-purple-600 mt-1 ml-6">
              {useWhisper 
                ? "録音停止後に自動で認識されます（約1-2秒かかります）"
                : "Web Speech APIを使用（リアルタイム認識）"}
            </p>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : isTranscribing
                  ? "bg-yellow-500 cursor-wait"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white shadow-lg disabled:opacity-50`}
            >
              {isTranscribing ? "⏳" : isRecording ? "⏹" : "🎤"}
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
                {isTranscribing 
                  ? "Whisper APIで認識中..." 
                  : isRecording 
                  ? (useWhisper ? "録音中...（停止ボタンで認識開始）" : "音声を認識中...")
                  : "録音ボタンを押して開始してください"}
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

