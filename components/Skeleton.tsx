"use client";

export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-gray-700/40 ${className}`}
      aria-hidden="true"
    />
  );
}
