import { NextResponse } from "next/server";

function parseISO8601Duration(isoDuration: string): string {
  if (isoDuration === "P0D" || isoDuration === "PT0S" || isoDuration.toLowerCase() === "live") return "Live";
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "3:30";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      // 1. Search for video IDs
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const errorData = await searchRes.json().catch(() => ({}));
        console.error("YouTube Data API Search error:", errorData);
        throw new Error("Failed YouTube search API call");
      }

      const searchData = await searchRes.json();
      const items = searchData.items || [];
      if (items.length === 0) {
        return NextResponse.json([]);
      }

      const videoIds = items.map((item: any) => item.id?.videoId).filter(Boolean);
      if (videoIds.length === 0) {
        return NextResponse.json([]);
      }

      // 2. Fetch video details to get durations
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`;
      const videosRes = await fetch(videosUrl);
      if (!videosRes.ok) {
        throw new Error("Failed YouTube videos API call");
      }

      const videosData = await videosRes.json();
      const videoItems = videosData.items || [];

      const parsedResults = videoItems.map((video: any) => {
        const videoId = video.id;
        const snippet = video.snippet || {};
        const contentDetails = video.contentDetails || {};

        const title = snippet.title || "Unknown Title";
        const channelTitle = snippet.channelTitle || "Unknown Channel";
        const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "";
        const isLive = snippet.liveBroadcastContent === "live";
        const duration = isLive ? "Live" : parseISO8601Duration(contentDetails.duration || "PT3M30S");

        return {
          videoId,
          title,
          thumbnail,
          channelTitle,
          duration,
        };
      });

      return NextResponse.json(parsedResults);
    } catch (apiError) {
      console.error("YouTube Data API query failed, falling back to scraper:", apiError);
    }
  }

  // Fallback: HTML Scraper
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch from YouTube scraper" }, { status: 500 });
    }

    const html = await response.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});/);
    if (!match) {
      return NextResponse.json([]);
    }

    const ytData = JSON.parse(match[1]);

    const videoRenderers: any[] = [];
    const searchNode = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (node.videoRenderer) {
        videoRenderers.push(node.videoRenderer);
        return;
      }
      for (const key in node) {
        searchNode(node[key]);
      }
    };
    searchNode(ytData);

    const parsedResults = videoRenderers.slice(0, 8).map((video: any) => {
      const title = video.title?.runs?.[0]?.text || "Unknown Song";
      const channelTitle = video.ownerText?.runs?.[0]?.text || video.longBylineText?.runs?.[0]?.text || "Unknown Channel";
      const videoId = video.videoId || "";
      const thumbnail = video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url || "";
      const duration = video.lengthText?.simpleText || (video.badges?.some((b: any) => b.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW") ? "Live" : "3:30");

      return {
        videoId,
        title,
        thumbnail,
        channelTitle,
        duration,
      };
    });

    return NextResponse.json(parsedResults);
  } catch (error) {
    console.error("YouTube search scraping failed:", error);
    return NextResponse.json([]);
  }
}
