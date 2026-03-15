"use client";

import Link from "next/link";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Select, SelectItem, Button, Selection } from "@heroui/react";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { openAuth } from "@/store/authSlice";
import { checkAuth } from "@/store/authThunks";
import { RootState } from "@/store";
import LeaveRequestDrawer from "../leaverRequestDrawer/leaveRequestDrawer";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { HeaderItem } from "@/types/header";

export const langs = [
    { key: "ru", label: "RU" },
    { key: "kk", label: "KZ" },
];

export const cities = [
    { key: "Astana", label: "Астана" },
];

export default function HeaderClient({ data }: { data: HeaderItem[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        dispatch(checkAuth() as any);
    }, [dispatch]);
    const containerRef = useRef<HTMLUListElement>(null);
    const [visibleLinks, setVisibleLinks] = useState<string[]>([]);
    const [hiddenLinks, setHiddenLinks] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const links = useMemo(() =>
        data.map(item => ({ name: item.headerTitle, href: item.headerLink })),
        [data]);

    const [selectedKeys, setSelectedKeys] = useState("Astana");
    const [selectedKeysLabel, setSelectedKeysLabel] = useState("Астана");

    useEffect(() => {
        const cookieCity = document.cookie
            .split("; ")
            .find((row) => row.startsWith("city="))
            ?.split("=")[1];

        if (cookieCity) {
            setSelectedKeys(cookieCity);
        }
    }, []);

    const handleDropdownChange = (key: string) => {
        const city = cities.find(c => c.key === key);
        if (!city) return;

        setSelectedKeys(city.key);
        setSelectedKeysLabel(city.label);
        document.cookie = `city=${city.key}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`;
        router.refresh();
    };

    const [selected, setSelected] = useState<string>("ru");

    useEffect(() => {
        const cookieLang = document.cookie
            .split("; ")
            .find((row) => row.startsWith("locale="))
            ?.split("=")[1];

        if (cookieLang) {
            setSelected(cookieLang);
        }
    }, []);

    const changeLang = (lang: string) => {
        document.cookie = `locale=${lang}; path=/; SameSite=Lax`;
        setSelected(lang);
        router.refresh();
    };

    const handleSelectionChange = (keys: any) => {
        const arr = Array.from(keys);
        if (arr.length === 0) return;

        const lang = arr[0] as string;
        changeLang(lang);
    };

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            const windowWidth = window.innerWidth;

            if (windowWidth >= 1400) {
                setVisibleLinks(links.map(l => l.name));
                setHiddenLinks([]);
                setOpen(false);
                return;
            }

            if (windowWidth >= 1105) {
                setVisibleLinks(links.slice(0, 2).map(l => l.name));
                setHiddenLinks(links.slice(2).map(l => l.name));
                setOpen(false);
                return;
            }

            if (windowWidth >= 1025) {
                setVisibleLinks([]);
                setHiddenLinks(links.map(l => l.name));
                setOpen(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [links]);

    return (
        <>
            <header className="fixed flex flex-col items-start z-[40]">
                <div className="wrapper flex w-full items-center self-stretch gap-[24px] py-[16px]">
                    <Link href="/">
                        <svg xmlns="http://www.w3.org/2000/svg" width="163" height="20" viewBox="0 0 163 20" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M8.59231 0.200195H0V18.8737H8.59231V0.200195ZM30.0881 0.200195H21.4957V18.8737H30.0881V0.200195Z" fill="#132C5E" />
                            <path d="M45.9299 8.20962H55.3533V10.0573C55.3533 12.742 54.4923 14.9244 52.7703 16.5987C51.0422 18.249 48.8239 19.074 46.0913 19.074C43.2033 19.074 40.7996 18.1593 38.8862 16.3356C37.0206 14.5059 36.0879 12.2577 36.0879 9.57293C36.0879 6.88821 37.0206 4.6399 38.8862 2.77435C40.7518 0.926734 43.0718 0 45.8282 0C47.5563 0 49.1528 0.388622 50.6057 1.15996C52.0408 1.90737 53.1888 2.91795 54.02 4.21547L49.9719 6.48764C49.5952 5.90765 49.0391 5.45318 48.3096 5.10638C47.5802 4.74762 46.773 4.58012 45.888 4.58012C44.4111 4.58012 43.2033 5.04657 42.2586 5.98533C41.3138 6.94202 40.8355 8.14987 40.8355 9.59687C40.8355 11.0439 41.3019 12.2158 42.2227 13.1725C43.1674 14.1531 44.4889 14.6434 46.1691 14.6434C48.3456 14.6434 49.7746 13.8422 50.4682 12.2397H45.9299V8.21561V8.20962ZM74.2421 18.6854H69.0879L68.2926 16.0426H62.0681L61.2729 18.6854H56.0948L62.2654 0.400569H68.0774L74.248 18.6854H74.2421ZM65.1594 5.80592L63.2939 12.0245H67.0609L65.1594 5.80592ZM81.2499 0.400569V14.171H87.6896V18.6854H76.4784V0.400569H81.2439H81.2499ZM107.296 18.6854H102.141L101.346 16.0426H95.1219L94.3267 18.6854H89.1486L95.3192 0.400569H101.131L107.302 18.6854H107.296ZM98.2133 5.80592L96.3477 12.0245H100.115L98.2133 5.80592ZM123.637 0.400569H128.265V18.6854H123.637V8.8315L119.213 16.1741H118.746L114.345 8.85544V18.6854H109.681V0.400569H114.345L118.973 8.20962L123.637 0.400569ZM148.715 18.6854H143.572L142.765 16.0426H136.553L135.757 18.6854H130.579L136.738 0.400569H142.562L148.721 18.6854H148.715ZM139.644 5.80592L137.778 12.0245H141.545L139.644 5.80592ZM148.44 0.400569H162.449V4.915H157.827V18.6854H153.056V4.915H148.434V0.400569H148.44Z" fill="#132C5E" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M19.4888 0.417969H11.0459V18.1578H19.4888V0.417969Z" fill="#DB1D31" />
                        </svg>
                    </Link>
                    <div className="navigation flex justify-end items-center gap-[4px] lg:gap-[0]">
                        <div className="navigationContainer flex items-center">
                            <div className="navigationButtons hidden md:flex items-center">
                                <Dropdown>
                                    <DropdownTrigger>
                                        <Button
                                            className="group transition-all duration-300 hover:!bg-blue-900 hover:text-white flex items-center justify-center gap-1 h-[36px] min-w-[36px] min-h-[36px] px-[11px] py-[9px] rounded-[12px] border-[1.5px] border-[#F3F3F3] bg-white shadow-[0_1px_3px_rgba(0,0,0,0),0_4px_30px_rgba(0,0,0,0)]"
                                        >
                                            <svg
                                                className="transition-all duration-300 group-hover:[&_*]:fill-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M8.00033 1.3335C5.05481 1.3335 2.66699 4.00189 2.66699 7.00016C2.66699 9.97495 4.36921 13.2084 7.02504 14.4498C7.64415 14.7392 8.3565 14.7392 8.97561 14.4498C11.6314 13.2084 13.3337 9.97495 13.3337 7.00016C13.3337 4.00189 10.9458 1.3335 8.00033 1.3335ZM8.00033 8.00016C8.7367 8.00016 9.33366 7.40321 9.33366 6.66683C9.33366 5.93045 8.7367 5.3335 8.00033 5.3335C7.26395 5.3335 6.66699 5.93045 6.66699 6.66683C6.66699 7.40321 7.26395 8.00016 8.00033 8.00016Z"
                                                    fill="#1C274C"
                                                />
                                            </svg>
                                            <p className="navigationButtonTitle transition-all duration-300 hidden lg:!flex">
                                                {selectedKeysLabel}
                                            </p>
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu
                                        disallowEmptySelection
                                        aria-label="Выберите город"
                                        selectedKeys={new Set([selectedKeys])}
                                        selectionMode="single"
                                        variant="flat"
                                        style={{ display: "none" }}
                                    // onSelectionChange={(keys: Set<string>) => {
                                    //   const selected = Array.from(keys)[0];
                                    //   handleDropdownChange(selected);
                                    // }}
                                    >
                                        {cities.map((city) => (
                                            <DropdownItem key={city.key}>{city.label}</DropdownItem>
                                        ))}
                                    </DropdownMenu>
                                </Dropdown>
                                <Link
                                    href="/flats"
                                    className="group hidden lg:!flex transition-all duration-300 hover:!bg-blue-900 hover:text-white items-center justify-center gap-1 h-[36px] min-w-[36px] min-h-[36px] px-[11px] py-[9px] rounded-[12px] border-[1.5px] border-[#F3F3F3] bg-white shadow-[0_1px_3px_rgba(0,0,0,0),0_4px_30px_rgba(0,0,0,0)]"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        className="transition-all duration-300 group-hover:[&_*]:stroke-white"
                                    >
                                        <g clipPath="url(#clip0_622_10641)">
                                            <path d="M1.66699 4.33317C1.66699 3.07609 1.66699 2.44755 2.05752 2.05703C2.44804 1.6665 3.07658 1.6665 4.33366 1.6665C5.59074 1.6665 6.21928 1.6665 6.6098 2.05703C7.00033 2.44755 7.00033 3.07609 7.00033 4.33317C7.00033 5.59025 7.00033 6.21879 6.6098 6.60931C6.21928 6.99984 5.59074 6.99984 4.33366 6.99984C3.07658 6.99984 2.44804 6.99984 2.05752 6.60931C1.66699 6.21879 1.66699 5.59025 1.66699 4.33317Z" stroke="#1C274C" strokeWidth="1.5" />
                                            <path d="M9 11.6667C9 10.4096 9 9.78105 9.39052 9.39052C9.78105 9 10.4096 9 11.6667 9C12.9237 9 13.5523 9 13.9428 9.39052C14.3333 9.78105 14.3333 10.4096 14.3333 11.6667C14.3333 12.9237 14.3333 13.5523 13.9428 13.9428C13.5523 14.3333 12.9237 14.3333 11.6667 14.3333C10.4096 14.3333 9.78105 14.3333 9.39052 13.9428C9 13.5523 9 12.9237 9 11.6667Z" stroke="#1C274C" strokeWidth="1.5" />
                                            <path d="M1.66699 11.6667C1.66699 10.4096 1.66699 9.78105 2.05752 9.39052C2.44804 9 3.07658 9 4.33366 9C5.59074 9 6.21928 9 6.6098 9.39052C7.00033 9.78105 7.00033 10.4096 7.00033 11.6667C7.00033 12.9237 7.00033 13.5523 6.6098 13.9428C6.21928 14.3333 5.59074 14.3333 4.33366 14.3333C3.07658 14.3333 2.44804 14.3333 2.05752 13.9428C1.66699 13.5523 1.66699 12.9237 1.66699 11.6667Z" stroke="#1C274C" strokeWidth="1.5" />
                                            <path d="M9 4.33317C9 3.07609 9 2.44755 9.39052 2.05703C9.78105 1.6665 10.4096 1.6665 11.6667 1.6665C12.9237 1.6665 13.5523 1.6665 13.9428 2.05703C14.3333 2.44755 14.3333 3.07609 14.3333 4.33317C14.3333 5.59025 14.3333 6.21879 13.9428 6.60931C13.5523 6.99984 12.9237 6.99984 11.6667 6.99984C10.4096 6.99984 9.78105 6.99984 9.39052 6.60931C9 6.21879 9 5.59025 9 4.33317Z" stroke="#1C274C" strokeWidth="1.5" />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_622_10641">
                                                <rect width="16" height="16" rx="5" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p className="transition-all duration-300">{t("nav_real_estate")}</p>
                                </Link>
                            </div>
                            <ul className="navigationLinks hidden lg:!flex h-8 justify-center items-center flex" ref={containerRef}>
                                {links
                                    .filter((l) => visibleLinks.includes(l.name))
                                    .map((l) => (
                                        <li key={l.name}>
                                            <Link href={l.href} className="h-8 justify-center items-center flex">
                                                <p className="text-[15px]">{l.name}</p>
                                            </Link>
                                        </li>
                                    ))}

                                {hiddenLinks.length > 0 && (
                                    <li className="relative">
                                        <button
                                            onClick={() => setOpen((prev) => !prev)}
                                            className="navigationButton hidden lg:!flex pl-[6px]"
                                        >
                                            <MoreHorizontal />
                                        </button>

                                        {open && (
                                            <ul className="absolute right-[-130px] mt-2 w-40 rounded-lg bg-white shadow-md border border-gray-100 z-10">
                                                {hiddenLinks.map((name) => {
                                                    const link = links.find((l) => l.name === name);
                                                    return (
                                                        <li key={name}>
                                                            <Link
                                                                href={link?.href || "#"}
                                                                className="block px-4 py-2 text-sm hover:bg-gray-100"
                                                            >
                                                                {name}
                                                            </Link>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div className="navigationSublinks flex items-center">
                            <div className="navigationSublinksLang flex">
                                <Select
                                    selectedKeys={[selected]}
                                    onSelectionChange={handleSelectionChange}
                                    disallowEmptySelection
                                    classNames={{
                                        trigger: "langSelect",
                                        listbox: "langListbox",
                                        popoverContent: "langPopover",
                                        label: "langLabel",
                                        selectorIcon: "end-0",
                                    }}
                                    aria-labelledby="Выбор языка"
                                >
                                    {langs.map((lang) => (
                                        <SelectItem
                                            key={lang.key}
                                            hideSelectedIcon
                                            classNames={{
                                                title: "text-[13px]",
                                            }}
                                        >
                                            {lang.label}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>

                            <div className="navigationSublinksCallRequest transition-all duration-300 hover:!bg-blue-900 hover:text-white hidden lg:!flex h-8 justify-center items-center">
                                <button onClick={() => setIsDrawerOpen(true)}>
                                    <p className="font-medium">{t("call_request")}</p>
                                </button>
                            </div>

                            <div className="navigationSublinksAuth">
                                {user ? (
                                    <Link
                                        href={`/profile/${user.documentId}`}
                                        className="navigationSublinksAuthA font-medium flex h-8 justify-center items-center bg-blue-900 transition-all duration-300 hover:!bg-red-700 rounded-[12px] px-3 py-2 text-white no-underline"
                                    >
                                        <p className="navigationSublinksAuthP font-small">
                                            {[user.name].filter(Boolean).join(" ") || user.phone || "Профиль"}
                                        </p>
                                    </Link>
                                ) : (
                                    <Button onClick={() => dispatch(openAuth())} className="navigationSublinksAuthA font-medium flex h-8 justify-center items-center bg-blue-900 transition-all duration-300 hover:!bg-red-700">
                                        <p className="navigationSublinksAuthP font-small">Войти</p>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <LeaveRequestDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </>
    );
}
