import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get("roomCode");
  const userId = searchParams.get("userId");
  const userName = searchParams.get("userName");

  if (!roomCode || !supabase) {
    return NextResponse.json({ error: "Missing parameters or Supabase not configured" }, { status: 400 });
  }

  try {
    // 1. Fetch or create room
    let { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .maybeSingle();

    if (roomError) {
      console.error("Error fetching room:", roomError);
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    if (!room) {
      const { data: newRoom, error: createError } = await supabase
        .from("rooms")
        .insert([{ room_code: roomCode }])
        .select("*")
        .maybeSingle();

      if (createError) {
        console.error("Error creating room:", createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      room = newRoom;
    }

    const roomId = room.id;

    // 2. Fetch queue
    const { data: queueData, error: queueError } = await supabase
      .from("queue")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (queueError) {
      console.error("Queue fetch error:", queueError);
    }

    const parsedQueue = (queueData || []).map((q: any) => ({
      id: q.id,
      videoId: q.video_id,
      title: q.title,
      thumbnail: q.thumbnail,
      duration: q.duration,
      addedBy: q.added_by,
    }));

    // 3. Return response
    return NextResponse.json({
      dbRoomId: roomId,
      playbackState: room.playback_state || {
        videoId: null,
        isPlaying: false,
        currentTime: 0,
        lastUpdated: 0,
      },
      queue: parsedQueue,
    });

  } catch (err: any) {
    console.error("Sync API unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, dbRoomId, payload } = body;

    if (!dbRoomId) {
      return NextResponse.json({ error: "Missing dbRoomId" }, { status: 400 });
    }

    switch (action) {
      case "playback_change": {
        const { error } = await supabase
          .from("rooms")
          .update({ playback_state: payload })
          .eq("id", dbRoomId);

        if (error) {
          console.error("Error updating playback state:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case "queue_add": {
        const { videoId, title, thumbnail, duration, addedBy } = payload;
        const { error } = await supabase
          .from("queue")
          .insert([{
            room_id: dbRoomId,
            video_id: videoId,
            title: title,
            thumbnail: thumbnail,
            duration: duration,
            added_by: addedBy,
          }]);

        if (error) {
          console.error("Error adding to queue:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case "queue_remove": {
        const { itemId } = payload;
        const { error } = await supabase
          .from("queue")
          .delete()
          .eq("id", itemId);

        if (error) {
          console.error("Error removing from queue:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case "queue_clear": {
        const { error } = await supabase
          .from("queue")
          .delete()
          .eq("room_id", dbRoomId);

        if (error) {
          console.error("Error clearing queue:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case "member_leave": {
        const { userId } = payload;
        const { error } = await supabase
          .from("members")
          .delete()
          .eq("room_id", dbRoomId)
          .eq("user_id", userId);

        if (error) {
          console.error("Error removing leaving member:", error);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Sync POST unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
