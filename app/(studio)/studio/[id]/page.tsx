import { StudioApp } from "@/components/studio/StudioApp";

export default async function StudioDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudioApp documentId={id} />;
}
