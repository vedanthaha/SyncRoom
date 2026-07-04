"use client";

import React from "react";
import { useSync, QueueItem } from "@/lib/sync-engine";
import { Trash2, Disc, Play, Music } from "lucide-react";

export const Queue: React.FC = () => {
  const { queue, removeFromQueue, playbackState, updatePlaybackState, clearQueue } = useSync();

  const handlePlayNow = (e: React.MouseEvent, item: QueueItem) => {
    // Prevent event bubbling if clicking the delete button
    if ((e.target as HTMLElement).closest(".delete-btn")) return;
    
    const targetIdx = queue.findIndex((q) => q.id === item.id);
    if (targetIdx !== -1) {
      updatePlaybackState({
        videoId: item.videoId,
        currentIndex: targetIdx,
        isPlaying: true,
        currentTime: 0,
      });
    }
  };

  const nowPlayingItem = queue[playbackState.currentIndex] || null;
  const upNextItems = queue.slice(playbackState.currentIndex + 1);

  if (queue.length === 0) {
    return (
      <div className="w-full bg-surface-cozy border border-border-cozy rounded-[28px] p-12 text-center select-none animate-fade-in">
        <p className="text-xl md:text-2xl font-bold text-text-secondary">Queue is empty</p>
        <p className="text-base text-text-muted mt-3">Add tracks above to queue them up.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* NOW PLAYING SECTION */}
      <div className="w-full bg-surface-cozy border border-border-cozy rounded-[28px] overflow-hidden shadow-[0_15px_50px_rgba(7,11,20,0.5)]">
        <div className="px-7 py-5 border-b border-border-cozy/80 select-none">
          <span className="text-lg md:text-xl font-bold text-text-muted uppercase tracking-wider">Now Playing</span>
        </div>

        {nowPlayingItem ? (
          <div className="flex items-center gap-4 p-5 md:p-6 bg-brand/5">
            <div className="w-7 flex-shrink-0 flex items-center justify-center">
              <Disc className="w-6 h-6 text-brand animate-spin" style={{ animationDuration: "5s" }} />
            </div>

            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-card-cozy border border-border-cozy flex-shrink-0 relative">
              {nowPlayingItem.thumbnail ? (
                <img src={nowPlayingItem.thumbnail} alt={nowPlayingItem.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <Music className="w-7 h-7" />
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="min-w-0 flex-1">
              <p className="text-[17px] md:text-[18px] font-bold text-brand line-clamp-1">
                {nowPlayingItem.title}
              </p>
              <p className="text-sm text-text-secondary mt-1 flex items-center gap-2 select-none">
                <span>Added by <span className="font-semibold text-text-primary">{nowPlayingItem.addedBy}</span></span>
                {nowPlayingItem.duration && nowPlayingItem.duration !== "Cozy Vibe" && nowPlayingItem.duration !== "Live" && (
                  <>
                    <span className="text-text-muted/40 font-bold">&middot;</span>
                    <span className="font-mono text-text-muted">{nowPlayingItem.duration}</span>
                  </>
                )}
              </p>
            </div>
            
            {/* Delete button */}
            <button
              onClick={() => removeFromQueue(nowPlayingItem.id)}
              className="delete-btn p-2.5 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 cursor-pointer ml-2"
              title="Remove from queue"
            >
              <Trash2 className="w-5.5 h-5.5" />
            </button>
          </div>
        ) : (
          <div className="p-6 text-center select-none text-text-muted text-base">
            Nothing playing right now.
          </div>
        )}
      </div>

      {/* UP NEXT SECTION */}
      <div className="w-full bg-surface-cozy border border-border-cozy rounded-[28px] overflow-hidden shadow-[0_15px_50px_rgba(7,11,20,0.5)]">
        <div className="px-7 py-5 border-b border-border-cozy/80 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <span className="text-lg md:text-xl font-bold text-text-muted uppercase tracking-wider">Up Next</span>
            <span className="text-xs bg-card-cozy border border-border-cozy text-text-secondary px-3 py-1 rounded-full font-mono font-bold">
              {upNextItems.length}
            </span>
          </div>
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs md:text-sm font-bold text-text-muted hover:text-red-400 hover:underline transition-colors active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Interactive List */}
        <div className="max-h-[300px] overflow-y-auto divide-y divide-border-cozy/40">
          {upNextItems.length > 0 ? (
            upNextItems.map((item, index) => {
              // Real index in the full queue list
              const realIndex = queue.findIndex((q) => q.id === item.id);

              return (
                <div
                  key={item.id}
                  onClick={(e) => handlePlayNow(e, item)}
                  className="flex items-center justify-between p-5 md:p-6 group transition-all duration-300 cursor-pointer hover:bg-card-hover/30 border-l-[4px] border-transparent pl-[16px]"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Number / Status Icon */}
                    <div className="w-7 flex-shrink-0 flex items-center justify-center text-base font-bold text-text-muted font-mono select-none">
                      <span className="group-hover:hidden">{index + 1}</span>
                      <Play className="w-5 h-5 text-brand fill-current hidden group-hover:block animate-scale-up" />
                    </div>

                    {/* Album Art Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-card-cozy border border-border-cozy flex-shrink-0 relative">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Music className="w-7 h-7" />
                        </div>
                      )}
                    </div>

                    {/* Song Meta */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] md:text-[18px] font-bold line-clamp-1 text-text-primary transition-colors group-hover:text-brand">
                        {item.title}
                      </p>
                      <p className="text-sm text-text-secondary mt-1 flex items-center gap-2 select-none">
                        <span>Added by <span className="font-semibold text-text-primary">{item.addedBy}</span></span>
                        {item.duration && item.duration !== "Cozy Vibe" && item.duration !== "Live" && (
                          <>
                            <span className="text-text-muted/40 font-bold">&middot;</span>
                            <span className="font-mono text-text-muted">{item.duration}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(item.id);
                      }}
                      className="delete-btn p-2.5 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-5.5 h-5.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-text-muted text-base select-none">
              No upcoming tracks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
