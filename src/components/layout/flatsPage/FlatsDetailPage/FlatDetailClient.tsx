"use client";

import type { RealEstateType } from "@/types/flat";
import type { FlatDetailBootstrap } from "@/app/api/properties/detailServer";
import withPreload from "@/components/common/preload/withPreload";
import PayModal from "@/components/common/payModal/payModal";
import FlatsDetailPage from "./flatsDetailPage";

interface FlatDetailClientProps {
  id: string;
  realEstateType: RealEstateType;
  initial: FlatDetailBootstrap;
}

function FlatDetailClient({ id, realEstateType, initial }: FlatDetailClientProps) {
  return (
    <div className="mt-[68px]">
      <FlatsDetailPage id={id} realEstateType={realEstateType} initial={initial} />
      <PayModal id={id} realEstateType={realEstateType} />
    </div>
  );
}

export default withPreload(FlatDetailClient);
