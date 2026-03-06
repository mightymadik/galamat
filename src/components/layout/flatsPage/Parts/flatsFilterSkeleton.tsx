"use client";

export function FlatsFilterSkeleton() {
  return (
    <div className="hidden lg:flex flex-col items-start gap-[24px] self-stretch animate-pulse">
      {/* Selectors and Room Selector Row */}
      <div className="flex h-[62px] justify-center items-start gap-[32px] self-stretch w-full">
        <div className="flex flex-row items-start gap-[32px] flex-[1_0_0] w-full">
          {/* 3 Selectors */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[62px] flex-1 bg-[#F4F6FB] rounded-[12px]"
            />
          ))}
          {/* Room Selector */}
          <div className="h-[62px] w-[200px] bg-[#F4F6FB] rounded-[12px]" />
        </div>
      </div>
      
      {/* Sliders Row */}
      <div className="flex h-[64px] justify-center items-start gap-[32px] self-stretch">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-[64px] bg-[#F4F6FB] rounded-[12px]"
          />
        ))}
      </div>
      
      {/* Actions Row */}
      <div className="flex justify-end items-end gap-[12px] w-full">
        {/* Category Selector */}
        <div className="h-[44px] w-[200px] bg-[#F4F6FB] rounded-[12px]" />
        {/* Reset and Map buttons */}
        <div className="h-[44px] w-[120px] bg-[#F4F6FB] rounded-[12px]" />
        <div className="h-[44px] w-[120px] bg-[#F4F6FB] rounded-[12px]" />
      </div>
    </div>
  );
}

export function MobileFlatsFilterSkeleton() {
  return (
    <div className="lg:hidden flex flex-col items-start gap-[24px] self-stretch animate-pulse">
      {/* Category Selector */}
      <div className="flex items-center gap-2 w-full">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-10 flex-1 bg-[#F4F6FB] rounded-lg"
          />
        ))}
      </div>

      {/* Selectors */}
      <div className="flex flex-col gap-[12px] w-full">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-full bg-[#F4F6FB] rounded-lg"
          />
        ))}
      </div>

      {/* Room Selector */}
      <div className="h-16 w-full bg-[#F4F6FB] rounded-lg" />

      {/* Sliders */}
      <div className="flex flex-col gap-[16px] w-full">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 w-full bg-[#F4F6FB] rounded-lg"
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        <div className="h-11 w-full bg-[#F4F6FB] rounded-lg" />
        <div className="h-11 w-full bg-[#F4F6FB] rounded-lg" />
      </div>
    </div>
  );
}
