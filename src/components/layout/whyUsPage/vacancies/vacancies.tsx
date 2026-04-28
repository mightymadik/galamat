"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type VacancyItem = {
    id: string;
    title: string;
    address: string;
    link: string;
};

type VacanciesApiResponse = {
    success: boolean;
    data?: {
        items: VacancyItem[];
    };
};

export default function WhyUsVacancies() {
    const t = useTranslations();
    const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        async function loadVacancies() {
            try {
                setIsLoading(true);
                setHasError(false);
                const res = await fetch("/api/vacancies?per_page=4", {
                    method: "GET",
                    cache: "no-store",
                });
                const payload = (await res.json()) as VacanciesApiResponse;
                if (!res.ok || !payload.success) {
                    throw new Error("Failed to load vacancies");
                }
                if (!isCancelled) {
                    setVacancies(payload.data?.items ?? []);
                }
            } catch {
                if (!isCancelled) {
                    setHasError(true);
                    setVacancies([]);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadVacancies();

        return () => {
            isCancelled = true;
        };
    }, []);

    const vacanciesList = useMemo(() => vacancies.slice(0, 4), [vacancies]);
    const allVacanciesLink = "https://hh.ru/employer/5891581";

    return (
        <section>
            <div className="wrapper">
                <div className="flex flex-col justify-between gap-8 py-20 max-lg:py-15">
                    <div className="max-w-1/2 max-lg:max-w-full self-stretch text-zinc-900 justify-center text-white text-4xl font-medium font-['Gotham'] leading-10">
                        {t("why_us_vacancies_title")}
                    </div>
                    <div className="flex flex-col justify-between gap-6">
                        {isLoading ? (
                            <div className="rounded-[32px] bg-slate-100 p-6 text-[rgba(19,44,94,1)]">
                                {t("why_us_vacancies_loading")}
                            </div>
                        ) : null}
                        {!isLoading && hasError ? (
                            <div className="rounded-[32px] bg-slate-100 p-6 text-[rgba(19,44,94,1)]">
                                {t("why_us_vacancies_error")}
                            </div>
                        ) : null}
                        {!isLoading && !hasError && vacanciesList.length === 0 ? (
                            <div className="rounded-[32px] bg-slate-100 p-6 text-[rgba(19,44,94,1)]">
                                {t("why_us_vacancies_empty")}
                            </div>
                        ) : null}
                        {vacanciesList.map((vacancy) => (
                            <div key={vacancy.id} className="self-stretch min-h-32 p-6 bg-slate-100 rounded-[32px] outline outline-1 outline-offset-[-1px] outline-indigo-200 inline-flex gap-3.5 justify-between items-center">
                                <div className="text-zinc-900 text-xl font-medium font-['Gotham'] leading-6 text-left h-full flex flex-col justify-between">
                                    <p className="text-3xl font-medium text-[rgba(19,44,94,1)] max-[600px]:text-xl">{vacancy.title}</p>
                                    <p className="text-2xl font-light text-[rgba(19,44,94,1)] max-[600px]:text-base">{vacancy.address}</p>
                                </div>
                                <a href={vacancy.link} target="_blank" rel="noreferrer" className="h-16 p-5 max-[600px]:p-3 max-[600px]:h-12 max-[600px]:min-w-12 bg-white rounded-[20px] inline-flex justify-center items-center">
                                    <Image src="/img/why-us-redirect-btn.svg" alt={t("why_us_vacancies_redirect_alt")} width={24} height={24} />
                                </a>
                            </div>
                        ))}
                    </div>
                    <a href={allVacanciesLink} target="_blank" rel="noreferrer" className="text-center w-[240px] min-h-11 p-3 bg-[#F4F6FB] text-zinc-900 rounded-xl self-center flex justify-center items-center font-medium">
                        {t("why_us_vacancies_all")}
                    </a>
                </div>
            </div>
        </section>
    );
}