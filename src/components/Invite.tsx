"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

interface InviteProps {
  roomId: string;
}

export const Invite: React.FC<InviteProps> = ({ roomId }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 cursor-pointer shadow-md ${
        copied
          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10"
          : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:text-white shadow-indigo-500/5"
      }`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Invite Link Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Invite Friends</span>
        </>
      )}
    </button>
  );
};
