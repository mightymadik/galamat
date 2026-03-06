"use client"
import { useTranslations } from "next-intl";

export default function Tutorial() {
    const t = useTranslations();
    return (
        <div className="py-[40px]">
            <div className="wrapper flex flex-col items-start gap-[60px]">
                <h1 className="text-[#202028] [font-size:_clamp(24px,10vw,45px)] not-italic font-medium leading-[100%]">
                    {t("how_to_get_bonus")}
                </h1>
                <div className="flex justify-center items-center gap-[32px] self-stretch flex-wrap">
                    <div className="flex w-full lg:max-w-[418px] h-[747px] flex-col items-start gap-[32px]">
                        <div className="flex flex-col items-start gap-[16px] self-stretch">
                            <div className="flex w-[72px] p-[20px] flex-col justify-center items-center gap-[10px] rounded-[16px] bg-[#DB1D31]">
                                <span className="text-[#FFF] text-center text-[32px] not-italic font-bold leading-[100%]">01</span>
                            </div>
                            <p className="text-[#282D3C] text-[36px] not-italic font-normal leading-[normal]">{t("play_gala_fortune")}</p>
                        </div>
                        <div className="w-full lg:max-w-[418px] h-[541px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url(/img/howtoget.svg)] bg-cover bg-no-repeat">
                        </div>
                    </div>
                    <div className="flex w-full lg:max-w-[418px] h-[747px] flex-col items-start gap-[32px]">
                        <div className="flex flex-col items-start gap-[16px] self-stretch">
                            <div className="flex w-[72px] p-[20px] flex-col justify-center items-center gap-[10px] rounded-[16px] bg-[#DB1D31]">
                                <span className="text-[#FFF] text-center text-[32px] not-italic font-bold leading-[100%]">02</span>
                            </div>
                            <p className="text-[#282D3C] text-[36px] not-italic font-normal leading-[normal]">{t("win_gala_bonus")}</p>
                        </div>
                        <div className="w-full lg:max-w-[418px] h-[541px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url(/img/wallet.svg)] bg-cover bg-no-repeat">
                        </div>
                    </div>
                    <div className="flex w-full lg:max-w-[418px] h-[747px] flex-col items-start gap-[32px]">
                        <div className="flex flex-col items-start gap-[16px] self-stretch">
                            <div className="flex w-[72px] p-[20px] flex-col justify-center items-center gap-[10px] rounded-[16px] bg-[#DB1D31]">
                                <span className="text-[#FFF] text-center text-[32px] not-italic font-bold leading-[100%]">03</span>
                            </div>
                            <p className="text-[#282D3C] text-[36px] not-italic font-normal leading-[normal]">{t("buy_flat_with_bonus")}</p>
                        </div>
                        <div className="w-full lg:max-w-[418px] h-[541px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url(/img/galaplan.svg)] bg-cover bg-no-repeat">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

