"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seedSampleData } from "@/lib/seed";

export default function SeedPage() {
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    setIsSeeding(true);
    setMessage("");
    try {
      await seedSampleData();
      setMessage("サンプルデータを追加しました！");
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Failed to seed data:", error);
      setMessage("エラーが発生しました。");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">サンプルデータ追加</h1>
        <p className="text-gray-600 mb-6">
          テスト用のサンプルカードを追加します。
        </p>
        <button
          onClick={handleSeed}
          disabled={isSeeding}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg"
        >
          {isSeeding ? "追加中..." : "サンプルデータを追加"}
        </button>
        {message && (
          <p className={`mt-4 text-center ${message.includes("エラー") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
        <button
          onClick={() => router.push("/")}
          className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}

