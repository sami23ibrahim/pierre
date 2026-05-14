import Portfolio from "./components/Portfolio";

const VIDEO_IDS = [
  "803985634",  // Heineken
  "1131470962", // Diriyah FC
  "1009764873", // Denner
  "216957056",  // Du
  "898044833",  // L'Occitane
  "682546048",  // Molto Fino
  "695205162",  // Jeep — Rewild Yourself
  "573367624",  // Rolling Stone
  "316674560",  // Diesel
  "223460819",  // Fischer
];

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
  const entries = await Promise.all(
    VIDEO_IDS.map(async (id) => [id, await fetchVimeoThumbnail(id)] as const)
  );
  const thumbnails = Object.fromEntries(entries);

  return <Portfolio thumbnails={thumbnails} />;
}
