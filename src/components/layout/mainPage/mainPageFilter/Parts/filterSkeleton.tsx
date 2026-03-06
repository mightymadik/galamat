"use client";

export function FilterSkeleton() {
  return (
    <div className="mainContainer hidden lg:!flex flex-col items-start self-stretch gap-[24px]">
      {/* Category Selector Skeleton */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-10 w-24 bg-[#F4F6FB] rounded-lg animate-pulse"
          />
        ))}
      </div>

      {/* Selectors Skeleton */}
      <div className="mainPageFilterSelectors flex h-16 justify-center items-start gap-[32px]">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-full bg-[#F4F6FB] rounded-lg animate-pulse"
          />
        ))}
      </div>

      {/* Sliders Skeleton */}
      <div className="mainPageFilterSlides flex h-16 justify-center items-start gap-[32px] w-full">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-16 bg-[#F4F6FB] rounded-lg animate-pulse"
          />
        ))}
      </div>

      {/* Actions Skeleton */}
      <div className="mainPageFilterResults hidden lg:flex justify-end items-end gap-3 w-full">
        <div className="h-11 w-32 bg-[#F4F6FB] rounded-lg animate-pulse" />
        <div className="h-11 w-48 bg-[#F4F6FB] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function MobileFilterSkeleton() {
  return (
    <div className="mobileFilter overflow-y-auto fixed flex flex-col items-start left-0 bottom-0 w-full bg-white rounded-t-2xl shadow-2xl z-40 translate-y-0">
      <div className="mobileFilterBodyContainer flex w-full px-[16px] py-[24px] flex-col items-start gap-[10px]">
        {/* Header Skeleton */}
        <div className="mobileFilterTitle w-full justify-between flex items-start gap-[32px] self-stretch">
          <div className="h-6 w-20 bg-[#F4F6FB] rounded animate-pulse" />
          <div className="h-8 w-8 bg-[#F4F6FB] rounded-full animate-pulse" />
        </div>

        {/* Category Skeleton */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 w-20 bg-[#F4F6FB] rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Selectors Skeleton */}
        <div className="mobileSelectors flex flex-col justify-center items-start gap-[12px] self-stretch">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 w-full bg-[#F4F6FB] rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Sliders Skeleton */}
        <div className="mobileSliders w-full">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 w-full bg-[#F4F6FB] rounded-lg animate-pulse mb-4"
            />
          ))}
        </div>

        {/* Actions Skeleton */}
        <div className="mobileFilterResults flex flex-col gap-3 w-full pb-[80px]">
          <div className="h-11 w-full bg-[#F4F6FB] rounded-lg animate-pulse" />
          <div className="h-11 w-full bg-[#F4F6FB] rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
