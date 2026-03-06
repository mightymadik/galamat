"use client"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    Button,
    useDisclosure,
    Input,
    Spinner
} from "@heroui/react";
import { useEffect } from "react";
import { withMask } from "use-mask-input";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getStoredUtmParams } from "@/lib/utm";

interface LeaveRequestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LeaveRequestDrawer({ isOpen, onClose }: LeaveRequestDrawerProps) {
    const t = useTranslations();
    const pathname = usePathname();
    const { onOpenChange } = useDisclosure();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const getProjectName = (): string | undefined => {

        if (pathname.startsWith("/project/")) {
            // Extract slug from pathname (e.g., "/project/my-project" -> "my-project")
            const slug = pathname.replace("/project/", "").split("?")[0].split("#")[0];
            console.log("Extracted slug:", slug);

            // Try multiple methods to get project name
            // Method 1: Open Graph meta tag (most reliable)
            try {
                const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
                console.log("OG Title:", ogTitle);
                if (ogTitle && ogTitle.trim() !== "") {
                    console.log("Using OG Title:", ogTitle);
                    return ogTitle.trim();
                }
            } catch (e) {
                console.log("Error reading OG title:", e);
            }

            // Method 2: Document title
            try {
                const title = document.title;
                console.log("Document title:", title);
                if (title && title.trim() !== "") {
                    // Remove common suffixes
                    const cleanedTitle = title.replace(/\s*[-–—]\s*Galamat.*$/i, "").trim();
                    console.log("Cleaned title:", cleanedTitle);
                    if (cleanedTitle !== "") {
                        return cleanedTitle;
                    }
                }
            } catch (e) {
                console.log("Error reading document title:", e);
            }

            // Method 3: Try to find h1 with project name
            try {
                const h1 = document.querySelector("h1");
                if (h1 && h1.textContent) {
                    const h1Text = h1.textContent.trim();
                    console.log("H1 text:", h1Text);
                    if (h1Text !== "") {
                        return h1Text;
                    }
                }
            } catch (e) {
                console.log("Error reading H1:", e);
            }

            console.log("Could not extract project name from page, slug:", slug);
        } else {
            console.log("Not on project page, pathname:", pathname);
        }

        return undefined;
    };

    function pushFormSuccess(payload: { name?: string; phone?: string }) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "lead_submit_success",
            form_name: "leave_request",
        });
    }

    async function handleSubmit() {
        if (!name || !phone) return;

        setStatus("loading");

        try {
            // Get stored UTM parameters
            const utmParams = getStoredUtmParams();

            // Get project name if on project page
            const projectName = getProjectName();
            console.log("Project name from getProjectName():", projectName);

            // Prepare payload with UTM parameters
            const payload: {
                name: string;
                phone: string;
                project_name?: string;
                utm_source?: string;
                utm_medium?: string;
                utm_campaign?: string;
                utm_content?: string;
                utm_term?: string;
            } = {
                name,
                phone,
            };

            // Add project name if available
            if (projectName && projectName.trim() !== "") {
                payload.project_name = projectName.trim();
                console.log("Added project_name to payload:", payload.project_name);
            } else {
                console.log("Project name is empty or undefined, not adding to payload");
            }

            console.log("Final payload:", payload);

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

    useEffect(() => {
        if (isOpen) {
        }
    }, [isOpen]);

    return (
        <Drawer
            isDismissable={true}
            isKeyboardDismissDisabled={true}
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DrawerContent>
                {(onCloseInternal) => (
                    <>
                        <DrawerHeader className="flex flex-col gap-1">{t("leave_request")}</DrawerHeader>
                        <DrawerBody>
                            {(status !== "success" && status !== "error") && (
                                <div className="flex flex-col gap-6 py-4">
                                    <p>
                                        {t("leave_request_description")}
                                    </p>
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

                                            <Button
                                                onClick={handleSubmit}
                                                isDisabled={isLoading}
                                                className="flex w-full h-[44px] text-white font-medium min-w-[44px] min-h-[44px] justify-center items-center rounded-[32px] bg-[#DB1D31]"
                                            >
                                                {isLoading ? <Spinner /> : t("send")}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {(status === "success") && (
                                <div className="flex flex-col w-full items-center gap-[24px] flex-shrink-0 py-4">
                                    <div className="flex justify-center items-center gap-[10px] rounded-[32px] bg-[#35B744] w-[110px] h-[110px] flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M31.6915 58.2158C19.2421 58.2158 13.0173 58.2158 9.14978 54.3405C5.28223 50.4653 5.28223 44.2282 5.28223 31.7539C5.28223 19.2796 5.28223 13.0425 9.14978 9.16725C13.0173 5.29199 19.2421 5.29199 31.6915 5.29199C44.141 5.29199 50.3657 5.29199 54.2333 9.16725C58.1008 13.0425 58.1008 19.2796 58.1008 31.7539C58.1008 44.2282 58.1008 50.4653 54.2333 54.3405C50.3657 58.2158 44.141 58.2158 31.6915 58.2158ZM42.3353 23.7351C43.1089 24.5101 43.1089 25.7667 42.3353 26.5418L29.1307 39.7727C28.3572 40.5478 27.1031 40.5478 26.3296 39.7727L21.0477 34.4803C20.2742 33.7053 20.2742 32.4487 21.0477 31.6736C21.8212 30.8986 23.0753 30.8986 23.8488 31.6736L27.7301 35.5627L39.5342 23.7351C40.3077 22.96 41.5618 22.96 42.3353 23.7351Z" fill="white" />
                                        </svg>
                                    </div>
                                    <div className="flex justify-center items-center w-full h-full max-w-[440px] max-h-[100px] flex-col items-start gap-[12px] flex-shrink-0">
                                        <h1 className="text-center self-stretch text-black [font-size:_clamp(24px,4vw,35px)] not-italic font-medium leading-[100%]">
                                            {t("succsess_request")}
                                        </h1>
                                        <span className="text-center text-black [font-size:_clamp(16px,3vw,20px)] not-italic font-normal leading-[100%]">
                                            {t("succsess_request_text")}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {(status === "error") && (
                                <div className="flex flex-col w-full items-center gap-[24px] flex-shrink-0 py-4">
                                    <div className="flex justify-center items-center gap-[10px] rounded-[32px] bg-[#EF0406] w-[110px] h-[110px] flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
                                            <rect width="64" height="64" rx="16" fill="white" />
                                            <path d="M38.6663 25.3336L25.333 38.6668M25.333 25.3335L38.6662 38.6668" stroke="#EF0406" strokeWidth="4" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="flex w-full h-full max-w-[440px] max-h-[100px] flex-col items-start gap-[12px] flex-shrink-0">
                                        <h1 className="text-center self-stretch text-black [font-size:_clamp(24px,4vw,35px)] not-italic font-medium leading-[100%]">
                                            {t("error_request")}
                                        </h1>
                                        <span className="text-center w-full text-black [font-size:_clamp(16px,3vw,20px)] not-italic font-normal leading-[100%]">
                                            {t("error_request_text")}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </DrawerBody>
                    </>
                )}
            </DrawerContent>
        </Drawer>
    );
}