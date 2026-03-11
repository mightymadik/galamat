"use client";

/**
 * Queue list shown when status is "available": next client and following clients.
 * Data is currently mock; can be wired to API later.
 */
export default function QueueNextClientsList() {
  return (
    <div className="flex h-full p-[16px] flex-col items-start gap-[16px] self-stretch rounded-[16px] bg-[#F4F6FB]">
      <div className="flex justify-between items-end self-stretch">
        <p className="text-[#2C2D31] text-[14.956px] not-italic font-normal leading-[12px] opacity-40">
          ФИО
        </p>
        <p className="text-[#2C2D31] text-[14.956px] not-italic font-normal leading-[12px] opacity-40">
          Талон №
        </p>
      </div>
      <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch rounded-[4px]">
        <div className="flex flex-col items-start flex-[1_0_0] self-stretch rounded-[8px] bg-[#FFF]">
          <div className="flex px-[16px] py-[8px] justify-between items-center self-stretch rounded-[8px] [border-bottom:1px_solid_rgba(19,_44,_94,_0.07)] bg-[rgba(38,_85,_175,_0.24)]">
            <div className="flex flex-col justify-center items-start flex-[1_0_0] rounded-[8px]">
              <p className="text-[#132C5E] text-[14px] not-italic font-bold leading-[24px]">
                Следующий (-ая)
              </p>
              <span className="text-[#132C5E] text-[20px] not-italic font-normal leading-[24px]">
                Айымгүл Нұрсұлтанова Жанарбекқызы
              </span>
            </div>
          </div>
          <div className="flex px-[16px] py-[8px] justify-between items-center self-stretch [border-bottom:1px_solid_rgba(19,_44,_94,_0.07)]">
            <div className="flex flex-col justify-center items-start flex-[1_0_0] rounded-[8px]">
              <span className="text-[#132C5E] text-[20px] not-italic font-normal leading-[24px]">
                Ерлан Тұрарбеков Сейітбекұлы
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
