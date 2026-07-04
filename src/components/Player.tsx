"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSync } from "@/lib/sync-engine";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music } from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export const Player: React.FC = () => {
  const { playbackState, updatePlaybackState, isHost, queue, removeFromQueue } = useSync();
  const [player, setPlayer] = useState<any>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    return () => {
      // Don't clean up global function to avoid issues if re-mounted
    };
  }, []);

  // Initialize player when API is ready and there is a videoId
  useEffect(() => {
    if (!isApiReady || !playbackState.videoId || player) return;

    const newPlayer = new window.YT.Player("syncbeat-yt-player", {
      height: "100%",
      width: "100%",
      videoId: playbackState.videoId,
      playerVars: {
        controls: 0, // Hide native controls for premium look
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: (event: any) => {
          setPlayer(event.target);
          playerRef.current = event.target;
          event.target.setVolume(volume);
          if (isMuted) event.target.mute();
          
          // Initial seek and state sync
          syncGuestPlayer(event.target);
        },
        onStateChange: (event: any) => {
          const state = event.data;
          // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
          if (state === 0) {
            handleVideoEnded();
          }
        },
        onError: () => {
          setIframeError(true);
        }
      },
    });

    return () => {
      // cleanup is handled when videoId becomes null or player changes
    };
  }, [isApiReady, playbackState.videoId]);

  // Clean up player on dismount or videoId changes
  useEffect(() => {
    if (!playbackState.videoId && player) {
      try {
        player.destroy();
      } catch (e) {
        console.error(e);
      }
      setPlayer(null);
      playerRef.current = null;
      setDuration(0);
      setCurrentTime(0);
    }
  }, [playbackState.videoId]);

  // Handle video ending by moving to the next item
  const handleVideoEnded = () => {
    if (!isHost) return;
    const nextIndex = playbackState.currentIndex + 1;
    if (nextIndex < queue.length) {
      updatePlaybackState({
        currentIndex: nextIndex,
        videoId: queue[nextIndex].videoId,
        isPlaying: true,
        currentTime: 0,
      });
    } else {
      updatePlaybackState({
        videoId: null,
        isPlaying: false,
        currentTime: 0,
      });
    }
  };

  // Synchronize playback state changes from other users (and load new videos for host)
  useEffect(() => {
    if (!player || !player.getPlayerState) return;

    // Both host and guest must load the new video when videoId changes
    const currentVideoUrl = player.getVideoUrl ? player.getVideoUrl() : "";
    const isDifferentVideo = playbackState.videoId && !currentVideoUrl.includes(playbackState.videoId);
    
    if (isDifferentVideo) {
      player.loadVideoById({
        videoId: playbackState.videoId,
        startSeconds: playbackState.currentTime || 0
      });
      return;
    }

    if (isHost) return; // The host is the source of truth, they do not sync play/pause or offset from others
    syncGuestPlayer(player);
  }, [playbackState.videoId, playbackState.isPlaying, playbackState.lastUpdated, isHost]);

  const syncGuestPlayer = (targetPlayer: any) => {
    if (!targetPlayer) return;

    // Load new video if needed
    const currentVideoUrl = targetPlayer.getVideoUrl ? targetPlayer.getVideoUrl() : "";
    const isDifferentVideo = playbackState.videoId && !currentVideoUrl.includes(playbackState.videoId);
    
    if (isDifferentVideo) {
      targetPlayer.loadVideoById({
        videoId: playbackState.videoId,
        startSeconds: playbackState.currentTime
      });
      return;
    }

    // Play/Pause alignment
    const playerState = targetPlayer.getPlayerState();
    if (playbackState.isPlaying && playerState !== 1) {
      targetPlayer.playVideo();
    } else if (!playbackState.isPlaying && playerState === 1) {
      targetPlayer.pauseVideo();
    }

    // Sync time offset (calculate network lag compensation)
    let targetTime = playbackState.currentTime;
    if (playbackState.isPlaying && playbackState.lastUpdated > 0) {
      const timeDiff = (Date.now() - playbackState.lastUpdated) / 1000;
      targetTime += timeDiff;
    }

    const currentPlTime = targetPlayer.getCurrentTime() || 0;
    if (Math.abs(currentPlTime - targetTime) > 2.2) {
      targetPlayer.seekTo(targetTime, true);
    }
  };

  // Keep track of current time & duration for custom UI controls
  useEffect(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      if (!player || !player.getCurrentTime || isScrubbing) return;
      
      const time = player.getCurrentTime() || 0;
      setCurrentTime(time);

      const dur = player.getDuration() || 0;
      if (dur !== duration) {
        setDuration(dur);
      }
    }, 500);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [player, duration, isScrubbing]);

  // Host periodically broadcasts position to keep drift low
  useEffect(() => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    if (isHost && player && playbackState.isPlaying) {
      syncIntervalRef.current = setInterval(() => {
        const time = player.getCurrentTime() || 0;
        updatePlaybackState({
          currentTime: time,
          lastUpdated: Date.now(),
        });
      }, 5000); // Sync every 5 seconds
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isHost, player, playbackState.isPlaying]);

  // Control commands
  const togglePlay = () => {
    if (!isHost) return;
    
    if (!playbackState.videoId && queue.length > 0) {
      const idx = playbackState.currentIndex < queue.length && playbackState.currentIndex >= 0 ? playbackState.currentIndex : 0;
      updatePlaybackState({
        videoId: queue[idx].videoId,
        currentIndex: idx,
        isPlaying: true,
        currentTime: 0,
        lastUpdated: Date.now(),
      });
      return;
    }

    if (!player) return;
    const nextPlaying = !playbackState.isPlaying;
    const time = player.getCurrentTime() || 0;
    
    updatePlaybackState({
      isPlaying: nextPlaying,
      currentTime: time,
      lastUpdated: Date.now(),
    });

    if (nextPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    setIsScrubbing(true);
    const value = parseFloat(e.target.value);
    setCurrentTime(value);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    if (!player || !isHost) return;
    const value = parseFloat((e.target as HTMLInputElement).value);
    
    player.seekTo(value, true);
    updatePlaybackState({
      currentTime: value,
      lastUpdated: Date.now(),
    });
    setIsScrubbing(false);
  };

  const toggleMute = () => {
    if (!player) return;
    if (isMuted) {
      player.unMute();
      player.setVolume(volume);
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleSkip = () => {
    if (!isHost) return;
    const nextIndex = playbackState.currentIndex + 1;
    if (nextIndex < queue.length) {
      updatePlaybackState({
        currentIndex: nextIndex,
        videoId: queue[nextIndex].videoId,
        isPlaying: true,
        currentTime: 0,
      });
    } else {
      updatePlaybackState({
        videoId: null,
        isPlaying: false,
        currentTime: 0,
      });
    }
  };

  const handlePrevious = () => {
    if (!isHost || playbackState.currentIndex <= 0) return;
    const prevIndex = playbackState.currentIndex - 1;
    updatePlaybackState({
      currentIndex: prevIndex,
      videoId: queue[prevIndex].videoId,
      isPlaying: true,
      currentTime: 0,
    });
  };

  // Helper formatting mm:ss
  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return "0:00";
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Find currently playing queue meta
  const currentSong = queue[playbackState.currentIndex] || null;

  return (
    <div className="w-full flex flex-col items-center relative z-10 pb-10 lg:pb-14">
      {/* 1. Hero Artwork / Player Container */}
      <div className="relative w-full aspect-square max-w-[340px] md:max-w-[420px] lg:max-w-[460px] xl:max-w-[520px] mb-8 select-none">
        {/* Dynamic Blurred Glow behind the artwork (Apple Music style) */}
        {currentSong?.thumbnail && (
          <div 
            className="absolute -inset-10 bg-cover bg-center blur-[72px] opacity-40 rounded-full scale-95 pointer-events-none transition-all duration-1000 ease-in-out z-0"
            style={{ backgroundImage: `url(${currentSong.thumbnail})` }}
          />
        )}
        
        <div
          ref={containerRef}
          className="relative w-full h-full rounded-[40px] overflow-hidden border border-border-cozy bg-surface-cozy group transition-all duration-700 ease-out hover:border-brand/40 shadow-[0_25px_60px_rgba(7,11,20,0.7)] z-10"
        >
          {/* Soft Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-brand/10 via-transparent to-brand/5 pointer-events-none z-10" />

          {/* Real YouTube Player inside */}
          <div className={`w-full h-full transition-opacity duration-500 ${playbackState.videoId ? "opacity-100" : "opacity-0"}`}>
            <div id="syncbeat-yt-player" className="w-full h-full object-cover" />
          </div>

          {/* Cover Art Placeholder when empty */}
          {!playbackState.videoId && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary p-10 text-center select-none z-20">
              <div className="w-24 h-24 rounded-[32px] bg-card-cozy flex items-center justify-center border border-border-cozy text-brand mb-8 animate-pulse-slow">
                <Music className="w-12 h-12" />
              </div>
              <h3 className="text-text-primary font-bold text-3xl md:text-4xl mb-3">Nothing playing</h3>
              <p className="text-lg md:text-xl text-text-muted max-w-[320px] leading-relaxed">
                Search for a video on the right or check the queue to start listening.
              </p>
            </div>
          )}

          {/* Live Badge overlay */}
          {playbackState.videoId && (
            <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/5 flex items-center gap-2.5 text-xs font-bold tracking-wider uppercase text-text-secondary select-none pointer-events-none z-30">
              <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
              <span>Listening Live</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Track Meta (+20% larger typography) */}
      <div className="text-center max-w-[520px] w-full px-2 mb-4">
        <h2 className="text-text-primary text-[42px] md:text-[50px] font-black tracking-tight leading-tight line-clamp-1 min-h-[58px]">
          {currentSong ? currentSong.title : "Nothing playing"}
        </h2>
        <p className="text-text-secondary text-2xl md:text-3xl font-semibold mt-3 line-clamp-1 min-h-[38px]">
          {currentSong ? `Queued by ${currentSong.addedBy}` : "Cozy vibes await"}
        </p>
      </div>

      {/* 3. Progress Slider Controls (Time labels inline on same horizontal axis) */}
      <div className="w-full max-w-[520px] mb-6 flex items-center gap-4">
        <span className="text-[15px] text-text-secondary font-mono select-none min-w-[45px] text-right">
          {formatTime(currentTime)}
        </span>
        
        <div className="relative group flex-1 h-3 rounded-full bg-card-cozy border border-border-cozy flex items-center cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            disabled={!isHost || !playbackState.videoId}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
          />
          {/* Active fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-brand group-hover:bg-brand-hover transition-colors pointer-events-none"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute w-4.5 h-4.5 rounded-full bg-text-primary shadow-md border border-brand/50 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform pointer-events-none"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        <span className="text-[15px] text-text-secondary font-mono select-none min-w-[45px] text-left">
          {formatTime(duration)}
        </span>
      </div>

      {/* 4. Playback Buttons (Aligned in a clean horizontal line, fixed bounding boxes) */}
      <div className="flex items-center justify-center gap-8 w-full max-w-[520px]">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          disabled={!playbackState.videoId}
          className="w-16 h-16 rounded-full text-text-secondary hover:text-text-primary hover:bg-card-cozy border border-transparent hover:border-border-cozy active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
        </button>

        {/* Previous Button (SkipBack) */}
        <button
          onClick={handlePrevious}
          disabled={!isHost || playbackState.currentIndex <= 0}
          className="w-16 h-16 rounded-full text-text-secondary hover:text-text-primary hover:bg-card-cozy border border-transparent hover:border-border-cozy active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Previous Song"
        >
          <SkipBack className="w-8 h-8 fill-current" />
        </button>

        {/* Main Play/Pause (Reduced by ~15% from w-24/h-24 to w-20/h-20) */}
        <button
          onClick={togglePlay}
          disabled={!isHost || (queue.length === 0 && !playbackState.videoId)}
          className="w-20 h-20 rounded-full bg-brand hover:bg-brand-hover text-text-primary flex items-center justify-center active:scale-95 transition-all shadow-[0_8px_35px_rgba(28,57,187,0.4)] hover:shadow-[0_10px_40px_rgba(54,88,231,0.5)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          title={playbackState.isPlaying ? "Pause" : "Play"}
        >
          {playbackState.isPlaying ? (
            <Pause className="w-8 h-8 fill-current text-text-primary" />
          ) : (
            <Play className="w-8 h-8 fill-current translate-x-0.5 text-text-primary" />
          )}
        </button>

        {/* Skip Forward */}
        <button
          onClick={handleSkip}
          disabled={!isHost || queue.length <= 1 || playbackState.currentIndex >= queue.length - 1}
          className="w-16 h-16 rounded-full text-text-secondary hover:text-text-primary hover:bg-card-cozy border border-transparent hover:border-border-cozy active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Skip Song"
        >
          <SkipForward className="w-8 h-8 fill-current" />
        </button>
      </div>
    </div>
  );
};
