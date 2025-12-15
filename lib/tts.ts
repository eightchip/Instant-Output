// 音声読み上げ（TTS）機能のラッパー

import { detectLanguage } from "./language-detection";

export type TTSLanguage = "ja" | "en";
export type TTSSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

class TTSService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private currentSpeed: TTSSpeed = 1;

  /**
   * 音声読み上げが利用可能かチェック
   */
  isAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  /**
   * テキストを音声で読み上げる
   * langが指定されていない場合は自動検出
   */
  speak(text: string, lang?: TTSLanguage, speed: TTSSpeed = 1): void {
    if (!this.isAvailable()) {
      console.warn("音声読み上げは利用できません");
      return;
    }

    // 既存の読み上げを停止
    this.stop();

    // 言語が明示的に指定されている場合はそれを使用、指定されていない場合のみ自動検出
    const detectedLang: TTSLanguage = lang !== undefined ? lang : detectLanguage(text);

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.lang = detectedLang === "ja" ? "ja-JP" : "en-US";
    this.utterance.rate = speed;
    this.utterance.pitch = 1;
    this.utterance.volume = 1;

    this.utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPaused = false;
    };

    this.utterance.onend = () => {
      this.isSpeaking = false;
      this.isPaused = false;
    };

    this.utterance.onerror = (event) => {
      console.error("TTS error:", event);
      this.isSpeaking = false;
      this.isPaused = false;
    };

    this.currentSpeed = speed;
    window.speechSynthesis.speak(this.utterance);
  }

  /**
   * 読み上げを停止
   */
  stop(): void {
    if (!this.isAvailable()) return;

    window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.isPaused = false;
    this.utterance = null;
  }

  /**
   * 読み上げを一時停止
   */
  pause(): void {
    if (!this.isAvailable() || !this.isSpeaking) return;

    window.speechSynthesis.pause();
    this.isPaused = true;
  }

  /**
   * 一時停止した読み上げを再開
   */
  resume(): void {
    if (!this.isAvailable() || !this.isPaused) return;

    window.speechSynthesis.resume();
    this.isPaused = false;
  }

  /**
   * 現在読み上げ中かどうか
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * 現在一時停止中かどうか
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * 現在の読み上げ速度を取得
   */
  getCurrentSpeed(): TTSSpeed {
    return this.currentSpeed;
  }

  /**
   * 利用可能な音声のリストを取得
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isAvailable()) return [];
    return window.speechSynthesis.getVoices();
  }
}

export const tts = new TTSService();

// ブラウザの音声リストが読み込まれたときに初期化
if (typeof window !== "undefined") {
  // Chrome では voiceschanged イベントが必要
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      // 音声リストが読み込まれたことを確認
      console.log("TTS voices loaded:", tts.getAvailableVoices().length);
    };
  }
}

