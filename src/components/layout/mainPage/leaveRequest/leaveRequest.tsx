"use client";

import "./leaveRequest.scss";
import Image from "next/image";
import { Input, Spinner } from "@heroui/react";
import { Button } from "@heroui/button";
import { withMask } from "use-mask-input";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { getStoredUtmParams } from "@/lib/utm";

export default function LeaveRequest() {
    const t = useTranslations();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    function pushFormSuccess(payload: { name?: string; phone?: string }) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "lead_submit_success",
            form_name: "leave_request",
            // можно передать utm, если нужно
        });
    }

    async function handleSubmit() {
        if (!name || !phone) return;

        setStatus("loading");

        try {
            // Get stored UTM parameters
            const utmParams = getStoredUtmParams();

            // Prepare payload with UTM parameters
            const payload: {
                name: string;
                phone: string;
                utm_source?: string;
                utm_medium?: string;
                utm_campaign?: string;
                utm_content?: string;
                utm_term?: string;
            } = {
                name,
                phone,
            };

            // Add UTM parameters if available
            if (utmParams) {
                if (utmParams.utm_source) payload.utm_source = utmParams.utm_source;
                if (utmParams.utm_medium) payload.utm_medium = utmParams.utm_medium;
                if (utmParams.utm_campaign) payload.utm_campaign = utmParams.utm_campaign;
                if (utmParams.utm_content) payload.utm_content = utmParams.utm_content;
                if (utmParams.utm_term) payload.utm_term = utmParams.utm_term;
            }

            const res = await fetch("/api/leaveRequest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed");

            pushFormSuccess({ name, phone });
            setStatus("success");

            setName("");
            setPhone("");
        } catch (e) {
            setStatus("error");
        }
    }

    const isLoading = status === "loading";

    return (
        <div className="leaveRequest h-full lg:h-[186px] my-[50px] lg:my-[0px] lg:py-[40px] bg-[#132C5E] flex">
            <div className="wrapper flex flex-col lg:flex-row items-center gap-[24px] lg:gap-[58px]">
                <Image
                    src="/img/woman.svg"
                    alt="GalaWoman"
                    width={220}
                    height={186}
                    className="hidden lg:block"
                />

                {(status !== "success" && status !== "error") && (
                    <div className="flex w-full flex-col gap-[10px]">
                        <h1 className="w-full text-white text-[24px] lg:text-[32px] font-medium leading-[100%]">
                            {t("leave_request")}
                        </h1>
                        <p className="w-full text-white text-[16px] lg:text-[20px] leading-[100%]">
                            {t("leave_request_description")}
                        </p>
                    </div>
                )}
                {(status !== "success" && status !== "error") && (
                    <div className="flex items-start gap-[11px] w-full">
                        <div className="flex w-full flex-col items-start gap-[12px] p-0">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("name")}
                                type="text"
                                className="h-[44px] w-full rounded-[12px] bg-[#F4F6FB] px-[16px] text-[14px] text-[#282D3C] placeholder:text-[#9CA3AF] p-0"
                            />

                            <Input
                                ref={withMask("+7 (999) 999-99-99")}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Телефон"
                                type="tel"
                                className="h-[44px] w-full rounded-[12px] bg-[#F4F6FB] px-[16px] text-[14px] text-[#282D3CF] placeholder:text-[#9CA3AF] p-0"
                            />

                            {/* Mobile button */}
                            <Button
                                onClick={handleSubmit}
                                isDisabled={isLoading}
                                className="flex lg:hidden w-full h-[44px] text-white font-medium min-w-[44px] min-h-[44px] justify-center items-center rounded-[32px] bg-[#DB1D31]"
                            >
                                {isLoading ? (<Spinner />) : ("Отправить")}
                            </Button>
                        </div>

                        {/* Desktop button */}
                        <Button
                            onClick={handleSubmit}
                            isDisabled={isLoading}
                            className="hidden lg:flex items-center w-[100px] h-[100px] px-[25px] py-[50px] rounded-[16px] bg-[#EF0406]"
                        >
                            {isLoading ? (
                                <Spinner />
                            ) : (
                                <svg className="h-[50px] stroke-[0.5px] stroke-[#FFF]" xmlns="http://www.w3.org/2000/svg" width="53" height="28" viewBox="0 0 53 28" fill="none">
                                    <path d="M51.9422 15.3288C52.6839 14.5871 52.6839 13.3846 51.9422 12.6429L39.8556 0.556301C39.1139 -0.185391 37.9114 -0.185391 37.1697 0.556301C36.428 1.29799 36.428 2.50052 37.1697 3.24221L47.9133 13.9858L37.1697 24.7295C36.428 25.4712 36.428 26.6737 37.1697 27.4154C37.9114 28.1571 39.1139 28.1571 39.8556 27.4154L51.9422 15.3288ZM0 13.9858V15.8851H50.5992V13.9858V12.0866H0V13.9858Z" fill="white" />
                                </svg>
                            )}
                        </Button>
                    </div>
                )}
                {(status === "success") && (
                    <div className="flex flex-col lg:flex-row w-full items-center gap-[24px] flex-shrink-0">
                        <div className="flex justify-center items-center gap-[10px] rounded-[32px] bg-[#35B744] w-[110px] h-[110px] flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M31.6915 58.2158C19.2421 58.2158 13.0173 58.2158 9.14978 54.3405C5.28223 50.4653 5.28223 44.2282 5.28223 31.7539C5.28223 19.2796 5.28223 13.0425 9.14978 9.16725C13.0173 5.29199 19.2421 5.29199 31.6915 5.29199C44.141 5.29199 50.3657 5.29199 54.2333 9.16725C58.1008 13.0425 58.1008 19.2796 58.1008 31.7539C58.1008 44.2282 58.1008 50.4653 54.2333 54.3405C50.3657 58.2158 44.141 58.2158 31.6915 58.2158ZM42.3353 23.7351C43.1089 24.5101 43.1089 25.7667 42.3353 26.5418L29.1307 39.7727C28.3572 40.5478 27.1031 40.5478 26.3296 39.7727L21.0477 34.4803C20.2742 33.7053 20.2742 32.4487 21.0477 31.6736C21.8212 30.8986 23.0753 30.8986 23.8488 31.6736L27.7301 35.5627L39.5342 23.7351C40.3077 22.96 41.5618 22.96 42.3353 23.7351Z" fill="white" />
                            </svg>
                        </div>
                        <div className="flex justify-center items-center w-full h-full max-w-[440px] max-h-[100px] flex-col items-start gap-[12px] flex-shrink-0">
                            <h1 className="text-center lg:text-start self-stretch text-[#FFF] [font-size:_clamp(24px,4vw,45px)] not-italic font-medium leading-[100%]">
                                Спасибо за заявку
                            </h1>
                            <span className="text-center lg:text-start text-[#FFF] [font-size:_clamp(16px,3vw,20px)] not-italic font-normal leading-[100%]">
                                Наши менеджеры свяжутся с вами в ближайшее время
                            </span>
                        </div>
                    </div>
                )}
                {(status === "error") && (
                    <div className="flex flex-col lg:flex-row w-full items-center gap-[24px] flex-shrink-0">
                        <div className="flex justify-center items-center gap-[10px] rounded-[32px] bg-[#EF0406] w-[110px] h-[110px] flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <rect width="64" height="64" rx="16" fill="white" />
                                <path d="M38.6663 25.3336L25.333 38.6668M25.333 25.3335L38.6662 38.6668" stroke="#EF0406" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="flex w-full h-full max-w-[440px] max-h-[100px] flex-col items-start gap-[12px] flex-shrink-0">
                            <h1 className="text-center lg:text-start self-stretch text-[#FFF] [font-size:_clamp(24px,4vw,45px)] not-italic font-medium leading-[100%]">
                                Произошла ошибка
                            </h1>
                            <span className="w-full text-center lg:text-start text-[#FFF] [font-size:_clamp(16px,3vw,20px)] not-italic font-normal leading-[100%]">
                                Попробуйте повторить позже
                            </span>
                        </div>
                    </div>
                )}

                <Image
                    src="/img/woman.svg"
                    alt="GalaWoman"
                    width={220}
                    height={186}
                    className="block lg:hidden"
                />
            </div>
        </div>
    );
}