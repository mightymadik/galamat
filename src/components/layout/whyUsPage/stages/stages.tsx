"use client";

import Image from "next/image";

export default function WhyUsStages() {

    const stages = [
        {
            id: 1,
            title: "Отлик",
            icon: '/img/why-us-step-1.svg',
        },
        {
            id: 2,
            title: "Звонок",
            icon: '/img/why-us-step-2.svg',
        },
        {
            id: 3,
            title: "Интервью",
            icon: '/img/why-us-step-3.svg',
        },
        {
            id: 4,
            title: "Оффер",
            icon: '/img/why-us-step-4.svg',
        },
        {
            id: 5,
            title: "Выход на работу",
            icon: '/img/why-us-step-5.svg',
        },
    ]
    return (
        <section className="relative isolate bg-[#132C5E]">
            <img
                src="/img/why-us-team-bg.png"
                alt="Why us team background"
                className="absolute inset-0 w-full h-full object-cover -z-10 pointer-events-none"
            />
            <div className="wrapper">
                <div className="flex flex-col justify-between gap-6 py-20 max-lg:py-15">
                    <div className="max-w-1/2 max-lg:max-w-full self-stretch justify-center text-white text-4xl font-medium font-['Gotham'] leading-10">
                        Этапы Отбора
                    </div>
                    <div className="flex flex-row items-center justify-start h-[240px] overflow-x-auto overflow-y-hidden">
                        {stages.map((stage, index) => (
                            <div key={stage.id} className="flex items-center shrink-0">
                                <div className="flex flex-col items-start justify-between rounded-[32px] bg-[#F4F6FB] p-6 w-[240px] h-[170px] shrink-0">
                                    <div className="w-full flex items-start justify-between">
                                        <div className="text-[#DE153B] text-4xl font-medium font-['Gotham'] leading-10">
                                            {stage.id}
                                        </div>
                                        <Image src={stage.icon} alt={stage.title} width={60} height={60} />
                                    </div>
                                    <div className="text-zinc-900 text-xl font-medium font-['Gotham'] leading-6 text-left">
                                        {stage.title}
                                    </div>
                                </div>
                                {index < stages.length - 1 && (
                                    <Image
                                        src="/img/why-us-step-divider.svg"
                                        alt=""
                                        aria-hidden
                                        width={48}
                                        height={18}
                                        className="shrink-0 -ml-3 -mr-3 z-10"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}