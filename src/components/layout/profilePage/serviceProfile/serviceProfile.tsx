"use client"
import Image from "next/image"

export default function ServiceProfile() {
    return (
        <div className="flex flex-col gap-[32px]">
            <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">
                Gala Service
            </h1>
            <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between w-full max-w-[982px] h-auto lg:h-full lg:max-h-[286px] flex-shrink-0 rounded-[32px] bg-[#132C5E] bg-[url('/img/galabg.svg')] bg-cover bg-center bg-no-repeat">
                <div className="p-[32px] flex flex-col gap-[75px]">
                    <h1 className="text-[#FFF] text-center [font-size:_clamp(24px,3vw,32px)] not-italic font-normal leading-[40px] max-w-[350px]">Скачайте мобильное приложени Gala App</h1>
                    <div className="flex items-center gap-[13px] w-full">
                        <div className="relative w-full max-w-[162px] h-[50px]">
                            <Image
                                src="/img/appleWallet.svg"
                                alt="appleWallet"
                                fill
                                className="object-contain"
                            />
                        </div>

                        <div className="relative w-full max-w-[162px] h-[50px]">
                            <Image
                                src="/img/googleWallet.svg"
                                alt="googleWallet"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>
                </div>
                <Image src="/img/mockup.png" alt="mockup" width={375} height={460} className="" />
            </div>
        </div>
    )
}