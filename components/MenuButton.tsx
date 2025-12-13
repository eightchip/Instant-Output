"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MenuButtonProps {
  icon: string;
  title: string;
  description: string;
  color: "blue" | "purple" | "green" | "orange" | "red" | "gray";
  onClick: () => void;
}

const colorClasses = {
  blue: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800",
  purple: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800",
  green: "bg-green-50 hover:bg-green-100 border-green-200 text-green-800",
  orange: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-800",
  red: "bg-red-50 hover:bg-red-100 border-red-200 text-red-800",
  gray: "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800",
};

const iconColorClasses = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  gray: "bg-gray-500",
};

export default function MenuButton({
  icon,
  title,
  description,
  color,
  onClick,
}: MenuButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full ${colorClasses[color]} border-2 font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center gap-3 group`}
      >
        <div
          className={`w-10 h-10 ${iconColorClasses[color]} rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0`}
        >
          {icon}
        </div>
        <span className="flex-1 text-left">{title}</span>
        <svg
          className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* ツールチップ */}
      {showTooltip && (
        <div className="absolute left-full ml-2 top-0 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl z-50 pointer-events-none">
          <div className="font-semibold mb-1">{title}</div>
          <div className="text-gray-300 leading-relaxed">{description}</div>
          <div className="absolute -left-2 top-4 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
        </div>
      )}
    </div>
  );
}

