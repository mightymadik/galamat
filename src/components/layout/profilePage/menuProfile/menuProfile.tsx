'use client'
import { useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useDispatch, useSelector } from "react-redux"
import { Button } from "@heroui/button"
import { RootState } from "@/store"
import PersonalInfo from "@/components/layout/profilePage/personalInfo/personalInfo"
import { logoutAuth } from "@/store/authThunks"
import BonusProfile from "@/components/layout/profilePage/bonusProfile/bonusProfile";
import ObjectProfile from "../objectProfile/objectProfile";
import LovelyProfile from "../lovelyProfile/lovelyProfile";
import ServiceProfile from "../serviceProfile/serviceProfile";
import DealsKanban from "../dealsKanban/DealsKanban";
import AgreementsList from "../agreementsList/AgreementsList";
import CashierPayments from "../cashierPayments/CashierPayments";
import { QueueProfile } from "../queueProfile";
import StatsProfile from "../statsProfile/statsProfile";

type MenuButtonProps = {
    id: string;
    iconActive: string; // белая иконка
    iconInactive: string; // черная иконка
    text: string;
    active: string;
    setActive: (id: string) => void;
};

const MenuButton: React.FC<MenuButtonProps> = ({ id, iconActive, iconInactive, text, active, setActive }) => {
    const isActive = active === id;

    return (
        <Button
            onClick={() => setActive(id)}
            className={`
                flex justify-start h-[64px] p-[16px]
                lg:pl-[21px] lg:pr-[21px] lg:py-[20px]
                items-center gap-[12px] min-w-[170px] rounded-[20px] w-full
                ${isActive ? "bg-[#1A3C7E]" : "bg-transparent"}
            `}
        >
            <img
                src={isActive ? iconActive : iconInactive}
                alt={text}
                width={25}
                height={25}
            />
            <span className={`${isActive ? "text-white" : "text-black"} text-[15px] font-medium`}>
                {text}
            </span>
        </Button>
    );
};

export default function MenuProfile() {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [active, setActive] = useState(() => {
        const section = searchParams.get("section");
        return section && section.trim() ? section.trim() : "profile";
    });
    const router = useRouter();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const isManager = user?.role === "manager" || user?.role === "admin";
    const isCashier = user?.role === "cashier" || user?.role === "admin";
    const isAdmin = user?.role === "admin";

    const setActiveAndSync = (id: string) => {
        setActive(id);
        const next = new URLSearchParams(searchParams.toString());
        if (id === "profile") next.delete("section");
        else next.set("section", id);
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    useEffect(() => {
        const section = searchParams.get("section");
        const next = section && section.trim() ? section.trim() : "profile";
        setActive((prev) => (prev === next ? prev : next));
    }, [searchParams]);

    const handleLogout = () => {
        dispatch(logoutAuth() as any).then(() => {
            router.replace("/");
        });
    };

    const renderContent = () => {
        switch (active) {
            case "profile":
                return <PersonalInfo />;
            case "stats":
                return <StatsProfile />;
            case "bonus":
                return <BonusProfile />;
            case "queue":
                return <QueueProfile />;
            case "objects":
                return <ObjectProfile />;
            case "deals":
                return <DealsKanban />;
            case "agreements":
                return <AgreementsList />;
            case "cashier":
                return <CashierPayments />;
            case "favorite":
                return <LovelyProfile />;
            case "service":
                return <ServiceProfile />;
            default:
                return null;
        }
    };

    return (
        <div className="wrapper flex flex-col-reverse lg:flex-row gap-[32px]">
            <div className="hidden lg:flex max-w-[308px] flex-col items-start gap-[16px]">
                <div className="flex p-[16px] flex-col items-start self-stretch rounded-[32px] bg-[#F4F6FB]">
                    <MenuButton id="profile" iconActive="/img/profile-white.svg" iconInactive="/img/profile-black.svg" text={t("profile")} active={active} setActive={setActiveAndSync} />
                    {isAdmin && <MenuButton id="stats" iconActive="/img/stats-white.svg" iconInactive="/img/stats-black.svg" text={t("stats")} active={active} setActive={setActiveAndSync} />}
                    {isAdmin && <MenuButton id="queue" iconActive="/img/queue-white.svg" iconInactive="/img/queue-black.svg" text={t("queue")} active={active} setActive={setActiveAndSync} />}
                    {isManager && <MenuButton id="deals" iconActive="/img/tag-white.svg" iconInactive="/img/tag-black.svg" text={t("deals")} active={active} setActive={setActiveAndSync} />}
                    {isManager && <MenuButton id="agreements" iconActive="/img/agreement-white.svg" iconInactive="/img/agreement-black.svg" text={t("agreements")} active={active} setActive={setActiveAndSync} />}
                    {isCashier && <MenuButton id="cashier" iconActive="/img/cash-white.svg" iconInactive="/img/cash-black.svg" text={t("cashier")} active={active} setActive={setActiveAndSync} />}
                    <MenuButton id="bonus" iconActive="/img/ticket-white.svg" iconInactive="/img/ticket-black.svg" text={t("gala_bonus_menu")} active={active} setActive={setActiveAndSync} />
                    <MenuButton id="objects" iconActive="/img/home-white.svg" iconInactive="/img/home-black.svg" text={t("my_objects")} active={active} setActive={setActiveAndSync} />
                    <MenuButton id="favorite" iconActive="/img/lovely-white.svg" iconInactive="/img/lovely-black.svg" text={t("favorites")} active={active} setActive={setActiveAndSync} />
                </div>

                <div className="flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center self-stretch">
                    <Button
                        onClick={handleLogout}
                        className="flex bg-transparent w-full h-[44px] min-w-[44px] min-h-[44px] gap-[4px] pl-[13px] pr-[13px] py-[11px] justify-center items-center self-stretch rounded-[12px] !border-[1px] !border-solid !border-[#DB1D31]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="15" viewBox="0 0 13 15" fill="none">
                            <path d="M2.14645 7.52022C1.95119 7.32496 1.95119 7.00838 2.14645 6.81311L3.47978 5.47978C3.67504 5.28452 3.99163 5.28452 4.18689 5.47978C4.38215 5.67504 4.38215 5.99163 4.18689 6.18689L3.70711 6.66667L8.5 6.66667C8.77614 6.66667 9 6.89053 9 7.16667C9 7.44281 8.77614 7.66667 8.5 7.66667L3.70711 7.66667L4.18689 8.14645C4.38215 8.34171 4.38215 8.65829 4.18689 8.85355C3.99163 9.04882 3.67504 9.04882 3.47978 8.85355L2.14645 7.52022Z" fill="#DB1D31" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M7.7969 3.53346e-07H8.53673C9.44845 -1.31174e-05 10.1833 -2.3976e-05 10.7613 0.0776829C11.3614 0.158361 11.8666 0.330956 12.2679 0.732234C12.6692 1.13351 12.8418 1.63876 12.9225 2.23883C13.0002 2.81681 13.0002 3.55169 13.0001 4.46342V9.86991C13.0002 10.7816 13.0002 11.5165 12.9225 12.0945C12.8418 12.6946 12.6692 13.1998 12.2679 13.6011C11.8666 14.0024 11.3614 14.175 10.7613 14.2557C10.1833 14.3334 9.44845 14.3333 8.53672 14.3333H7.7969C6.88517 14.3333 6.15029 14.3334 5.57231 14.2557C4.97224 14.175 4.46699 14.0024 4.06571 13.6011C3.79975 13.3351 3.63379 13.0229 3.5287 12.6666C2.89445 12.6657 2.36604 12.6587 1.93792 12.6012C1.42862 12.5327 0.987066 12.3845 0.634604 12.0321C0.282141 11.6796 0.133953 11.238 0.0654796 10.7287C-2.77559e-05 10.2415 -1.50606e-05 9.62436 4.76515e-07 8.86915V5.46421C-1.50606e-05 4.70899 -2.77559e-05 4.09183 0.0654796 3.60459C0.133953 3.09529 0.282141 2.65373 0.634604 2.30127C0.987066 1.94881 1.42862 1.80062 1.93792 1.73215C2.36604 1.67459 2.89445 1.66761 3.5287 1.66678C3.63379 1.31041 3.79975 0.998192 4.06571 0.732234C4.46699 0.330956 4.97224 0.158361 5.57231 0.0776829C6.15029 -2.3976e-05 6.88517 -1.31174e-05 7.7969 3.53346e-07ZM3.33464 10.5028C3.33704 10.9325 3.34413 11.3195 3.36856 11.6661C2.81224 11.6639 2.39867 11.6541 2.07117 11.6101C1.67276 11.5565 1.4774 11.4607 1.34171 11.325C1.20602 11.1893 1.11013 10.9939 1.05656 10.5955C1.00106 10.1827 1 9.63314 1 8.83333V5.5C1 4.70019 1.00106 4.15063 1.05656 3.73784C1.11013 3.33943 1.20602 3.14407 1.34171 3.00838C1.4774 2.87268 1.67276 2.77679 2.07117 2.72323C2.39867 2.6792 2.81224 2.66943 3.36856 2.66727C3.34413 3.01382 3.33704 3.40086 3.33464 3.83055C3.33311 4.10669 3.55572 4.33179 3.83185 4.33333C4.10799 4.33486 4.33309 4.11226 4.33463 3.83612C4.33869 3.10712 4.35762 2.5904 4.42965 2.19823C4.49906 1.82036 4.61052 1.60164 4.77282 1.43934C4.95733 1.25483 5.21638 1.13453 5.70556 1.06877C6.20913 1.00106 6.87653 1 7.83348 1H8.50015C9.45709 1 10.1245 1.00106 10.6281 1.06877C11.1172 1.13453 11.3763 1.25483 11.5608 1.43934C11.7453 1.62385 11.8656 1.8829 11.9314 2.37208C11.9991 2.87565 12.0001 3.54306 12.0001 4.5V9.83333C12.0001 10.7903 11.9991 11.4577 11.9314 11.9613C11.8656 12.4504 11.7453 12.7095 11.5608 12.894C11.3763 13.0785 11.1172 13.1988 10.6281 13.2646C10.1245 13.3323 9.45709 13.3333 8.50015 13.3333H7.83348C6.87653 13.3333 6.20913 13.3323 5.70556 13.2646C5.21638 13.1988 4.95733 13.0785 4.77282 12.894C4.61052 12.7317 4.49906 12.513 4.42965 12.1351C4.35762 11.7429 4.33869 11.2262 4.33463 10.4972C4.33309 10.2211 4.10799 9.99847 3.83185 10C3.55572 10.0015 3.33311 10.2266 3.33464 10.5028Z" fill="#DB1D31" />
                        </svg>
                        <span className="text-[#DB1D31] text-[15px]">{t("logout")}</span>
                    </Button>
                </div>
            </div>
            <div className="flex bottom-0 mb-[86px] lg:hidden h-auto w-full min-w-[343px] px-[12px] py-[8px] items-start rounded-[32px] bg-[rgba(28,_39,_76,_0.04)] backdrop-filter backdrop-blur-[10px] overflow-x-auto overflow-y-hidden scrollbar-hide">
                <MenuButton id="profile" iconActive="/img/profile-white.svg" iconInactive="/img/profile-black.svg" text={t("profile")} active={active} setActive={setActiveAndSync} />
                {isAdmin && <MenuButton id="stats" iconActive="/img/stats-white.svg" iconInactive="/img/stats-black.svg" text={t("stats")} active={active} setActive={setActiveAndSync} />}
                {isAdmin && <MenuButton id="queue" iconActive="/img/queue-white.svg" iconInactive="/img/queue-black.svg" text={t("queue")} active={active} setActive={setActiveAndSync} />}
                {isManager && <MenuButton id="deals" iconActive="/img/tag-white.svg" iconInactive="/img/tag-black.svg" text={t("deals")} active={active} setActive={setActiveAndSync} />}
                {isManager && <MenuButton id="agreements" iconActive="/img/agreement-white.svg" iconInactive="/img/agreement-black.svg" text={t("agreements")} active={active} setActive={setActiveAndSync} />}
                {isCashier && <MenuButton id="cashier" iconActive="/img/cash-white.svg" iconInactive="/img/cash-black.svg" text={t("cashier")} active={active} setActive={setActiveAndSync} />}
                <MenuButton id="bonus" iconActive="/img/ticket-white.svg" iconInactive="/img/ticket-black.svg" text={t("gala_bonus_menu")} active={active} setActive={setActiveAndSync} />
                <MenuButton id="objects" iconActive="/img/home-white.svg" iconInactive="/img/home-black.svg" text={t("my_objects")} active={active} setActive={setActiveAndSync} />
                <MenuButton id="favorite" iconActive="/img/lovely-white.svg" iconInactive="/img/lovely-black.svg" text={t("favorites")} active={active} setActive={setActiveAndSync} />
            </div>

            {renderContent()}
        </div>
    );
}
