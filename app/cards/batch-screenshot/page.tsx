"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// batch-screenshotページはscreenshotページに統合されました
// リダイレクトします
export default function BatchScreenshotPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cards/screenshot");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">リダイレクト中...</div>
    </div>
  );
}
