"use client";

import React, { useState, useEffect } from "react";
import { SyncProvider, useSync } from "@/lib/sync-engine";
import { Player } from "@/components/Player";
import { Search } from "@/components/Search";
import { Queue } from "@/components/Queue";
import { Members } from "@/components/Members";
import { Invite } from "@/components/Invite";
import { Music, Radio, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RoomClientProps {
  roomId: string;
}

export const RoomClient: React.FC<RoomClientProps> = ({ roomId }) => {
  return (
    <SyncProvider roomId={roomId}>
      <RoomInner roomId={roomId} />
    </SyncProvider>
  );
};

const RoomInner: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { hasJoined, joinRoom, isSupabase } = useSync();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(true);

  // Validate room exists on mount
  useEffect(() => {
    let active = true;
    const checkRoom = async () => {
      try {
        const res = await fetch(`/api/rooms?roomCode=${encodeURIComponent(roomId)}`);
        const data = await res.json();
        if (active) {
          if (!res.ok || !data.exists) {
            setError("Room not found. Check the code or create a new room.");
          }
        }
      } catch (err) {
        if (active) {
          setError("Error connecting to server.");
        }
      } finally {
        if (active) {
          setIsValidating(false);
        }
      }
    };
    checkRoom();
    return () => {
      active = false;
    };
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error && error !== "Please choose a nickname") {
      return;
    }
    if (!name.trim()) {
      setError("Please choose a nickname");
      return;
    }
    
    setIsValidating(true);
    try {
      const res = await fetch(`/api/rooms?roomCode=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) {
        setError("Room not found. Check the code or create a new room.");
        setIsValidating(false);
        return;
      }
    } catch (err) {
      setError("Failed to validate room. Please try again.");
      setIsValidating(false);
      return;
    }

    setIsValidating(false);
    joinRoom(name.trim());
  };

  // 1. Nickname Entry Form (Lightweight Prompt)
  if (!hasJoined) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-bg-cozy px-6 relative select-none">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-sm w-full bg-surface-cozy border border-border-cozy rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-text-secondary mb-6 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            <span>Go Back</span>
          </Link>
          
          <div className="w-10 h-10 rounded-xl bg-card-cozy border border-border-cozy flex items-center justify-center text-brand mx-auto mb-4">
            <Music className="w-5 h-5" />
          </div>

          <h2 className="text-xl font-semibold text-text-primary">What's your name?</h2>
          <p className="text-xs text-text-secondary mt-1 max-w-[240px] mx-auto">
            Choose a nickname to share this listening room.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <div className="relative">
              <input
                type="text"
                maxLength={15}
                placeholder="Enter nickname..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error === "Please choose a nickname") setError("");
                }}
                autoFocus
                className="w-full px-5 py-3 bg-bg-cozy border border-border-cozy rounded-full text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/40 transition-all text-center"
              />
            </div>
            {error && <span className="text-[10px] text-red-400 mt-1">{error}</span>}
            <button
              type="submit"
              className="w-full py-3 bg-brand hover:bg-brand-hover text-text-primary rounded-full font-medium transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Enter Lounge</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Active Lounge Layout
  return (
    <div className="min-h-screen bg-bg-cozy flex flex-col relative">
      {/* Background ambient lighting */}
      <div className="absolute top-[20%] left-[20%] w-[450px] h-[450px] bg-brand/5 rounded-full blur-[110px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] bg-brand/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header bar */}
      <header className="w-full border-b border-border-cozy bg-surface-cozy/20 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-10 select-none">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-text-primary shadow-lg">
            <Radio className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-text-primary font-mono">
            syncbeat / <span className="text-text-secondary">{roomId}</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Realtime Engine Mode Indicator */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card-cozy border border-border-cozy text-[10px] text-text-secondary select-none font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabase ? "bg-emerald-400 animate-pulse" : "bg-blue-400"}`} />
            <span>{isSupabase ? "Supabase Sync" : "Multi-Tab Sync"}</span>
          </span>

          <Invite roomId={roomId} />
        </div>
      </header>

      {/* Main Lounge Column */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-6 py-4 lg:py-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left side: main player area */}
        <div className="lg:col-span-7 w-full flex flex-col items-center justify-center">
          <Player />
        </div>

        {/* Right side: search, queue, and members */}
        <div className="lg:col-span-5 w-full flex flex-col gap-6 lg:gap-8">
          <Search />
          <Queue />
          <Members />
        </div>
      </main>

      {/* Micro Status bar */}
      <footer className="w-full text-center py-4 text-[10px] text-text-muted font-mono border-t border-border-cozy/20 select-none">
        Listening Lounge &middot; Keep this page open to stay in sync
      </footer>
    </div>
  );
};
