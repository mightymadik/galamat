"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent } from "@heroui/react";
import { Button } from "@heroui/button";
import Image from "next/image";
import Video from "next-video";


interface NewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentType: ".mp4" | ".mov" | ".webm" | ".png" | ".jpg" | ".jpeg" | ".webp";
    videoUrl?: string;
    imageUrl?: string;
    title?: string;
    content?: string;
    date?: string | null;
    button?: { link: string; text: string };
}

export default function NewsModal({
    isOpen,
    onClose,
    contentType,
    videoUrl,
    imageUrl,
    title,
    content,
    button,
    date
}: NewsModalProps) {
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth < 1024 : true
    );

    const isVideo = contentType && [".mp4", ".mov", ".webm"].includes(contentType);
    const isImage = contentType && [".png", ".jpg", ".jpeg", ".webp"].includes(contentType);

    return (
        <Drawer
            isDismissable={true}
            hideCloseButton={true}
            isKeyboardDismissDisabled={false}
            classNames={{
                base: "fixed flex w-full max-w-full lg:max-w-[600px] min-h-[85vh] bottom-0 h-full px-[16px] py-[24px] lg:px-[40px] lg:py-[64px] flex-col gap-[10px] rounded-t-[32px] bg-[#FFF]",
            }}
            placement={isMobile ? "bottom" : "right"}
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DrawerContent className="flex flex-col gap-[32px] h-full self-stretch">
                <div className="flex flex-col gap-[24px] h-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[24px] font-bold leading-[100%] text-[#1B1D24]">
                            {title}
                        </h2>
                        <Button
                            onClick={onClose}
                            className="min-w-[44px] min-h-[44px] p-[10px] rounded-[12px] bg-[#F4F4F6]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="#1B1D24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Button>
                    </div>

                    {date && (
                        <div className="text-[16px] font-light leading-[100%] text-[#43495A]">
                            {date}
                        </div>
                    )}

                    {isVideo && (
                        <div className="flex flex-col gap-[24px] flex-1 overflow-y-auto">
                            {videoUrl && (
                                <div className="w-full aspect-video bg-black rounded-[16px] overflow-hidden">
                                    <Video
                                        src={videoUrl}
                                        className="w-full h-full"
                                        title={title || ""}
                                        controls
                                        autoPlay={true}
                                        muted={false}
                                        loop={true}
                                    />
                                </div>
                            )}

                            {content && (
                                <div className="text-[16px] font-normal leading-[150%] text-[#282D3C] whitespace-pre-wrap">
                                    {content}
                                </div>
                            )}

                            {button && (
                                <div className="py-[20px]">
                                    <Button
                                        className="flex h-[44px] max-w-full w-full min-w-[76px] px-[24px] py-[12px] justify-center items-center flex-shrink-0 self-stretch rounded-[12px] bg-[#EF0406] text-white text-center text-[14px] font-normal leading-[normal] tracking-[-0.291px]"
                                        size="lg"
                                        type="button"
                                        onClick={() => {
                                            window.open(button.link);
                                        }}
                                    >
                                        {button.text}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {isImage && (
                        <div className="flex flex-col gap-[24px] flex-1 overflow-y-auto">
                            {imageUrl && (
                                <div className="w-full h-[200px] rounded-[16px] overflow-hidden">
                                    <Image
                                        src={imageUrl}
                                        alt={title || "News image"}
                                        width={600}
                                        height={200}
                                        className="w-full h-full object-cover"
                                        unoptimized
                                    />
                                </div>
                            )}

                            {content && (
                                <div className="text-[16px] font-normal leading-[150%] text-[#282D3C] whitespace-pre-wrap">
                                    {content}
                                </div>
                            )}

                            {button && (
                                <div className="py-[20px]">
                                    <Button
                                        className="flex h-[44px] max-w-full w-full min-w-[76px] px-[24px] py-[12px] justify-center items-center flex-shrink-0 self-stretch rounded-[12px] bg-[#EF0406] text-white text-center text-[14px] font-normal leading-[normal] tracking-[-0.291px]"
                                        size="lg"
                                        type="button"
                                        onClick={() => {
                                            window.open(button.link);
                                        }}
                                    >
                                        {button.text}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}