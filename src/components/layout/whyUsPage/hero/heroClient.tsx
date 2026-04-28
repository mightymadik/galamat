import { WhyUsHeroItemData } from "@/types/whyUsPage";
import Image from "next/image";

export default function HeroClient({ heroData }: { heroData: WhyUsHeroItemData[] }) {
    const firstItem = heroData[0];

    return (
        <div className="py-[40px]">
            <div className="wrapper h-full flex flex-col items-center gap-[32px]">

                <div className="flex flex-col items-center gap-[16px] w-full">
                    <div className="flex h-[24px]w-[189px] flex-col justify-center items-center ">
                        {/* SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="189" height="24" viewBox="0 0 189 24" fill="none">
                            <g clipPath="url(#clip0_56_33371)">
                                <path fillRule="evenodd" clipRule="evenodd" d="M22.475 0.460938H12.625V22.2467H22.475V0.460938Z" fill="#DB1D31" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M10.0244 0.460938H0V22.2467H10.0244V0.460938ZM35.1028 0.460938H25.0783V22.2467H35.1028V0.460938Z" fill="#132C5E" />
                                <path d="M53.0605 9.57789H64.0544V11.7335C64.0544 14.8657 63.0499 17.4118 61.0409 19.3651C59.0248 21.2905 56.4368 22.253 53.2488 22.253C49.8794 22.253 47.0751 21.1858 44.8428 19.0582C42.6663 16.9235 41.5781 14.3006 41.5781 11.1684C41.5781 8.03625 42.6663 5.41322 44.8428 3.23674C47.0193 1.08119 49.726 0 52.9418 0C54.9579 0 56.8205 0.453392 58.5156 1.35329C60.1898 2.22527 61.5292 3.40427 62.4989 4.91805L57.7761 7.56891C57.3366 6.89226 56.6879 6.36204 55.8368 5.95744C54.9858 5.53889 54.0441 5.34347 53.0116 5.34347C51.2885 5.34347 49.8794 5.88766 48.7773 6.98288C47.675 8.09902 47.117 9.50818 47.117 11.1963C47.117 12.8846 47.6611 14.2518 48.7354 15.3679C49.8375 16.5119 51.3793 17.084 53.3395 17.084C55.8788 17.084 57.5459 16.1492 58.3551 14.2796H53.0605V9.58488V9.57789ZM86.0914 21.7996H80.0781L79.1503 18.7164H71.8884L70.9606 21.7996H64.9195L72.1185 0.46733H78.8992L86.0982 21.7996H86.0914ZM75.4949 6.77357L73.3185 14.0286H77.7133L75.4949 6.77357ZM94.2671 0.46733V16.5328H101.78V21.7996H88.7004V0.46733H94.2601H94.2671ZM124.654 21.7996H118.64L117.713 18.7164H110.451L109.523 21.7996H103.482L110.681 0.46733H117.462L124.661 21.7996H124.654ZM114.058 6.77357L111.881 14.0286H116.276L114.058 6.77357ZM143.719 0.46733H149.118V21.7996H143.719V10.3034L138.558 18.8698H138.013L132.878 10.3313V21.7996H127.437V0.46733H132.878L138.278 9.57789L143.719 0.46733ZM172.977 21.7996H166.976L166.035 18.7164H158.788L157.859 21.7996H151.818L159.003 0.46733H165.798L172.984 21.7996H172.977ZM162.394 6.77357L160.217 14.0286H164.612L162.394 6.77357ZM172.656 0.46733H189V5.73417H183.607V21.7996H178.041V5.73417H172.649V0.46733H172.656Z" fill="#132C5E" />
                            </g>
                            <defs>
                                <clipPath id="clip0_56_33371">
                                    <rect width="189" height="23.3333" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                    </div>

                    <div className="flex justify-center w-full">
                        <h1 className="text-[#122C5E] text-center [font-size:_clamp(24px,5vw,64px)] font-bold leading-[100%]">
                            {firstItem?.whyUsTitle}
                        </h1>
                    </div>

                    <p className="text-[#122C5E] text-center [font-size:_clamp(16px,10vw,24px)] leading-[normal]">
                        {firstItem?.whyUsSubtitle}
                    </p>
                </div>

                {/* ITEMS */}
                <div className="flex items-stretch gap-[12px] h-[430px] lg:h-auto w-full overflow-x-auto overflow-y-hidden scrollbar-hide">
                    {heroData.map((item) => (
                        <div key={item.id} className="flex flex-col justify-between min-w-[269px] w-[437px] bg-[#122C5E] rounded-[32px] h-full">

                            {/* HEADER */}
                            <div className="flex h-[128px] p-[32px] items-start gap-[10px]">
                                <div className="flex items-center gap-[14px] max-h-[64px]">

                                    {item.whyUsHeroIcon ? (
                                        <Image src={item.whyUsHeroIcon} alt={item.whyUsHeroIconTitle} width={64} height={64} />
                                    ) : (
                                        <svg width={64} height={64} viewBox="0 0 64 64" fill="none">
                                            <path d="..." fill="#FFF" />
                                        </svg>
                                    )}

                                    <h1 className="text-white text-[clamp(16px,1vw,32px)] font-medium leading-[100%]">
                                        {item.whyUsHeroIconTitle}
                                    </h1>
                                </div>
                            </div>

                            {/* IMAGE BLOCK */}
                            <div
                                className="flex flex-col justify-end rounded-[32px] w-full h-[297px] lg:h-[547px] bg-center bg-cover bg-no-repeat"
                                style={{
                                    backgroundImage: `url(${item.whyUsHeroItemImage || "/img/family.jpg"})`,
                                }}
                            >
                                <div className="p-[20px] rounded-[32px] bg-[linear-gradient(0deg,_rgba(37,37,56,0.80)_10%,_rgba(37,37,56,0)_100%)]">
                                    <p className="text-white text-[clamp(16px,1vw,20px)] font-medium leading-[100%]">
                                        {item.whyUsHeroItemTitle}
                                    </p>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
