import IconProjects from "@/components/common/icons/icon-projects";
import Link from "next/link";
import { SITE_URL } from "@/utils/consts";
import IconProjectsTwo from "@/components/common/icons/icon-projects-two";
import IconGalaBonus from "@/components/common/icons/icon-gala-bonus";
import IconCompany from "@/components/common/icons/icon-company";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useTranslate } from "@/hooks/useTranslate";

function MobileBottomMenu() {
  const $t = useTranslate();
  const pathname = usePathname();

  return (
    <div className="fixed left-0 bottom-[env(safe-area-inset-bottom)] w-full h-[73px] z-[1] rounded-[11px_11px_0_0] bg-white grid sm:hidden grid-cols-5 px-5 pb-4 ">
      <Link href={SITE_URL.REAL_ESTATE} className="flex-je-c gap-2 flex-col">
        <IconProjects
          className={
            pathname.includes(SITE_URL.REAL_ESTATE)
              ? "fill-[#132C5E]"
              : "fill-[#A1ACC3]"
          }
        />
        <span
          className={clsx("text-[8px] font-medium text-[#A1ACC3]", {
            "!text-[#132C5E]": pathname.includes(SITE_URL.REAL_ESTATE),
          })}
        >
          {$t("real_estate")}
        </span>
      </Link>
      <Link href={SITE_URL.PROJECTS} className="flex-je-c gap-2 flex-col">
        <IconProjectsTwo
          className={
            pathname.includes(SITE_URL.PROJECTS)
              ? "fill-[#132C5E]"
              : "fill-[#A1ACC3]"
          }
        />
        <span
          className={clsx("text-[8px] font-medium text-[#A1ACC3]", {
            "!text-[#132C5E]": pathname.includes(SITE_URL.PROJECTS),
          })}
        >
          {$t("projects")}
        </span>
      </Link>

      <Link
        href="tel: +7 700 108 5757"
        className="flex-je-c gap-2 flex-col mt-[-33px]"
      >
        <div className="w-[54px] h-[54px] bg-[#B31623] rounded-[19px] flex-jc-c text-white text-[20px]">
          <i className="fa-solid fa-phone"></i>
        </div>
        <span className="text-[8px] font-medium text-[#A1ACC3]">
          {$t("contact")}
        </span>
      </Link>

      <Link href={SITE_URL.SALES} className="flex-je-c gap-2 flex-col">
        <IconGalaBonus
          className={
            pathname.includes(SITE_URL.SALES)
              ? "fill-[#132C5E]"
              : "fill-[#A1ACC3]"
          }
        />
        <span
          className={clsx("text-[8px] font-medium text-[#A1ACC3]", {
            "!text-[#132C5E]": pathname.includes(SITE_URL.SALES),
          })}
        >
          Gala Bonus
        </span>
      </Link>
      <Link href={SITE_URL.OUR_COMPANY} className="flex-je-c gap-2 flex-col">
        <IconCompany
          className={
            pathname.includes(SITE_URL.OUR_COMPANY)
              ? "fill-[#132C5E]"
              : "fill-[#A1ACC3]"
          }
        />
        <span
          className={clsx("text-[8px] font-medium text-[#A1ACC3]", {
            "!text-[#132C5E]": pathname.includes(SITE_URL.OUR_COMPANY),
          })}
        >
          {$t("about_us__")}
        </span>
      </Link>
    </div>
  );
}

export default MobileBottomMenu;
