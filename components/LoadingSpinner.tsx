"use client";

import { FaSpinner } from "react-icons/fa";

export default function LoadingSpinner({
  text = "Loading...",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <FaSpinner className="animate-spin h-4 w-4" />
      {text}
    </div>
  );
}
