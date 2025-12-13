// テスト用サンプルデータ

import { storage } from "./storage";
import { Course, Lesson, Card } from "@/types/models";

export async function seedSampleData() {
  await storage.init();

  // サンプルレッスンを作成
  const lessonId = `lesson_${Date.now()}`;
  const lesson: Lesson = {
    id: lessonId,
    title: "基本英文",
  };
  await storage.saveLesson(lesson);

  // サンプルカードを追加
  const sampleCards: Omit<Card, "id">[] = [
    {
      lessonId,
      prompt_jp: "こんにちは。",
      target_en: "Hello.",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "お元気ですか？",
      target_en: "How are you?",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "私は学生です。",
      target_en: "I am a student.",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "今日はいい天気ですね。",
      target_en: "It's a nice day today.",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "ありがとうございます。",
      target_en: "Thank you very much.",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "すみません。",
      target_en: "Excuse me.",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "お名前は何ですか？",
      target_en: "What's your name?",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "私は英語を勉強しています。",
      target_en: "I am studying English.",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "どこに住んでいますか？",
      target_en: "Where do you live?",
      source_type: "template",
    },
    {
      lessonId,
      prompt_jp: "何時ですか？",
      target_en: "What time is it?",
      source_type: "template",
    },
  ];

  for (const cardData of sampleCards) {
    const card: Card = {
      ...cardData,
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    await storage.saveCard(card);
  }

  console.log("サンプルデータを追加しました。");
}

