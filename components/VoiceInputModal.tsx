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
}

export default function VoiceInputModal({
  isOpen,
  language,
  onClose,
  onInsert,
  onSaveToClipboard,
}: VoiceInputModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [finalText, setFinalText] = useState("");
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const langCode = language === "jp" ? "ja-JP" : "en-US";
  const langName = language === "jp" ? "日本語" : "英語";

  function startRecording() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("お使いのブラウザは音声認識に対応していません。");
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

  const displayText = finalText || recognizedText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[450px] max-h-[70vh] overflow-y-auto"
        style={{ top: '10%', transform: 'translate(-50%, 0)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">{langName}音声入力</DialogTitle>
          <DialogDescription className="text-sm">
            マイクに向かって話してください。認識されたテキストが表示されます。
          </DialogDescription>
        </DialogHeader>

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

