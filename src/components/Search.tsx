"use client";

import React, { useState, useEffect, useRef } from "react";
import { searchYouTube, SearchResult } from "@/lib/youtube";
import { useSync } from "@/lib/sync-engine";
import { Search as SearchIcon, Loader2, Plus, Check, Music, Clock } from "lucide-react";

export const Search: React.FC = () => {
  const { addToQueue } = useSync();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close results panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Perform search when query changes (debounced)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (query.trim().length === 0) {
      // Trigger empty search to load curated recommendations
      setIsLoading(true);
      searchYouTube("").then((data) => {
        setResults(data);
        setIsLoading(false);
      });
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchYouTube(query);
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 450); // 450ms debounce

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  const handleAdd = (track: SearchResult) => {
    addToQueue({
      videoId: track.videoId,
      title: track.title,
      thumbnail: track.thumbnail,
      duration: track.duration,
    });

    // Show temporary success feedback
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(track.videoId);
      return next;
    });

    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.videoId);
        return next;
      });
    }, 1500);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box (+30% larger padding, font sizes, and icon size) */}
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-6 w-6 h-6 text-text-secondary pointer-events-none" />
        <input
          type="text"
          placeholder="Search songs, cozy lo-fi, ambient..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="w-full pl-16 pr-14 py-5 bg-card-cozy border border-border-cozy rounded-[20px] text-[18px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all shadow-[0_6px_20px_rgba(7,11,20,0.35)]"
        />
        {isLoading && (
          <Loader2 className="absolute right-6 w-6 h-6 text-text-muted animate-spin" />
        )}
      </div>

      {/* Results Dropdown (Redesigned with explicit song list metadata and Add to Queue action) */}
      {showResults && results.length > 0 && (
        <div className="relative w-full mt-4 bg-surface-cozy border border-border-cozy rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 animate-fade-in max-h-[400px] overflow-y-auto">
          <div className="px-6 py-4 border-b border-border-cozy flex items-center justify-between select-none">
            <span className="text-sm font-bold tracking-widest text-text-muted uppercase">
              {query ? "Search Results" : "Curated Listening"}
            </span>
            {!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY && (
              <span className="text-xs bg-brand/10 text-brand px-3 py-1.5 rounded-full border border-brand/20">
                Demo Vibes
              </span>
            )}
          </div>
          <div className="divide-y divide-border-cozy/50">
            {results.map((track) => {
              const isAdded = addedIds.has(track.videoId);
              return (
                <div
                  key={track.videoId}
                  className="flex items-center justify-between p-5 hover:bg-card-hover/40 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-card-cozy border border-border-cozy flex-shrink-0">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Music className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                    {/* Song Metadata (Song Title, Channel, Duration) */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-semibold text-text-primary line-clamp-1 group-hover:text-brand-hover transition-colors">
                        {track.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-sm text-text-secondary">
                        <span className="truncate max-w-[150px]">{track.channelTitle}</span>
                        <span className="text-text-muted select-none">&middot;</span>
                        <span className="flex items-center gap-1 font-mono text-xs text-text-muted">
                          <Clock className="w-4 h-4" />
                          <span>{track.duration || "3:30"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Redesigned Add to Queue Button */}
                  <button
                    onClick={() => handleAdd(track)}
                    className={`ml-4 px-5 py-2.5 rounded-full text-xs font-bold border tracking-wide transition-all select-none cursor-pointer flex items-center gap-2 ${
                      isAdded
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-brand/10 hover:bg-brand border-brand/20 hover:border-brand text-brand hover:text-text-primary active:scale-95 shadow-sm"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 animate-scale-up" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
