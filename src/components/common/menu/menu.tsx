"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@heroui/react";
import "./menu.scss";
import "tailwindcss";

export default function Menu() {
    const t = useTranslations();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const threshold = 50; // порог в пикселях, можно менять
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = (index: number, link?: string) => {
        // Если у пункта есть ссылка → переходим
        if (link) {
            router.push(link);
            return;
        }

        // Иначе — твоя старая логика
        if (index === 2) {
            setIsDrawerOpen((prev) => !prev);
            setActiveIndex(index);
        } else {
            setActiveIndex(index);
            setIsDrawerOpen(false);
        }
    };

    // Управление body overflow при открытии drawer
    useEffect(() => {
        document.body.style.overflow = isDrawerOpen ? "hidden" : "auto";
    }, [isDrawerOpen]);

    // Логика показа/скрытия меню при скролле
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (Math.abs(currentScrollY - lastScrollY) < threshold) {
                // Если движение меньше порога — игнорируем
                return;
            }

            if (currentScrollY < lastScrollY) {
                // скролл вверх — показываем меню
                setShowMenu(true);
            } else if (currentScrollY > lastScrollY) {
                // скролл вниз — скрываем меню
                setShowMenu(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll);

        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);
    const menuItems = [
        {
            title: t("nav_projects"),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className="transition-all duration-300">
                    <path d="M6 8C6 5.17157 6 3.75736 6.87868 2.87868C7.75736 2 9.17157 2 12 2C14.8284 2 16.2426 2 17.1213 2.87868C18 3.75736 18 5.17157 18 8V16C18 18.8284 18 20.2426 17.1213 21.1213C16.2426 22 14.8284 22 12 22C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V8Z" stroke="#1A3C7E" strokeWidth="1.5" />
                    <path d="M18 19.5C19.4001 19.5 20.1002 19.5 20.635 19.2275C21.1054 18.9878 21.4878 18.6054 21.7275 18.135C22 17.6002 22 16.9001 22 15.5V8.5C22 7.09987 22 6.3998 21.7275 5.86502C21.4878 5.39462 21.1054 5.01217 20.635 4.77248C20.1002 4.5 19.4001 4.5 18 4.5" stroke="#1A3C7E" strokeWidth="1.5" />
                    <path d="M6 19.5C4.59987 19.5 3.8998 19.5 3.36502 19.2275C2.89462 18.9878 2.51217 18.6054 2.27248 18.135C2 17.6002 2 16.9001 2 15.5V8.5C2 7.09987 2 6.3998 2.27248 5.86502C2.51217 5.39462 2.89462 5.01217 3.36502 4.77248C3.8998 4.5 4.59987 4.5 6 4.5" stroke="#1A3C7E" strokeWidth="1.5" />
                </svg>
            ),
            link: ("/project"),
        },
        {
            title: t("nav_flats"),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none" className="transition-all duration-300">
                    <path d="M21.75 0.75H3.75C2.09315 0.75 0.75 2.09315 0.75 3.75V21.75C0.75 23.4069 2.09315 24.75 3.75 24.75H21.75C23.4069 24.75 24.75 23.4069 24.75 21.75V3.75C24.75 2.09315 23.4069 0.75 21.75 0.75Z" stroke="#1A3C7E" strokeWidth="1.5" />
                    <path d="M21.75 16.4423H17.5962C15.9393 16.4423 14.5962 17.7854 14.5962 19.4423V21.75C14.5962 23.4068 15.9393 24.75 17.5962 24.75H21.75C23.4069 24.75 24.75 23.4068 24.75 21.75V19.4423C24.75 17.7854 23.4069 16.4423 21.75 16.4423Z" stroke="#1A3C7E" strokeWidth="1.5" />
                    <path d="M10.9038 0.75H21.75C23.4068 0.75 24.75 2.09315 24.75 3.75V8.82693C24.75 10.4838 23.4068 11.8269 21.75 11.8269H16.4423" stroke="#1A3C7E" strokeWidth="1.5" />
                    <path d="M10.9038 11.8269V0.75" stroke="#1A3C7E" strokeWidth="1.5" />
                    <path d="M8.13463 24.75V19.4423C8.13463 17.7854 6.79148 16.4423 5.13463 16.4423H4.44232" stroke="#1A3C7E" strokeWidth="1.5" />
                    <path d="M10.9038 11.8269H3.75C2.09315 11.8269 0.75 10.4838 0.75 8.82692V3.75C0.75 2.09314 2.09315 0.75 3.75 0.75H10.9038" stroke="#1A3C7E" strokeWidth="1.5" />
                </svg>
            ),
            link: ("/flats")
        },
        {
            title: t("nav_more"),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className="transition-all duration-300">
                    <path d="M7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12Z" fill="#1A3C7E" />
                    <path d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z" fill="#1A3C7E" />
                    <path d="M21 12C21 13.1046 20.1046 14 19 14C17.8954 14 17 13.1046 17 12C17 10.8954 17.8954 10 19 10C20.1046 10 21 10.8954 21 12Z" fill="#1A3C7E" />
                </svg>
            ),
        },
    ];

    return (
        <><><div
            className={`menu flex lg:!hidden fixed bottom-0 left-0 w-full flex-col justify-end items-start z-50 transition-transform duration-300 ${showMenu ? "translate-y-0" : "translate-y-full"
                }`}
        >
            <div className="menuContainer flex flex-col items-start self-stretch justify-center">
                <div className="menuContainerLayout flex items-start self-stretch">
                    <div className="menuItems flex w-full justify-around items-center">
                        {menuItems.map((item, index) => (
                            <div
                                key={index}
                                onClick={() => handleClick(index, item.link)}
                                className={`menuItem flex w-32 flex-col items-center flex-shrink-0 cursor-pointer transition-all duration-500 ease-in-out
            ${pathname === item.link
                                        ? "opacity-100 font-semibold scale-105"
                                        : "opacity-80 font-normal scale-100"
                                    }`}
                            >
                                <div className="transition-all duration-500 ease-in-out">
                                    {item.icon}
                                </div>
                                <p
                                    className={`text-blue-900 flex justify-center items-center self-stretch text-center not-italic transition-all duration-500 ease-in-out
                                            ${activeIndex === index ? "font-semibold" : "font-normal"}
                                        `}
                                >
                                    {item.title}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
            <div
                className={`drawer overflow-y-auto fixed flex flex-col items-start left-0 bottom-0 w-full bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-500 ease-in-out z-40
                    ${isDrawerOpen ? "translate-y-0" : "translate-y-full"}`}
            >
                <div className="drawerHeader flex justify-between items-center self-stretch">
                    <div className="drawerHeaderLogo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="163" height="20" viewBox="0 0 163 20" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M8.59231 0.200195H0V18.8737H8.59231V0.200195ZM30.0881 0.200195H21.4957V18.8737H30.0881V0.200195Z" fill="#132C5E" />
                            <path d="M45.9299 8.20962H55.3533V10.0573C55.3533 12.742 54.4923 14.9244 52.7703 16.5987C51.0422 18.249 48.8239 19.074 46.0913 19.074C43.2033 19.074 40.7996 18.1593 38.8862 16.3356C37.0206 14.5059 36.0879 12.2577 36.0879 9.57293C36.0879 6.88821 37.0206 4.6399 38.8862 2.77435C40.7518 0.926734 43.0718 0 45.8282 0C47.5563 0 49.1528 0.388622 50.6057 1.15996C52.0408 1.90737 53.1888 2.91795 54.02 4.21547L49.9719 6.48764C49.5952 5.90765 49.0391 5.45318 48.3096 5.10638C47.5802 4.74762 46.773 4.58012 45.888 4.58012C44.4111 4.58012 43.2033 5.04657 42.2586 5.98533C41.3138 6.94202 40.8355 8.14987 40.8355 9.59687C40.8355 11.0439 41.3019 12.2158 42.2227 13.1725C43.1674 14.1531 44.4889 14.6434 46.1691 14.6434C48.3456 14.6434 49.7746 13.8422 50.4682 12.2397H45.9299V8.21561V8.20962ZM74.2421 18.6854H69.0879L68.2926 16.0426H62.0681L61.2729 18.6854H56.0948L62.2654 0.400569H68.0774L74.248 18.6854H74.2421ZM65.1594 5.80592L63.2939 12.0245H67.0609L65.1594 5.80592ZM81.2499 0.400569V14.171H87.6896V18.6854H76.4784V0.400569H81.2439H81.2499ZM107.296 18.6854H102.141L101.346 16.0426H95.1219L94.3267 18.6854H89.1486L95.3192 0.400569H101.131L107.302 18.6854H107.296ZM98.2133 5.80592L96.3477 12.0245H100.115L98.2133 5.80592ZM123.637 0.400569H128.265V18.6854H123.637V8.8315L119.213 16.1741H118.746L114.345 8.85544V18.6854H109.681V0.400569H114.345L118.973 8.20962L123.637 0.400569ZM148.715 18.6854H143.572L142.765 16.0426H136.553L135.757 18.6854H130.579L136.738 0.400569H142.562L148.721 18.6854H148.715ZM139.644 5.80592L137.778 12.0245H141.545L139.644 5.80592ZM148.44 0.400569H162.449V4.915H157.827V18.6854H153.056V4.915H148.434V0.400569H148.44Z" fill="#132C5E" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M19.4888 0.417969H11.0459V18.1578H19.4888V0.417969Z" fill="#DB1D31" />
                        </svg>
                    </div>
                    <div className="drawerHeaderClose">
                        <button onClick={() => setIsDrawerOpen(false)} type="button" className="flex justify-center w-8 h-8 p-2 items-center bg-gray-100 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M10.6464 0.146447C10.8417 -0.0488153 11.1582 -0.0488155 11.3535 0.146447C11.5487 0.341712 11.5487 0.658228 11.3535 0.853478L6.45699 5.74996L11.3535 10.6464C11.5487 10.8417 11.5487 11.1582 11.3535 11.3535C11.1582 11.5487 10.8417 11.5487 10.6464 11.3535L5.74996 6.45699L0.853478 11.3535C0.658228 11.5487 0.341712 11.5487 0.146447 11.3535C-0.0488155 11.1582 -0.0488155 10.8417 0.146447 10.6464L5.04293 5.74996L0.146447 0.853478C-0.0488155 0.658216 -0.0488155 0.341709 0.146447 0.146447C0.341709 -0.0488155 0.658216 -0.0488155 0.853478 0.146447L5.74996 5.04293L10.6464 0.146447Z" fill="#122C5E" />
                        </svg></button>
                    </div>
                </div>
                <div className="drawerNavigation flex !p-4 justify-center items-center">
                    <div className="drawerNavigationItem flex flex-col items-center">
                        <Link onClick={() => setIsDrawerOpen(false)} href="/project" className="flex h-8 justify-center items-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 5.33325C4 3.44763 4 2.50482 4.58579 1.91904C5.17157 1.33325 6.11438 1.33325 8 1.33325C9.88562 1.33325 10.8284 1.33325 11.4142 1.91904C12 2.50482 12 3.44763 12 5.33325V10.6666C12 12.5522 12 13.495 11.4142 14.0808C10.8284 14.6666 9.88562 14.6666 8 14.6666C6.11438 14.6666 5.17157 14.6666 4.58579 14.0808C4 13.495 4 12.5522 4 10.6666V5.33325Z" stroke="#1C274C" strokeWidth="1.5" />
                            <path d="M12 13C12.9334 13 13.4001 13 13.7567 12.8183C14.0703 12.6586 14.3252 12.4036 14.485 12.09C14.6667 11.7335 14.6667 11.2668 14.6667 10.3333V5.66667C14.6667 4.73325 14.6667 4.26654 14.485 3.91002C14.3252 3.59641 14.0703 3.34144 13.7567 3.18166C13.4001 3 12.9334 3 12 3" stroke="#1C274C" strokeWidth="1.5" />
                            <path d="M4.00001 13C3.06659 13 2.59988 13 2.24336 12.8183C1.92976 12.6586 1.67479 12.4036 1.515 12.09C1.33334 11.7335 1.33334 11.2668 1.33334 10.3333V5.66667C1.33334 4.73325 1.33334 4.26654 1.515 3.91002C1.67479 3.59641 1.92976 3.34144 2.24336 3.18166C2.59988 3 3.06659 3 4.00001 3" stroke="#1C274C" strokeWidth="1.5" />
                        </svg></Link>
                        <p className="self-stretch text-black text-center text-xs not-italic font-normal leading-5">{t("nav_projects")}</p>
                    </div>
                    <div className="drawerNavigationItem flex flex-col items-center">
                        <Button type="button" className="p-![0px]" onClick={() => setIsDrawerOpen(false)}>
                            <Link className="flex h-8 justify-center items-center" href="/flats">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M13.75 0.75H3.75C2.09315 0.75 0.75 2.09315 0.75 3.75V13.75C0.75 15.4069 2.09315 16.75 3.75 16.75H13.75C15.4069 16.75 16.75 15.4069 16.75 13.75V3.75C16.75 2.09315 15.4069 0.75 13.75 0.75Z" stroke="#1C274C" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M13.9808 11.2115H12.75C11.2206 11.2115 9.98077 12.4514 9.98077 13.9808C9.98077 15.5102 11.2206 16.75 12.75 16.75H13.9808C15.5102 16.75 16.75 15.5102 16.75 13.9808C16.75 12.4514 15.5102 11.2115 13.9808 11.2115Z" stroke="#1C274C" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7.51923 0.75H13.75C15.4069 0.75 16.75 2.09315 16.75 3.75V5.13461C16.75 6.79147 15.4068 8.13462 13.75 8.13462H11.2115" stroke="#1C274C" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7.51923 8.13462V0.75" stroke="#1C274C" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M5.67309 16.75V13.6731C5.67309 12.3136 4.57102 11.2115 3.21155 11.2115" stroke="#1C274C" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7.51923 8.13462H3.75C2.09315 8.13462 0.75 6.79147 0.75 5.13462V3.75C0.75 2.09315 2.09315 0.75 3.75 0.75H7.51923" stroke="#1C274C" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        </Button>
                        <p className="self-stretch text-black text-center text-xs not-italic font-normal leading-5">{t("nav_flats")}</p>
                    </div>
                    <div className="drawerNavigationItem flex flex-col items-center">
                        <Button type="button" className="p-![0px]" onClick={() => setIsDrawerOpen(false)}>
                            <Link className="flex h-8 justify-center items-center" href="/profile">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <ellipse cx="7.99998" cy="3.99992" rx="2.66667" ry="2.66667" stroke="#1C274C" strokeWidth="1.5" />
                                    <path d="M13.3334 11.6667C13.3334 13.3236 13.3334 14.6667 8.00002 14.6667C2.66669 14.6667 2.66669 13.3236 2.66669 11.6667C2.66669 10.0099 5.0545 8.66675 8.00002 8.66675C10.9455 8.66675 13.3334 10.0099 13.3334 11.6667Z" stroke="#1C274C" strokeWidth="1.5" />
                                </svg>
                            </Link>
                        </Button>
                        <p className="self-stretch text-black text-center text-xs not-italic font-normal leading-5">{t("profile")}</p>
                    </div>
                </div>
                <div className="drawerMenu flex !p-4 flex-col items-start">
                    <Link onClick={() => setIsDrawerOpen(false)} className="drawerMenuButton flex h-10 items-center self-stretch justify-between p-![0px]" href="/why-us">
                        <div className="drawerMenuButtonLogoAndTitle flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M14.6667 7.99992C14.6667 11.6818 11.6819 14.6666 8.00001 14.6666C4.31811 14.6666 1.33334 11.6818 1.33334 7.99992C1.33334 4.31802 4.31811 1.33325 8.00001 1.33325C11.6819 1.33325 14.6667 4.31802 14.6667 7.99992ZM8.00001 5.16659C7.5858 5.16659 7.25001 5.50237 7.25001 5.91659C7.25001 6.19273 7.02615 6.41659 6.75001 6.41659C6.47387 6.41659 6.25001 6.19273 6.25001 5.91659C6.25001 4.95009 7.03351 4.16659 8.00001 4.16659C8.96651 4.16659 9.75001 4.95009 9.75001 5.91659C9.75001 6.39048 9.56099 6.82124 9.25532 7.13589C9.19381 7.19921 9.13513 7.25783 9.07916 7.31376C8.93527 7.45752 8.80921 7.58348 8.69861 7.72558C8.55259 7.9132 8.50001 8.05109 8.50001 8.16659V8.66659C8.50001 8.94273 8.27615 9.16659 8.00001 9.16659C7.72387 9.16659 7.50001 8.94273 7.50001 8.66659V8.16659C7.50001 7.72979 7.70335 7.37621 7.90946 7.11139C8.06196 6.91545 8.25364 6.72415 8.40919 6.56889C8.45612 6.52206 8.49976 6.47851 8.53804 6.4391C8.66973 6.30354 8.75001 6.11995 8.75001 5.91659C8.75001 5.50237 8.41422 5.16659 8.00001 5.16659ZM8.00001 11.3333C8.3682 11.3333 8.66668 11.0348 8.66668 10.6666C8.66668 10.2984 8.3682 9.99992 8.00001 9.99992C7.63182 9.99992 7.33334 10.2984 7.33334 10.6666C7.33334 11.0348 7.63182 11.3333 8.00001 11.3333Z" fill="#1C274C" />
                            </svg>
                            <p>{t("nav_why_us")}</p>
                        </div>
                        <svg className="self-stretch" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 3.33325L10 7.99992L6 12.6666" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <Link onClick={() => setIsDrawerOpen(false)} className="drawerMenuButton flex h-10 items-center self-stretch justify-between p-![0px]" href="/gala-bonus">
                        <div className="drawerMenuButtonLogoAndTitle flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M9.3386 12.6687L9.34247 11.3334C9.34247 10.9652 9.64169 10.6667 10.0108 10.6667C10.3799 10.6667 10.6791 10.9652 10.6791 11.3334V12.6511C10.6791 12.9721 10.6791 13.1326 10.7821 13.231C10.885 13.3294 11.0425 13.3228 11.3575 13.3094C12.5994 13.2569 13.3624 13.0889 13.9003 12.5524C14.4394 12.0146 14.6073 11.2512 14.6596 10.0071C14.67 9.76039 14.6752 9.63703 14.6291 9.55473C14.583 9.47243 14.3991 9.36972 14.0313 9.16431C13.6228 8.93618 13.3466 8.5003 13.3466 8.00008C13.3466 7.49986 13.6228 7.06398 14.0313 6.83585C14.3991 6.63044 14.583 6.52773 14.6291 6.44543C14.6752 6.36313 14.67 6.23977 14.6596 5.99306C14.6073 4.74901 14.4394 3.98557 13.9003 3.4478C13.3151 2.86411 12.4635 2.71662 11.0185 2.67935C10.8321 2.67454 10.6791 2.82487 10.6791 3.01087V4.66675C10.6791 5.03494 10.3799 5.33341 10.0108 5.33341C9.64169 5.33341 9.34247 5.03494 9.34247 4.66675L9.33763 2.99912C9.3371 2.8154 9.18764 2.66675 9.00347 2.66675H6.66335C4.14293 2.66675 2.88272 2.66675 2.09973 3.4478C1.56062 3.98557 1.3927 4.74901 1.3404 5.99306C1.33002 6.23977 1.32484 6.36313 1.37091 6.44543C1.41698 6.52773 1.60089 6.63044 1.96873 6.83585C2.37725 7.06398 2.65339 7.49986 2.65339 8.00008C2.65339 8.5003 2.37725 8.93618 1.96873 9.16431C1.6009 9.36972 1.41698 9.47243 1.37091 9.55473C1.32484 9.63703 1.33002 9.76039 1.3404 10.0071C1.3927 11.2512 1.56062 12.0146 2.09973 12.5524C2.88272 13.3334 4.14293 13.3334 6.66335 13.3334H8.67027C8.98449 13.3334 9.1416 13.3334 9.23942 13.2361C9.33723 13.1388 9.33769 12.9821 9.3386 12.6687ZM10.6791 8.66675V7.33341C10.6791 6.96522 10.3799 6.66675 10.0108 6.66675C9.64169 6.66675 9.34247 6.96522 9.34247 7.33341V8.66675C9.34247 9.03494 9.64169 9.33341 10.0108 9.33341C10.3799 9.33341 10.6791 9.03494 10.6791 8.66675Z" fill="#1C274C" />
                            </svg>
                            <p>Gala Bonus</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 3.33325L10 7.99992L6 12.6666" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <Link onClick={() => setIsDrawerOpen(false)} className="drawerMenuButton flex h-10 items-center self-stretch justify-between p-![0px]" href="/#news">
                        <div className="drawerMenuButtonLogoAndTitle flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M2.78105 2.1143C2 2.89535 2 4.15243 2 6.66659V9.33325C2 11.8474 2 13.1045 2.78105 13.8855C3.5621 14.6666 4.81918 14.6666 7.33333 14.6666H8.66667C11.1808 14.6666 12.4379 14.6666 13.219 13.8855C14 13.1045 14 11.8474 14 9.33325V6.66659C14 4.15243 14 2.89535 13.219 2.1143C12.4379 1.33325 11.1808 1.33325 8.66667 1.33325H7.33333C4.81918 1.33325 3.5621 1.33325 2.78105 2.1143ZM5.33333 6.16659C5.05719 6.16659 4.83333 6.39044 4.83333 6.66659C4.83333 6.94273 5.05719 7.16659 5.33333 7.16659H10.6667C10.9428 7.16659 11.1667 6.94273 11.1667 6.66659C11.1667 6.39044 10.9428 6.16659 10.6667 6.16659H5.33333ZM5.33333 8.83325C5.05719 8.83325 4.83333 9.05711 4.83333 9.33325C4.83333 9.60939 5.05719 9.83325 5.33333 9.83325H8.66667C8.94281 9.83325 9.16667 9.60939 9.16667 9.33325C9.16667 9.05711 8.94281 8.83325 8.66667 8.83325H5.33333Z" fill="#1C274C" />
                            </svg>
                            <p>{t("news")}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 3.33325L10 7.99992L6 12.6666" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
                <div className="drawerContact flex !p-4 flex-col items-start">
                    <h1 className="drawerContactTitle self-stretch text-base not-italic font-medium">{t("call_request")}</h1>
                    <Link href="tel: +77001085757" className="drawerContactButton flex h-10 items-center self-stretch p-0 !border-none">
                        <div className="drawerMenuButtonLogoAndTitle flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M11.0374 8.60427L10.7338 8.90618C10.7338 8.90618 10.0121 9.62381 8.04207 7.66499C6.07207 5.70617 6.79379 4.98854 6.79379 4.98854L6.985 4.79842C7.45604 4.33006 7.50044 3.5781 7.08948 3.02915L6.24883 1.90622C5.74018 1.22677 4.7573 1.13702 4.17429 1.71672L3.12789 2.75717C2.83881 3.04461 2.64509 3.41722 2.66858 3.83057C2.72868 4.88804 3.20713 7.16327 5.8769 9.81787C8.70808 12.633 11.3645 12.7449 12.4508 12.6436C12.7944 12.6116 13.0933 12.4366 13.3341 12.1971L14.2811 11.2555C14.9204 10.6198 14.7401 9.53012 13.9222 9.08549L12.6485 8.3931C12.1115 8.10115 11.4572 8.18692 11.0374 8.60427Z" fill="#1C274C" />
                            </svg><p>+7-700-108-57-57</p></div></Link>
                </div>
            </div>
            <div
                className={`fixed inset-0 z-30 transition-opacity duration-500 ${isDrawerOpen ? "visible bg-black/80" : "invisible bg-transparent"
                    }`}
                onClick={() => setIsDrawerOpen(false)}
            />
        </></>
    );
}
