"use server";

import { revalidatePath } from "next/cache";
import { prepareVideos, saveVideos } from "@/lib/videos";
import type { DraftVideo, PrepareResult } from "@/lib/videos";

export async function saveVideosAction(
  drafts: DraftVideo[],
): Promise<PrepareResult> {
  const result = prepareVideos(drafts);
  if (!result.ok) return result;

  await saveVideos(result.videos);
  revalidatePath("/");
  return result;
}
