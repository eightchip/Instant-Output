"use client";

import { RefObject } from "react";

interface InfiniteScrollSentinelProps {
  sentinelRef: RefObject<HTMLDivElement>;
}

export default function InfiniteScrollSentinel({ sentinelRef }: InfiniteScrollSentinelProps) {
  return <div ref={sentinelRef} className="h-4 w-full" />;
}

