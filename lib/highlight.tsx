// テキストハイライト機能

import React from "react";

/**
 * テキスト内の検索文字列をハイライト表示する
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = textLower.indexOf(queryLower, lastIndex);

  while (index !== -1) {
    // ハイライト前のテキスト
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }

    // ハイライト部分
    parts.push(
      <mark
        key={index}
        className="bg-yellow-200 text-yellow-900 font-semibold px-0.5 rounded"
      >
        {text.substring(index, index + query.length)}
      </mark>
    );

    lastIndex = index + query.length;
    index = textLower.indexOf(queryLower, lastIndex);
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

