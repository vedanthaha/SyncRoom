"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  addedBy: string;
}

export interface PlaybackState {
  videoId: string | null;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
  triggeredBy?: string;
}

export interface Member {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

interface SyncContextType {
  roomId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  isSupabase: boolean;
  members: Member[];
  queue: QueueItem[];
  playbackState: PlaybackState;
  setUserName: (name: string) => void;
  updatePlaybackState: (state: Partial<PlaybackState>) => void;
  addToQueue: (video: Omit<QueueItem, "id" | "addedBy">) => void;
  removeFromQueue: (itemId: string) => void;
  clearQueue: () => void;
  joinRoom: (name: string) => void;
  hasJoined: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 9);

export const SyncProvider: React.FC<{ roomId: string; children: React.ReactNode }> = ({ roomId, children }) => {
  const [userId, setUserId] = useState("");
  const [userName, setUserNameState] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [joinedAt, setJoinedAt] = useState<number>(0);
  const [dbRoomId, setDbRoomId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  // Set initial supabase client from static instance if available
  useEffect(() => {
    if (supabase) {
      setSupabaseClient(supabase);
    }
  }, []);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    videoId: null,
    currentIndex: 0,
    isPlaying: false,
    currentTime: 0,
    lastUpdated: 0,
  });

  const queueRef = useRef<QueueItem[]>([]);
  const playbackStateRef = useRef<PlaybackState>(playbackState);
  const membersRef = useRef<Member[]>([]);
  const channelRef = useRef<any>(null);

  // Initialize client state safely to avoid hydration mismatches
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedId = localStorage.getItem("syncbeat_user_id");
      if (!storedId) {
        storedId = generateId();
        localStorage.setItem("syncbeat_user_id", storedId);
      }
      setUserId(storedId);

      // Check if user has joined THIS specific room before
      const storedRoomJoin = localStorage.getItem(`syncbeat_room_${roomId}_joined`);
      const storedName = localStorage.getItem(`syncbeat_room_${roomId}_name`) || "";
      const storedJoinedAt = localStorage.getItem(`syncbeat_room_${roomId}_joined_at`);

      if (storedRoomJoin === "true" && storedName && storedJoinedAt) {
        setUserNameState(storedName);
        setJoinedAt(parseInt(storedJoinedAt, 10));
        setHasJoined(true);
      }
    }
  }, [roomId]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const isHost =
    members.length <= 1
      ? true
      : [...members].sort((a, b) => a.joinedAt - b.joinedAt)[0]?.id === userId;
  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const setUserName = (name: string) => {
    setUserNameState(name);
    if (typeof window !== "undefined") {
      localStorage.setItem(`syncbeat_room_${roomId}_name`, name);
    }
  };

  // Fetch queue and room status from PostgreSQL
  const fetchQueue = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(
        `/api/sync?roomCode=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.dbRoomId) {
          setDbRoomId(data.dbRoomId);
        }
        if (data.queue) {
          const localQueueIds = queueRef.current.map((q) => q.id).join(",");
          const remoteQueueIds = data.queue.map((q: any) => q.id).join(",");
          if (localQueueIds !== remoteQueueIds) {
            setQueue(data.queue);
          }
        }
        // Initialize playbackState if nothing is loaded yet
        if (data.playbackState && !playbackStateRef.current.videoId && data.playbackState.videoId) {
          setPlaybackState((prev) => ({
            ...prev,
            ...data.playbackState,
          }));
        }

        // Dynamically initialize Supabase client if it's null on the client-side
        if (data.supabaseUrl && data.supabaseAnonKey && !supabaseClient) {
          const { createClient } = await import("@supabase/supabase-js");
          const client = createClient(data.supabaseUrl, data.supabaseAnonKey, {
            auth: {
              persistSession: false,
            },
          });
          setSupabaseClient(client);
        }
      }
    } catch (err) {
      console.error("Error fetching queue:", err);
    }
  };

  // Poll database on a slower interval as a fallback
  useEffect(() => {
    if (!hasJoined || !roomId || !userId || !userName) return;
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [hasJoined, roomId, userId, userName]);

  // Supabase Broadcast & Presence Initialization
  useEffect(() => {
    console.log('🔍 Supabase Effect Check:', {
      hasJoined,
      roomId,
      hasSupabaseClient: !!supabaseClient,
      userId,
      userName,
      joinedAt
    });

    if (!hasJoined || !roomId || !supabaseClient || !userId || !userName || !joinedAt) {
      console.log('❌ Supabase effect skipped - missing dependencies');
      return;
    }

    console.log('✅ Initializing Supabase channel...');
    const cleanRoomCode = roomId.toLowerCase().trim();
    const channel = supabaseClient.channel(`room:${cleanRoomCode}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });
    console.log('📡 Channel created:', `room:${cleanRoomCode}`);

    // Listen to live playback broadcast changes
    channel.on("broadcast", { event: "playback" }, ({ payload }: { payload: any }) => {
      console.log('📺 Received playback broadcast:', payload);
      console.log('📺 Current isHost:', isHostRef.current);
      console.log('📺 Current playback state:', playbackStateRef.current);

      if (!isHostRef.current) {
        console.log('✅ Applying playback state (guest)');
        setPlaybackState(payload);
      } else {
        console.log('⏭️ Skipping playback update (host)');
      }
    });

    // Listen to live playback sync requests (host responds with state)
    channel.on("broadcast", { event: "request_sync" }, () => {
      if (isHostRef.current && playbackStateRef.current.videoId) {
        channel.send({
          type: "broadcast",
          event: "playback",
          payload: playbackStateRef.current,
        });
      }
    });

    // Listen to queue changes broadcast
    channel.on("broadcast", { event: "queue_change" }, () => {
      fetchQueue();
    });

    // Listen to presence events
    channel
      .on("presence", { event: "sync" }, () => {
        console.log('🔄 Presence sync event fired');
        const presenceState = channel.presenceState();
        console.log('👥 Presence state:', presenceState);
        const activeMembers: Member[] = [];

        Object.keys(presenceState).forEach((key) => {
          const presences = presenceState[key] as any[];
          console.log(`Processing presence key: ${key}`, presences);
          presences.forEach((p) => {
            activeMembers.push({
              id: p.clientId || p.userId || key,
              name: p.nickname || p.userName || "Guest",
              isHost: false, // determined dynamically
              joinedAt: p.joinedAt || Date.now(),
            });
          });
        });

        console.log('👥 Active members before sorting:', activeMembers);

        // Determine host by oldest member
        const sorted = activeMembers.sort((a, b) => a.joinedAt - b.joinedAt);
        if (sorted.length > 0) {
          sorted.forEach((m, idx) => {
            m.isHost = idx === 0;
          });
        }
        console.log('👥 Final members list:', sorted);
        setMembers(sorted);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }: { key: string; newPresences: any[] }) => {
        console.log('➕ User joined:', key, newPresences);
        // If we are host, broadcast our current state to new joins
        if (isHostRef.current && playbackStateRef.current.videoId) {
          channel.send({
            type: "broadcast",
            event: "playback",
            payload: playbackStateRef.current,
          });
        }
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }: { key: string; leftPresences: any[] }) => {
        console.log('➖ User left:', key, leftPresences);
      });

    channel.subscribe(async (status: string) => {
      console.log('📡 Channel subscription status:', status);
      if (status === "SUBSCRIBED") {
        const trackData = {
          clientId: userId,
          nickname: userName,
          joinedAt: joinedAt,
          isHost: isHostRef.current,
        };
        console.log('📤 Tracking presence with data:', trackData);
        const trackResult = await channel.track(trackData);
        console.log('✅ Track result:', trackResult);

        // Request current playback state from host
        channel.send({
          type: "broadcast",
          event: "request_sync",
          payload: { userId },
        });
        console.log('📤 Sent request_sync broadcast');
      }
    });

    channelRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up Supabase channel');
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [hasJoined, roomId, supabaseClient, userId, userName, joinedAt]);

  const joinRoom = (name: string) => {
    const timestamp = Date.now();
    console.log('🚪 Joining room:', { name, timestamp, roomId });
    setUserName(name);
    setJoinedAt(timestamp);
    setHasJoined(true);

    if (typeof window !== "undefined") {
      localStorage.setItem(`syncbeat_room_${roomId}_joined`, "true");
      localStorage.setItem(`syncbeat_room_${roomId}_name`, name);
      localStorage.setItem(`syncbeat_room_${roomId}_joined_at`, timestamp.toString());
    }
    console.log('✅ Room join complete');
  };

  const updatePlaybackState = async (state: Partial<PlaybackState>) => {
    const newState: PlaybackState = {
      ...playbackStateRef.current,
      ...state,
      lastUpdated: Date.now(),
      triggeredBy: userId,
    };

    console.log('🎬 updatePlaybackState called:', state);
    console.log('🎬 New state:', newState);
    console.log('🎬 Channel exists:', !!channelRef.current);

    setPlaybackState(newState);

    // 1. Broadcast the change immediately via Supabase Broadcast
    if (channelRef.current) {
      console.log('📤 Broadcasting playback change...');
      channelRef.current.send({
        type: "broadcast",
        event: "playback",
        payload: newState,
      });
      console.log('✅ Broadcast sent');
    } else {
      console.warn('❌ No channel available to broadcast');
    }

    // 2. Persist to PostgreSQL (excluding timestamps)
    const isStateChanged = 
      state.videoId !== undefined || 
      state.currentIndex !== undefined || 
      state.isPlaying !== undefined;

    if (dbRoomId && isStateChanged) {
      try {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "playback_change",
            dbRoomId,
            payload: {
              videoId: newState.videoId,
              currentIndex: newState.currentIndex,
              isPlaying: newState.isPlaying,
              currentTime: 0, // Never store playback timestamps in PostgreSQL
              lastUpdated: Date.now(),
            },
          }),
        });
      } catch (err) {
        console.error("Failed to update playback state on server:", err);
      }
    }
  };

  const addToQueue = async (video: Omit<QueueItem, "id" | "addedBy">) => {
    const payload = {
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.duration,
      addedBy: userName || "Guest",
    };

    // Optimistic UI Update
    const tempItem: QueueItem = {
      ...video,
      id: `temp-${Date.now()}`,
      addedBy: userName || "Guest",
    };
    const newQueue = [...queueRef.current, tempItem];
    setQueue(newQueue);

    // If nothing was playing, start playing this newly added track immediately!
    const wasIdle = !playbackStateRef.current.videoId;
    if (wasIdle) {
      const initialPlayback = {
        videoId: video.videoId,
        currentIndex: newQueue.length - 1,
        isPlaying: true,
        currentTime: 0,
        lastUpdated: Date.now(),
      };
      setPlaybackState(initialPlayback);
      
      // Broadcast playback immediately
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "playback",
          payload: initialPlayback,
        });
      }

      if (dbRoomId) {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "playback_change",
            dbRoomId,
            payload: {
              videoId: initialPlayback.videoId,
              currentIndex: initialPlayback.currentIndex,
              isPlaying: initialPlayback.isPlaying,
              currentTime: 0,
              lastUpdated: Date.now(),
            },
          }),
        }).catch(console.error);
      }
    }

    if (dbRoomId) {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "queue_add",
            dbRoomId,
            payload,
          }),
        });
        if (res.ok) {
          // Broadcast queue change to others
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "queue_change",
              payload: {},
            });
          }
          fetchQueue();
        }
      } catch (err) {
        console.error("Failed to add to queue:", err);
      }
    }
  };

  const removeFromQueue = async (itemId: string) => {
    const newQueue = queueRef.current.filter((item) => item.id !== itemId);
    setQueue(newQueue);

    // If the removed item was currently playing, handle loading the next one
    const currentPlayingItem = queueRef.current[playbackStateRef.current.currentIndex];
    if (currentPlayingItem && currentPlayingItem.id === itemId) {
      const nextIndex = playbackStateRef.current.currentIndex; // Index remains same but points to next item now
      let nextPlayback: PlaybackState;
      if (nextIndex < newQueue.length) {
        nextPlayback = {
          videoId: newQueue[nextIndex].videoId,
          currentIndex: nextIndex,
          isPlaying: true,
          currentTime: 0,
          lastUpdated: Date.now(),
        };
      } else {
        nextPlayback = {
          videoId: null,
          currentIndex: 0,
          isPlaying: false,
          currentTime: 0,
          lastUpdated: Date.now(),
        };
      }

      setPlaybackState(nextPlayback);

      // Broadcast playback change
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "playback",
          payload: nextPlayback,
        });
      }

      if (dbRoomId) {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "playback_change",
            dbRoomId,
            payload: {
              videoId: nextPlayback.videoId,
              currentIndex: nextPlayback.currentIndex,
              isPlaying: nextPlayback.isPlaying,
              currentTime: 0,
              lastUpdated: Date.now(),
            },
          }),
        }).catch(console.error);
      }
    }

    if (dbRoomId) {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "queue_remove",
            dbRoomId,
            payload: { itemId },
          }),
        });
        if (res.ok) {
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "queue_change",
              payload: {},
            });
          }
          fetchQueue();
        }
      } catch (err) {
        console.error("Failed to remove from queue:", err);
      }
    }
  };

  const clearQueue = async () => {
    setQueue([]);
    const nextPlayback = {
      videoId: null,
      currentIndex: 0,
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
    };
    setPlaybackState(nextPlayback);

    // Broadcast playback change
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "playback",
        payload: nextPlayback,
      });
    }

    if (dbRoomId) {
      try {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "queue_clear",
            dbRoomId,
          }),
        });
        
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "playback_change",
            dbRoomId,
            payload: {
              videoId: nextPlayback.videoId,
              currentIndex: nextPlayback.currentIndex,
              isPlaying: nextPlayback.isPlaying,
              currentTime: 0,
              lastUpdated: Date.now(),
            },
          }),
        });

        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "queue_change",
            payload: {},
          });
        }
      } catch (err) {
        console.error("Failed to clear queue:", err);
      }
    }
  };

  return (
    <SyncContext.Provider
      value={{
        roomId,
        userId,
        userName,
        isHost,
        isSupabase: !!supabaseClient,
        members,
        queue,
        playbackState,
        setUserName,
        updatePlaybackState,
        addToQueue,
        removeFromQueue,
        clearQueue,
        joinRoom,
        hasJoined,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
