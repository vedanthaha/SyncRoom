"use client";

import React, { useEffect } from "react";
import { useSync } from "@/lib/sync-engine";
import { Crown, Radio } from "lucide-react";

export const Members: React.FC = () => {
  const { members, userId } = useSync();

  useEffect(() => {
    console.log('👥 Members component - members updated:', members);
  }, [members, userId]);

  return (
    <div className="w-full py-3.5 px-6 bg-surface-cozy/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl flex items-center justify-between select-none shadow-lg shadow-black/20 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase font-mono">
          Listening Room
        </span>
        <span className="text-[11px] font-mono text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
          {members.length} {members.length === 1 ? "listener" : "listeners"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {members.length === 0 && (
          <span className="text-xs text-text-muted">Connecting...</span>
        )}
        {members.map((member) => {
          const isSelf = member.id === userId;
          const initial = member.name ? member.name.charAt(0).toUpperCase() : "?";

          return (
            <div
              key={member.id}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                isSelf
                  ? "bg-indigo-500/15 border-indigo-500/40 text-text-primary shadow-sm shadow-indigo-500/10"
                  : "bg-slate-900/60 border-white/5 text-text-secondary hover:border-white/20 hover:text-text-primary"
              }`}
            >
              {/* Initial Avatar Circle */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  member.isHost
                    ? "bg-gradient-to-tr from-amber-500 to-indigo-500 text-white shadow-sm"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {initial}
              </div>

              {/* Name & Self Tag */}
              <span className="flex items-center gap-1">
                <span>{member.name}</span>
                {isSelf && <span className="text-[10px] text-indigo-400 font-mono">(You)</span>}
              </span>

              {/* Host Crown Badge */}
              {member.isHost && (
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/25">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span>HOST</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
