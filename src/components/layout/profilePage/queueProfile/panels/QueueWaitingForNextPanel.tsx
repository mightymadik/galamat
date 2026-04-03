"use client";

import { useTranslations } from "next-intl";

/**
 * Показывается после перенаправления или завершения обслуживания:
 * данные клиента на подходе, без блока «История обращений».
 */
export default function QueueWaitingForNextPanel() {
  const t = useTranslations();
  return (
    <div className="flex w-full pl-[24px] pr-[24px] py-[32px] flex-col items-start gap-[32px] flex-[1_0_0]">
      <div className="flex items-center gap-[25px] self-stretch">
        <div className="flex pt-[16px] items-end gap-[8px] flex-[1_0_0] [border-top:5px_solid_#2655AF]">
          <span className="text-[#1E1E1E] text-[24px] not-italic font-medium leading-[24px]">{t("queue_tab_call")}</span>
        </div>
        <div className="flex pt-[16px] items-end gap-[8px] flex-[1_0_0] [border-top:5px_solid_rgba(38,_85,_175,_0.50)]">
          <span className="text-[rgba(30,_30,_30,_0.50)] text-[24px] not-italic font-medium leading-[24px]">{t("queue_tab_attendance")}</span>
        </div>
        <div className="flex pt-[16px] items-end gap-[8px] flex-[1_0_0] [border-top:5px_solid_rgba(38,_85,_175,_0.50)]">
          <span className="text-[rgba(30,_30,_30,_0.50)] text-[24px] not-italic font-medium leading-[24px]">{t("queue_tab_data")}</span>
        </div>
      </div>

      <div className="flex flex-col items-start gap-[24px] self-stretch">
        <div className="flex flex-col pt-[24px] pr-[32px] pb-[32px] pl-[24px] items-center gap-[8px] self-stretch rounded-[24px] bg-[#FFF]">
          <div className="flex items-center gap-[16px] self-stretch">
            <div className="flex items-center justify-center">
              <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <path d="M46.7126 63.0663L46.6932 63.3427C46.6887 64.9099 46.6864 65.6934 46.1986 66.1799C45.7107 66.6663 44.9271 66.6663 43.3599 66.6663H33.317C20.7149 66.6663 14.4139 66.6663 10.4989 62.7611C7.80336 60.0722 6.96376 56.255 6.70225 50.0348C6.65039 48.8012 6.62446 48.1844 6.85481 47.7729C7.08515 47.3614 8.00477 46.8479 9.84393 45.8208C11.8865 44.6802 13.2672 42.5008 13.2672 39.9997C13.2672 37.4986 11.8865 35.3192 9.84393 34.1785C8.00475 33.1515 7.08515 32.6379 6.85481 32.2264C6.62446 31.8149 6.65039 31.1981 6.70225 29.9646C6.96376 23.7443 7.80336 19.9271 10.4989 17.2383C14.4139 13.333 20.7149 13.333 33.317 13.333H45.0176C45.9385 13.333 46.6857 14.0763 46.6884 14.9948L46.7126 16.933C46.7126 18.774 48.2087 20.2663 50.0543 20.2663C51.8998 20.2663 53.3959 18.774 53.3959 16.933V15.0536C53.3959 14.1236 54.1609 13.372 55.0929 13.396C62.3177 13.5824 66.576 14.3198 69.5017 17.2383C72.1973 19.9271 73.0369 23.7443 73.2984 29.9646C73.3503 31.1981 73.3762 31.8149 73.1458 32.2264C72.9155 32.6379 71.9959 33.1515 70.1567 34.1785C68.1141 35.3192 66.7334 37.4986 66.7334 39.9997C66.7334 42.5008 68.1141 44.6802 70.1567 45.8208C71.9959 46.8479 72.9155 47.3614 73.1458 47.7729C73.3762 48.1844 73.3503 48.8012 73.2984 50.0348C73.0369 56.255 72.1973 60.0722 69.5017 62.7611C66.8113 65.4449 62.9939 66.2843 56.7791 66.5468C55.208 66.6132 54.4225 66.6464 53.9092 66.1543C53.3959 65.6623 53.3959 64.8597 53.3959 63.2546V63.0663C53.3959 61.2254 51.8998 59.733 50.0543 59.733C48.2087 59.733 46.7126 61.2254 46.7126 63.0663Z" fill="#DB1D31" />
                </svg>
                <span className="absolute text-[#FFF] font-[Gotham] text-[18px] not-italic font-medium leading-[100%]">
                  —
                </span>
              </div>
            </div>
            <span className="flex-[1_0_0] text-[#1A3C7E] text-[20px] not-italic font-normal leading-[28px]">
              {t("queue_waiting_for_next_title")}
            </span>
          </div>

          <div className="flex flex-wrap items-start gap-[16px] self-stretch">
            <div className="flex p-[12px] flex-col justify-between items-start flex-[1_0_0] self-stretch rounded-[12px] bg-[#F3F5F8]">
              <div className="flex items-center gap-[8px] self-stretch">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <g opacity="0.8">
                    <path d="M10 7.5V10.8333L12.0833 12.9167" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.91699 3.75033L6.25034 1.66699" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17.0833 3.75033L13.75 1.66699" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6.25 4.33637C7.35315 3.69824 8.63392 3.33301 10 3.33301C14.1421 3.33301 17.5 6.69087 17.5 10.833C17.5 14.9751 14.1421 18.333 10 18.333C5.85786 18.333 2.5 14.9751 2.5 10.833C2.5 9.46693 2.86523 8.18616 3.50337 7.08301" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                </svg>
                <span className="flex-[1_0_0] text-[#282D3C] text-[12px] not-italic font-medium leading-[16px]">
                  {t("queue_waiting_time")}
                </span>
              </div>
              {/* Пока клиент не вызван, время ожидания не тикает */}
              <span className="text-[#000] text-[16px] not-italic font-bold leading-[normal]">
                0м 0с
              </span>
            </div>

            <div className="flex p-[12px] flex-col justify-between items-start flex-[1_0_0] self-stretch rounded-[12px] bg-[#F3F5F8]">
              <div className="flex items-center gap-[8px] self-stretch">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <g opacity="0.8">
                    <path d="M10 7.5V10.8333L12.0833 12.9167" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.91699 3.75033L6.25034 1.66699" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17.0833 3.75033L13.75 1.66699" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6.25 4.33637C7.35315 3.69824 8.63392 3.33301 10 3.33301C14.1421 3.33301 17.5 6.69087 17.5 10.833C17.5 14.9751 14.1421 18.333 10 18.333C5.85786 18.333 2.5 14.9751 2.5 10.833C2.5 9.46693 2.86523 8.18616 3.50337 7.08301" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                </svg>
                <span className="flex-[1_0_0] text-[#282D3C] text-[12px] not-italic font-medium leading-[16px]">
                  {t("queue_service_time")}
                </span>
              </div>
              {/* Обслуживание начнётся только после нажатия "начать обслуживание" */}
              <span className="text-[#000] text-[16px] not-italic font-bold leading-[normal]">
                0м 0с
              </span>
            </div>

            <div className="flex p-[12px] flex-col justify-between items-start flex-[1_0_0] self-stretch rounded-[12px] bg-[#F3F5F8]">
              <div className="flex items-center gap-[8px] self-stretch">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <g opacity="0.8">
                    <path fillRule="evenodd" clipRule="evenodd" d="M9.95266 1.04199H10.0467C11.5782 1.04198 12.7912 1.04197 13.7405 1.1696C14.7175 1.30096 15.5083 1.57773 16.132 2.20136C16.7556 2.825 17.0324 3.61579 17.1637 4.59281C17.2914 5.54215 17.2914 6.75518 17.2913 8.28665V11.714C17.2914 13.2455 17.2914 14.4585 17.1637 15.4078C17.0324 16.3849 16.7556 17.1757 16.132 17.7993C15.5083 18.4229 14.7175 18.6997 13.7405 18.831C12.7912 18.9587 11.5782 18.9587 10.0467 18.9587H9.95267C8.4212 18.9587 7.20817 18.9587 6.25882 18.831C5.2818 18.6997 4.49101 18.4229 3.86738 17.7993C3.24374 17.1757 2.96698 16.3849 2.83562 15.4078C2.70798 14.4585 2.70799 13.2455 2.70801 11.714V8.28664C2.70799 6.75518 2.70798 5.54215 2.83562 4.59281C2.96698 3.61579 3.24374 2.825 3.86738 2.20136C4.49101 1.57773 5.2818 1.30096 6.25882 1.1696C7.20817 1.04197 8.42119 1.04198 9.95266 1.04199ZM6.42538 2.40846C5.58697 2.52118 5.10394 2.73257 4.75126 3.08525C4.39859 3.43792 4.18719 3.92096 4.07447 4.75937C3.95934 5.61575 3.95801 6.74464 3.95801 8.33366V11.667C3.95801 13.256 3.95934 14.3849 4.07447 15.2413C4.18719 16.0797 4.39859 16.5627 4.75126 16.9154C5.10394 17.2681 5.58697 17.4795 6.42538 17.5922C7.28177 17.7073 8.41066 17.7087 9.99968 17.7087C11.5887 17.7087 12.7176 17.7073 13.574 17.5922C14.4124 17.4795 14.8954 17.2681 15.2481 16.9154C15.6008 16.5627 15.8122 16.0797 15.9249 15.2413C16.04 14.3849 16.0413 13.256 16.0413 11.667V8.33366C16.0413 6.74464 16.04 5.61575 15.9249 4.75937C15.8122 3.92096 15.6008 3.43792 15.2481 3.08525C14.8954 2.73257 14.4124 2.52118 13.574 2.40846C12.7176 2.29332 11.5887 2.29199 9.99968 2.29199C8.41066 2.29199 7.28177 2.29332 6.42538 2.40846ZM6.87467 15.8337C6.87467 15.4885 7.1545 15.2087 7.49967 15.2087H12.4997C12.8449 15.2087 13.1247 15.4885 13.1247 15.8337C13.1247 16.1788 12.8449 16.4587 12.4997 16.4587H7.49967C7.1545 16.4587 6.87467 16.1788 6.87467 15.8337Z" fill="#1A3C7E" />
                  </g>
                </svg>
                <span className="flex-[1_0_0] text-[#282D3C] text-[12px] not-italic font-medium leading-[16px]">
                  {t("queue_phone")}
                </span>
              </div>
              <span className="text-[#000] text-[16px] not-italic font-bold leading-[normal]">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
