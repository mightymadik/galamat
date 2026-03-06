"use client";

import { useRouter } from "next/navigation";
import FlatsPageFilter from "@/components/layout/flatsPage/FlatsPageFilterContainer/flatsPageFilterContainer";
import { flattenFilterParamsToSearchParams } from "@/lib/flatsFilterUrl";
import { FlatsFilterParams } from "@/types/flat";

interface ProjectPageFlatsFilterProps {
  /** Pre-select this project (complex name) when on project detail page */
  initialProject?: string;
}

export default function ProjectPageFlatsFilter({ initialProject }: ProjectPageFlatsFilterProps) {
  const router = useRouter();

  const handleSubmit = (params: FlatsFilterParams) => {
    const qs = flattenFilterParamsToSearchParams(params).toString();
    router.push(qs ? `/flats?${qs}` : "/flats");
  };

  return (
    <FlatsPageFilter
      initialFilterParams={initialProject ? { project: initialProject } : undefined}
      onSubmit={handleSubmit}
    />
  );
}
