"use client";

export function FlatCardSkeleton() {
  return (
    <div className="flex p-[16px] flex-col items-center gap-[24px] flex-[1_0_0] rounded-[18px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full h-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col items-start gap-[12px] self-stretch">
        <div className="flex items-center gap-[12px] self-stretch">
          {/* Title */}
          <div className="h-6 flex-1 bg-[#F4F6FB] rounded-[8px]" />
          {/* Tags */}
          <div className="flex gap-[4px]">
            <div className="h-6 w-16 bg-[#F4F6FB] rounded-[16px]" />
            <div className="h-6 w-20 bg-[#F4F6FB] rounded-[16px]" />
          </div>
        </div>
        {/* Address */}
        <div className="h-4 w-3/4 bg-[#F4F6FB] rounded-[4px]" />
      </div>

      {/* Image */}
      <div className="relative h-[205px] w-full flex flex-col justify-center items-center gap-[8px] self-stretch">
        <div className="w-full h-full bg-[#F4F6FB] rounded-[12px]" />
      </div>

      {/* Image indicators */}
      <div className="flex h-[4px] justify-center items-center gap-[9px] self-stretch">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[4px] w-[26px] bg-[#F4F6FB] rounded-full"
          />
        ))}
      </div>

      {/* Price and details */}
      <div className="flex flex-col items-start gap-[12px] self-stretch">
        <div className="flex flex-col items-start gap-[4px] self-stretch">
          {/* Price */}
          <div className="h-7 w-32 bg-[#F4F6FB] rounded-[4px]" />
          {/* Price per m2 */}
          <div className="h-5 w-24 bg-[#F4F6FB] rounded-[4px]" />
        </div>
        {/* Details */}
        <div className="flex items-center gap-[8px] self-stretch">
          <div className="h-5 w-16 bg-[#F4F6FB] rounded-[4px]" />
          <div className="h-1 w-1 bg-[#F4F6FB] rounded-full" />
          <div className="h-5 w-20 bg-[#F4F6FB] rounded-[4px]" />
          <div className="h-1 w-1 bg-[#F4F6FB] rounded-full" />
          <div className="h-5 w-20 bg-[#F4F6FB] rounded-[4px]" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-[4px] self-stretch">
        <div className="flex-1 h-[44px] bg-[#F4F6FB] rounded-[12px]" />
        <div className="w-[44px] h-[44px] bg-[#F4F6FB] rounded-[12px]" />
      </div>
    </div>
  );
}

export function FlatsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[24px] w-full">
      {Array.from({ length: count }).map((_, i) => (
        <FlatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FlatListCardSkeleton() {
  return (
    <div className="flex px-[24px] py-[16px] justify-center items-center gap-[24px] self-stretch rounded-[24px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full animate-pulse">
      {/* Изображение */}
      <div className="w-[110px] h-[100px] flex-shrink-0 bg-[#F4F6FB] rounded-[12px]" />
      
      {/* Контент */}
      <div className="flex flex-col justify-center items-start gap-[8px] flex-[1_0_0]">
        {/* Заголовок и теги */}
        <div className="flex items-center gap-[16px] w-full">
          <div className="h-6 flex-1 bg-[#F4F6FB] rounded-[8px]" />
          <div className="flex items-center gap-[4px]">
            <div className="h-6 w-16 bg-[#F4F6FB] rounded-[16px]" />
            <div className="h-6 w-20 bg-[#F4F6FB] rounded-[16px]" />
          </div>
        </div>
        
        {/* Детали */}
        <div className="flex items-center gap-[24px] self-stretch">
          <div className="flex items-center gap-[4px] flex-[1_0_0] flex-wrap">
            {/* Секция */}
            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
              <div className="h-3 w-12 bg-[#F4F6FB] rounded-[4px] mb-1" />
              <div className="h-5 w-16 bg-[#F4F6FB] rounded-[4px]" />
            </div>
            {/* Подъезд */}
            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
              <div className="h-3 w-16 bg-[#F4F6FB] rounded-[4px] mb-1" />
              <div className="h-5 w-12 bg-[#F4F6FB] rounded-[4px]" />
            </div>
            {/* Этаж */}
            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
              <div className="h-3 w-12 bg-[#F4F6FB] rounded-[4px] mb-1" />
              <div className="h-5 w-12 bg-[#F4F6FB] rounded-[4px]" />
            </div>
            {/* Комнатность */}
            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
              <div className="h-3 w-20 bg-[#F4F6FB] rounded-[4px] mb-1" />
              <div className="h-5 w-16 bg-[#F4F6FB] rounded-[4px]" />
            </div>
            {/* Площадь */}
            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
              <div className="h-3 w-16 bg-[#F4F6FB] rounded-[4px] mb-1" />
              <div className="h-5 w-20 bg-[#F4F6FB] rounded-[4px]" />
            </div>
          </div>
          
          {/* Разделитель */}
          <div className="w-[1px] h-[52px] bg-[#F4F6FB] opacity-20" />
          
          {/* Цена */}
          <div className="flex w-[147px] flex-col justify-center items-start gap-[4px] self-stretch">
            <div className="h-6 w-32 bg-[#F4F6FB] rounded-[4px]" />
            <div className="h-5 w-24 bg-[#F4F6FB] rounded-[4px]" />
          </div>
          
          {/* Кнопки */}
          <div className="flex items-center gap-[4px]">
            <div className="h-[44px] w-[100px] bg-[#F4F6FB] rounded-[12px]" />
            <div className="w-[44px] h-[44px] bg-[#F4F6FB] rounded-[12px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlatsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col items-start gap-[12px] self-stretch w-full">
      {Array.from({ length: count }).map((_, i) => (
        <FlatListCardSkeleton key={i} />
      ))}
    </div>
  );
}
