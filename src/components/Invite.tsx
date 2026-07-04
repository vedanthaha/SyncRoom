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
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium tracking-wide transition-all active:scale-95 ${
        copied
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-card-cozy border-border-cozy text-text-secondary hover:text-text-primary hover:border-brand/30"
      }`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Invite Copied</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-text-muted" />
          <span>Invite Friend</span>
        </>
      )}
    </button>
  );
};
