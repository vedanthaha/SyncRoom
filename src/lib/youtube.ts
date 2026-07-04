export interface SearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
}

// Curated list of cozy, premium lo-fi and ambient music for zero-setup demo mode
const COZY_DEMO_TRACKS: SearchResult[] = [
  {
    videoId: "jfKfPfyJRdk",
    title: "lofi hip hop radio 📚 - beats to relax/study to",
    thumbnail: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Lofi Girl",
    duration: "Live",
  },
  {
    videoId: "5qap5aO4i9A",
    title: "lofi hip hop radio 🌌 - beats to sleep/chill to",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Lofi Girl",
    duration: "Live",
  },
  {
    videoId: "c0_ejQQcrwI",
    title: "Cozy Rain & Coffee Shop Ambience - Relaxing Jazz Music",
    thumbnail: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Rainy Cafe",
    duration: "3:00:00",
  },
  {
    videoId: "UjZ_Uj-H3tI",
    title: "Cozy Acoustic Guitar - Calm & Peaceful Instrumental Music",
    thumbnail: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Acoustic Vibes",
    duration: "2:30:15",
  },
  {
    videoId: "811a-Z5c14M",
    title: "Late Night Jazz - Slow Piano Jazz for Cozy Evening",
    thumbnail: "https://images.unsplash.com/photo-1487180142328-054b783fc471?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Cafe Music BGM channel",
    duration: "4:00:00",
  },
  {
    videoId: "4xDzrJKXOOY",
    title: "Chill Synthwave Beats - Retro Sunset Driving Music",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Synth City",
    duration: "1:20:00",
  },
  {
    videoId: "L_LUpnjgPso",
    title: "Cozy Christmas Fireplace 4K - Warm Hearth Sounds",
    thumbnail: "https://images.unsplash.com/photo-1545224497-5d750c680986?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Fireplace Cinema",
    duration: "8:00:00",
  },
  {
    videoId: "DWcJFNfaw9c",
    title: "Ghibli Music Instrumentals - Relaxing Studio Ghibli Piano",
    thumbnail: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&q=80&w=400",
    channelTitle: "Anime Piano Room",
    duration: "2:00:00",
  }
];

export const searchYouTube = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim().length === 0) {
    return COZY_DEMO_TRACKS;
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      throw new Error(`Scraper API returned status ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (error) {
    console.error("Error searching YouTube via scraper:", error);
  }

  // Fall back to filtered demo list on error or empty results
  const lowerQuery = query.toLowerCase();
  const filtered = COZY_DEMO_TRACKS.filter(
    (track) =>
      track.title.toLowerCase().includes(lowerQuery) ||
      track.channelTitle.toLowerCase().includes(lowerQuery)
  );
  return filtered.length > 0 ? filtered : COZY_DEMO_TRACKS.slice(0, 4);
};

// Simple HTML entity decoder
function decodeHtmlEntities(text: string): string {
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = text;
    return el.textContent || text;
  }
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
