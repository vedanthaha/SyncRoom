import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get("roomCode");

  if (!roomCode || !supabase) {
    return NextResponse.json({ error: "Missing roomCode or Supabase not configured" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", roomCode.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("DB error checking room:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exists: !!data });
  } catch (err: any) {
    console.error("Unexpected error checking room:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const { roomCode } = await request.json();
    if (!roomCode) {
      return NextResponse.json({ error: "Missing roomCode" }, { status: 400 });
    }

    const cleanCode = roomCode.toLowerCase().trim();

    // Check if it already exists
    const { data: existing, error: checkError } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", cleanCode)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking room duplication:", checkError);
    }

    if (existing) {
      return NextResponse.json({ success: true, id: existing.id, message: "Room already exists" });
    }

    const { data: newRoom, error: createError } = await supabase
      .from("rooms")
      .insert([{ room_code: cleanCode }])
      .select("id")
      .maybeSingle();

    if (createError) {
      console.error("Error creating room:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: newRoom?.id });
  } catch (err: any) {
    console.error("Unexpected error creating room:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
