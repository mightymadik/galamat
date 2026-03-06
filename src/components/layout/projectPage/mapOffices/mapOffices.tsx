"use client";

import { useTranslations } from "next-intl";

export default function MapOffices() {
    const t = useTranslations();

    return (
        <div className="py-[40px] lg:py-[64px]">
            <div className="wrapper flex flex-col items-start gap-[32px]">
                <h1 className="text-[36px] font-medium text-[#202028] leading-[41.76px]">
                    {t("sales_offices")}
                </h1>
                <div
                    className="w-full h-[630px] rounded-xl overflow-hidden"
                >
                    <iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3Ae616530560919548ba59d253d1995027d5b77c7dc34acfb6236a78dff5357398&amp;source=constructor" width="100%" height="630" frameBorder="0"></iframe>
                </div>
            </div>
        </div>
    );
}
