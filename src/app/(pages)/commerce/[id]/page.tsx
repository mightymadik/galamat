import { notFound } from "next/navigation";
import { fetchFlatDetailBootstrap } from "@/app/api/properties/detailServer";
import FlatDetailClient from "@/components/layout/flatsPage/FlatsDetailPage/FlatDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const initial = await fetchFlatDetailBootstrap(id, "commerce");
  if (!initial.property) notFound();

  return <FlatDetailClient id={id} realEstateType="commerce" initial={initial} />;
}
