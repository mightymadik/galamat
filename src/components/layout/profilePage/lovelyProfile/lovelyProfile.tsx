"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { openAuth } from "@/store/authSlice";
import { removeFavorite } from "@/store/favoritesSlice";

interface ComponentFlat {
    id: number;
    documentId?: string;
    title: string;
    address: string;
    price: string;
    priceM2: string;
    tags: string[];
    images: string[];
    room: string;
    area: string;
    floor: string;
    section: string;
    entrance: string;
}

function adaptProperty(property: any): ComponentFlat {
    const formattedPrice = property.priceCheckmate
        ? `${property.priceCheckmate.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`
        : "0 ₸";
    const formattedPriceM2 = property.priceM2Checkmate
        ? `${property.priceM2Checkmate.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸/м²`
        : "0 ₸/м²";
    const address = property.complexAddress || (() => {
        const addressParts = [];
        if (property.district) addressParts.push(property.district);
        if (property.projectName) addressParts.push(property.projectName);
        return addressParts.length > 0 ? addressParts.join(", ") : "";
    })();
    return {
        id: property.id,
        documentId: property.documentId != null ? property.documentId : undefined,
        title: property.projectName || "",
        address,
        price: formattedPrice,
        priceM2: formattedPriceM2,
        tags: property.tags || [],
        images: property.images || [],
        room: property.room?.toString() || "0",
        area: `${property.totalArea?.toFixed(1) || 0} м²`,
        floor: property.floor?.toString() || "0",
        section: property.section || "",
        entrance: property.entrance?.toString() || "0",
    };
}

export default function LovelyProfile() {
    const t = useTranslations();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const favoriteFlatIds = useSelector((state: RootState) => state.favorites.flatIds);
    const [flats, setFlats] = useState<ComponentFlat[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || favoriteFlatIds.length === 0) {
            setFlats([]);
            return;
        }
        setLoading(true);
        const ids = favoriteFlatIds.join(",");
        fetch(`/api/properties?ids=${ids}`)
            .then((res) => res.json())
            .then((response: any) => {
                const items = response?.data ?? (Array.isArray(response) ? response : []);
                setFlats(items.map(adaptProperty));
            })
            .catch(() => setFlats([]))
            .finally(() => setLoading(false));
    }, [user, favoriteFlatIds]);

    if (!user) {
        return (
            <div className="flex flex-col w-full gap-[32px]">
                <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">
                    {t("favorites")}
                </h1>
                <div className="flex flex-col items-center justify-center gap-6 py-12 rounded-2xl bg-[#F4F6FB]">
                    <p className="text-[#282D3C] text-center text-[16px]">
                        {t("favorites_login_prompt")}
                    </p>
                    <Button
                        className="bg-[#1A3C7E] text-white rounded-[12px] px-6"
                        onPress={() => dispatch(openAuth())}
                    >
                        {t("login")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full gap-[32px]">
            <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">
                {t("favorites")}
            </h1>
            {loading && (
                <>
                    <Spinner size="lg" color="primary" />
                    <span className="text-[#132C5E] text-center font-medium">{t("loading")}</span>
                </>
            )}
            {!loading && flats.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 py-12 rounded-2xl bg-[#F4F6FB]">
                    <p className="text-[#282D3C] text-center text-[16px]">
                        {t("favorites_empty")}
                    </p>
                    <Link href="/flats">
                        <Button className="bg-[#1A3C7E] text-white rounded-[12px] px-6">
                            {t("go_to_catalog")}
                        </Button>
                    </Link>
                </div>
            )}
            {!loading && flats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[24px] w-full">
                    {flats.map((flat) => (
                        <FavoriteFlatCard
                            key={flat.id}
                            flat={flat}
                            onRemove={() => dispatch(removeFavorite(flat.id))}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function FavoriteFlatCard({ flat, onRemove }: { flat: ComponentFlat; onRemove: () => void }) {
    const t = useTranslations();
    const imageUrl = flat.images?.[0];

    return (
        <div className="flex p-[16px] flex-col items-center gap-[24px] flex-[1_0_0] rounded-[18px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full h-full">
            <div className="flex flex-col items-start gap-[12px] self-stretch w-full">
                <div className="flex items-center gap-[12px] self-stretch">
                    <h1 className="flex-[1_0_0] text-[#07071F] text-[24px] font-medium">{flat.title}</h1>
                    <div className="flex justify-end items-center gap-[4px] flex-wrap">
                        {flat.tags.map((tag, i) => (
                            <div
                                key={i}
                                className={`flex text-[10px] p-[4px] justify-center items-center rounded-[16px] leading-full ${tag === "Ипотека" ? "bg-[#3682F5] text-[#FFF]" : "bg-[#F4F5F9] text-[#282D3C]"}`}
                            >
                                {tag === "Ипотека" ? t("hypothec_tag") : tag}
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-[#122C5E] text-[12px]">{flat.address}</p>
            </div>

            <Link href={`/flats/${flat.documentId ?? flat.id}`} className="relative w-full flex flex-col items-center gap-[8px]">
                <div className="relative h-[205px] flex justify-center items-center self-stretch">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={flat.title}
                            width={216}
                            height={193}
                            className="transition-all duration-500 rounded-[12px] object-cover"
                        />
                    ) : (
                        <div className="w-[216px] h-[193px] bg-gray-200 rounded-[12px] flex items-center justify-center">
                            <span className="text-gray-500">{t("no_image")}</span>
                        </div>
                    )}
                </div>
            </Link>

            <div className="flex flex-col items-start gap-[12px] self-stretch w-full">
                <div className="flex flex-col items-start gap-[4px]">
                    <h1 className="text-[#07071F] text-[24px] font-medium">{flat.price}</h1>
                    <span className="text-[#07071F] text-[16px] opacity-45">{flat.priceM2}</span>
                </div>
                <div className="flex items-center gap-[8px] self-stretch">
                    <span className="text-[#07071F] text-[16px]">{flat.room} {t("rooms_short")}</span>
                    <span className="text-[#07071F] text-[16px]">·</span>
                    <span className="text-[#07071F] text-[16px]">{flat.area}</span>
                    <span className="text-[#07071F] text-[16px]">·</span>
                    <span className="text-[#07071F] text-[16px]">{t("floor")} {flat.floor}</span>
                </div>
            </div>

            <div className="flex items-center gap-[4px] self-stretch w-full">
                <Link href={`/flats/${flat.documentId ?? flat.id}`} className="flex-1">
                    <Button className="flex w-full h-[44px] justify-center items-center rounded-[12px] bg-[#1A3C7E] text-[#FFF] text-[15px] font-medium">
                        {t("more_details")}
                    </Button>
                </Link>
                <Button
                    type="button"
                    className="flex w-[44px] h-[44px] min-w-[44px] justify-center items-center rounded-[12px] bg-[#DB1D31]/10"
                    onPress={onRemove}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                        <path
                            d="M1.33337 6.0914C1.33337 9.33335 4.01299 11.0609 5.97453 12.6073C6.66671 13.1529 7.33337 13.6667 8.00004 13.6667C8.66671 13.6667 9.33337 13.1529 10.0256 12.6073C11.9871 11.0609 14.6667 9.33335 14.6667 6.0914C14.6667 2.84944 10.9999 0.550309 8.00004 3.66709C5.00015 0.550309 1.33337 2.84944 1.33337 6.0914Z"
                            fill="#DB1D31"
                        />
                    </svg>
                </Button>
            </div>
        </div>
    );
}
