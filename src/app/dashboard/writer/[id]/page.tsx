import { redirect } from "next/navigation";

type WriterBridgeParams = {
  params: Promise<{ id: string }>;
};

export default async function WriterBridgePage({ params }: WriterBridgeParams) {
  const { id } = await params;
  redirect(`/dashboard/studio?storyId=${encodeURIComponent(id)}`);
}
