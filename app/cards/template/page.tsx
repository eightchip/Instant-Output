"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// テンプレート機能は削除されました
// カード追加ページにリダイレクトします
export default function TemplateCardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cards/new");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">リダイレクト中...</div>
    </div>
  );
}
