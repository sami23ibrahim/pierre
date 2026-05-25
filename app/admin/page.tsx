import { getVideos } from "@/lib/videos";
import AdminEditor from "@/app/components/AdminEditor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const videos = await getVideos();
  return <AdminEditor initialVideos={videos} />;
}
