"use client";

export function ProjectCardSkeleton() {
  return (
    <div className="projectItem flex flex-col items-start gap-[16px] self-stretch">
      {/* Image Skeleton */}
      <div className="projectItemImageContainer flex w-full h-[322px] rounded-[32px] bg-[#F4F6FB] animate-pulse" />

      {/* Content Skeleton */}
      <div className="projectItemHeadingItem flex w-full flex-col items-start gap-[12px]">
        <div className="flex items-center self-stretch">
          <div className="flex py-[12px] flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
            {/* Title Skeleton */}
            <div className="h-7 w-full bg-[#F4F6FB] rounded animate-pulse mb-2" />
            {/* Address Skeleton */}
            <div className="h-4 w-full bg-[#F4F6FB] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsGridSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </>
  );
}
