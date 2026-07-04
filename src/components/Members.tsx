"use client";

import React, { useEffect } from "react";
import { useSync } from "@/lib/sync-engine";

export const Members: React.FC = () => {
  const { members, userId } = useSync();

  useEffect(() => {
    console.log('👥 Members component - members updated:', members);
    console.log('👥 Members component - userId:', userId);
  }, [members, userId]);

  return (
    <div className="w-full py-4 px-6 bg-surface-cozy/45 border border-border-cozy/70 rounded-[20px] flex items-center justify-center select-none animate-fade-in">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest mr-1 select-none">
          Listening Room:
        </span>
        {members.length === 0 && (
          <span className="text-xs text-text-muted">No members connected</span>
        )}
        {members.map((member) => {
          const isSelf = member.id === userId;
          return (
            <span
              key={member.id}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all ${
                isSelf
                  ? "bg-brand/10 border-brand/35 text-text-primary"
                  : "bg-card-cozy border-border-cozy text-text-secondary"
              }`}
              title={`${member.name}${isSelf ? " (You)" : ""}`}
            >
              <span className={`w-2 h-2 rounded-full ${member.isHost ? "bg-brand animate-pulse-slow" : "bg-text-muted"}`} />
              <span>
                {member.name} {isSelf && <span className="text-text-muted text-xs">(You)</span>}
              </span>
              {member.isHost && (
                <span className="text-[9px] font-mono font-bold text-brand uppercase tracking-wider bg-brand/5 px-1.5 py-0.5 rounded-md border border-brand/15">
                  Host
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};
