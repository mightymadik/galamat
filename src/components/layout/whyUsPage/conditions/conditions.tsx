"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export default function WhyUsConditions() {
    const t = useTranslations();

    const conditions = [
        {
            id: 1,
            icon: '/img/numbers-calendar.svg',
            conditionTitle: t("why_us_conditions_item_1"),
        },
        {
            id: 2,
            icon: '/img/why-us-gramota.svg',
            conditionTitle: t("why_us_conditions_item_2"),
        },
        {
            id: 3,
            icon: '/img/why-us-map.svg',
            conditionTitle: t("why_us_conditions_item_3"),
        },
        {
            id: 4,
            icon: '/img/why-us-buildings.svg',
            conditionTitle: t("why_us_conditions_item_4"),
        },
        {
            id: 5,
            icon: '/img/why-us-notes.svg',
            conditionTitle: t("why_us_conditions_item_5"),
        },
    ]
    return (
        <section>
            <div className="wrapper py-20 max-lg:py-15 flex flex-col gap-[60px]">
                <div className="flex max-lg:flex-col flex-row justify-between gap-6">
                    <div className="max-w-1/2 max-lg:max-w-full self-stretch justify-center text-zinc-900 text-4xl font-medium font-['Gotham'] leading-10">
                        {t("why_us_conditions_title")}
                    </div>
                    <div className="max-w-1/2 max-lg:max-w-full text-color-blue-24 text-base font-normal font-['Gotham'] leading-6 text-zinc-900">
                        {t("why_us_conditions_description")}
                    </div>
                </div>
                <div className="flex flex-row justify-between max-lg:justify-start gap-4 h-[240px] overflow-x-auto overflow-y-hidden">
                    {conditions.map((condition) => (
                        <div key={condition.id} className="flex flex-col items-left justify-between rounded-[32px] gap-6 bg-[#F4F6FB] p-6 w-[250px] h-[240px] shrink-0">
                            <Image src={condition.icon} alt={condition.conditionTitle} width={40} height={40} />
                            <div className="text-zinc-900 text-xl font-medium font-['Gotham'] leading-6 text-left">
                                {condition.conditionTitle}
                            </div>
                        </div>
                        ))}
                </div>
            </div>
        </section>
    );
}