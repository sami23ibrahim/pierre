import Portfolio from "./components/Portfolio";
import UnderConstruction from "./components/UnderConstruction";
import { getVideos } from "@/lib/videos";
import type { VideoWithThumbnail } from "@/lib/videos";

// Flip to false to take the portfolio live.
const UNDER_CONSTRUCTION = true;

async function fetchVimeoThumbnail(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=1280`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.thumbnail_url as string) ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  if (UNDER_CONSTRUCTION) return <UnderConstruction />;

  const videos = await getVideos();
  const withThumbnails: VideoWithThumbnail[] = await Promise.all(
    videos.map(async (video) => ({
      ...video,
      thumbnail: await fetchVimeoThumbnail(video.vimeoId),
    }))
  );

  return <Portfolio videos={withThumbnails} />;
}
