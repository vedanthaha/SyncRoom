"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Music, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = () => {
    // Generate a beautiful short room code, e.g. "cozy-jazz-123"
    const words = ["cozy", "warm", "chill", "soft", "sweet", "calm", "dreamy"];
    const music = ["beat", "jazz", "lofi", "tune", "song", "note", "sound"];
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = music[Math.floor(Math.random() * music.length)];
    const num = Math.floor(Math.random() * 900) + 100;

    const roomId = `${word1}-${word2}-${num}`;

    // Navigate directly to the room - room will be created after nickname is entered
    router.push(`/room/${roomId}?create=true`);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    const cleanCode = joinCode.trim().toLowerCase();
    setIsLoading(true);
    
    try {
      const res = await fetch(`/api/rooms?roomCode=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Error connecting. Please try again.");
        setIsLoading(false);
        return;
      }

      if (!data.exists) {
        setError("Room not found. Check the code.");
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Unexpected error occurred.");
      setIsLoading(false);
      return;
    }
    
    router.push(`/room/${cleanCode}`);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-bg-cozy px-6 relative overflow-hidden select-none">
      {/* Premium Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/10 rounded-full blur-[120px] pointer-events-none animate-glow-breath z-0" />

      <main className="flex flex-col items-center max-w-lg w-full text-center z-10 animate-fade-in">
        {/* Subtle Icon Header */}
        <div className="w-12 h-12 rounded-2xl bg-surface-cozy border border-border-cozy flex items-center justify-center text-brand mb-8 shadow-inner">
          <Music className="w-5 h-5" />
        </div>

        {/* Headline */}
        <h1 className="text-[32px] md:text-[40px] font-semibold tracking-tight leading-tight text-text-primary">
          Listen together, in perfect harmony
        </h1>

        {/* Supporting sentence */}
        <p className="text-text-secondary text-sm md:text-base font-medium mt-4 max-w-sm leading-relaxed">
          A cozy, private listening lounge shared by two people. Join in sync, no accounts, no clutter.
        </p>

        {/* Actions Section */}
        <div className="mt-10 w-full max-w-[320px] flex flex-col gap-3">
          {!showJoinInput ? (
            <>
              {/* Create Room */}
              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 bg-brand hover:bg-brand-hover text-text-primary rounded-full font-medium shadow-[0_4px_25px_rgba(28,57,187,0.25)] hover:shadow-[0_4px_30px_rgba(54,88,231,0.35)] transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Create a Lounge</span>
                <Sparkles className="w-4 h-4 text-brand-hover group-hover:text-text-primary transition-colors" />
              </button>

              {/* Join Room Option */}
              <button
                onClick={() => setShowJoinInput(true)}
                className="w-full py-3.5 bg-card-cozy hover:bg-card-hover border border-border-cozy hover:border-brand/20 text-text-secondary hover:text-text-primary rounded-full font-medium transition-all active:scale-98 cursor-pointer"
              >
                Join existing room
              </button>
            </>
          ) : (
            <form onSubmit={handleJoinSubmit} className="w-full flex flex-col gap-2 animate-fade-in">
              <div className="relative flex items-center w-full">
                <input
                  type="text"
                  placeholder="Enter room code..."
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    if (error) setError("");
                  }}
                  autoFocus
                  className="w-full px-5 py-3.5 bg-card-cozy border border-border-cozy rounded-full text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/40 transition-all pr-12"
                />
                <button
                  type="submit"
                  className="absolute right-2 p-2 bg-brand hover:bg-brand-hover text-text-primary rounded-full transition-all active:scale-90"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {error && <span className="text-[11px] text-red-400 mt-1">{error}</span>}

              <button
                type="button"
                onClick={() => {
                  setShowJoinInput(false);
                  setError("");
                }}
                className="text-xs text-text-muted hover:text-text-secondary mt-2 underline decoration-dotted transition-colors"
              >
                Go back
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Cozy Minimal Footer */}
      <footer className="absolute bottom-6 text-[10px] text-text-muted tracking-wider uppercase font-mono z-10 select-none">
        SyncBeat &copy; {new Date().getFullYear()} &middot; Cozy Shared Listening
      </footer>
    </div>
  );
}
