import React from "react";
import { RoomClient } from "@/components/RoomClient";
import type { Metadata } from "next";

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

// Generate premium, custom metadata for search engines and link previews
export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Listening Lounge: ${id} | SyncBeat`,
    description: "Listen to cozy music together in perfect realtime synchronization.",
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;

  return <RoomClient roomId={id} />;
}
