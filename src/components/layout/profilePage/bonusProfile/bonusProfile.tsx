"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useTranslations } from "next-intl";

function formatClaimedDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/** Format API prize "150000" -> "150.000 ₸" */
function formatPrizeDisplay(prize: string | number): string {
  const digits = String(prize ?? "").replace(/\D/g, "") || "0";
  const formatted = Number(digits).toLocaleString("ru-RU").replace(/\u00A0/g, " ");
  return `${formatted} ₸`;
}

/** Одна запись бонуса из API (пополнение или списание) */
interface BonusRecord {
  prize: string | number;
  updatedAt?: string;
  issueAt?: string;
  active?: boolean;
  property?: unknown;
}

export default function BonusProfile() {
  const t = useTranslations();
  const user = useSelector((state: RootState) => state.auth.user);
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.documentId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    fetch(`/api/galaBonus/bonuses?documentId=${encodeURIComponent(user.documentId)}`)
      .then((res) => res.json())
      .then((data: { data?: Array<Record<string, unknown>> }) => {
        const rawList = data?.data ?? [];
        const list: BonusRecord[] = rawList.map((item: Record<string, unknown>) => {
          const attrs = (item?.attributes ?? item) as Record<string, unknown>;
          const rawPrize = attrs?.prize ?? item?.prize;
          const prize: string | number =
            typeof rawPrize === "number" ? rawPrize : typeof rawPrize === "string" ? rawPrize : Number(rawPrize) || 0;
          return {
            prize,
            updatedAt: String(attrs?.updatedAt ?? item?.updatedAt ?? ""),
            issueAt: String(attrs?.issueAt ?? item?.issueAt ?? ""),
            active: Boolean(attrs?.active ?? item?.active ?? true),
            property: attrs?.property ?? item?.property,
          };
        });
        setRecords(list);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [user?.documentId]);

  const displayName = user ? [user.name, user.surname].filter(Boolean).join(" ") || user.phone || "—" : "—";
  const totalPrize = records.reduce((sum, r) => sum + Number(String(r.prize).replace(/\D/g, "") || 0), 0);
  const displayPrize = formatPrizeDisplay(String(totalPrize));

  return (
    <div className="inline-flex flex-col gap-[32px] items-start">
      <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">
        Gala Bonus
      </h1>
      <div className="inline-flex w-full flex-col lg:flex-row items-start gap-[32px] flex-wrap">
        <div className="flex w-full min-w-full lg:min-w-[528px] flex-col items-start gap-[16px]">
          <span className="text-[#000] [font-size:_clamp(16px,3vw,24px)] not-italic font-medium leading-[100%]">
            {t("your_prize")}
          </span>
          <div className="flex flex-col items-start gap-[16px] self-stretch">
            <div className="min-w-full lg:min-w-[528px] min-h-[308px] rounded-[32px]">
              <div className="flex justify-between items-end flex-col p-[24px] min-w-full lg:min-w-[528px] min-h-[307.9px] flex-shrink-0 rounded-[32px] bg-[#132C5E] bg-[url(/img/galabg.svg)]">
                <Image src="/img/Logo-white.svg" alt="Logo" width={100} height={100} />
                <div className="flex flex-col w-full">
                  <span className="text-[#FFF] [font-size:_clamp(24px,3vw,32px)] not-italic font-normal leading-[100%]">
                    {displayName}
                  </span>
                  <span className="text-[#FFF] [font-size:_clamp(32px,3vw,84px)] not-italic font-black leading-[100%]">
                    {displayPrize}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-[12px] lg:gap-[40px] w-full">
              <a
                href="https://form.passquare.com/9fd66ccf-746d-481e-9a16-860da142a6d7"
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-full max-w-[162px] h-[50px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2655AF] focus-visible:ring-offset-2 rounded-[12px]"
                aria-label="Open Passquare form (Apple Wallet)"
              >
                <Image
                  src="/img/appleWallet.svg"
                  alt="appleWallet"
                  fill
                  className="object-contain"
                />
              </a>
              <a
                href="https://form.passquare.com/9fd66ccf-746d-481e-9a16-860da142a6d7"
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-full max-w-[162px] h-[50px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2655AF] focus-visible:ring-offset-2 rounded-[12px]"
                aria-label="Open Passquare form (Google Wallet)"
              >
                <Image
                  src="/img/googleWallet.svg"
                  alt="googleWallet"
                  fill
                  className="object-contain"
                />
              </a>
            </div>
          </div>
        </div>
        <div className="flex w-full lg:max-w-[416px] flex-col items-start gap-[16px]">
          <span className="text-[#000] [font-size:_clamp(16px,3vw,24px)] not-italic font-medium leading-[100%]">
            {t("history_of_topups")}
          </span>
          <div className="flex w-full min-w-full h-auto p-[32px] items-start gap-[10px] self-stretch rounded-[32px] bg-[#F4F6FB]">
            <div className="flex flex-col justify-center items-start gap-[10px] flex-[1_0_0] w-full">
              {loading ? (
                <p className="text-[#000] text-[14px] opacity-60">{t("loading")}</p>
              ) : records.length > 0 ? (
                <div className="flex flex-col gap-[8px] w-full">
                  {records.map((rec, i) => {
                    const date = rec.issueAt || rec.updatedAt || "";
                    const amount = Number(String(rec.prize).replace(/\D/g, "") || 0);
                    const isWriteOff = rec.active === false && amount === 0;
                    return (
                      <div
                        key={i}
                        className="flex pb-[8px] w-full justify-between items-end self-stretch [border-bottom:1px_solid_rgba(0,_0,_0,_0.09)] last:border-bottom-0"
                      >
                        <div className="flex flex-col justify-center items-start gap-[4px]">
                          <p className="text-[#000] text-[10px] not-italic font-normal leading-[10px] opacity-30">
                            {formatClaimedDate(date)}
                          </p>
                          <span className="text-[#000] text-[16px] not-italic font-medium leading-[16px]">
                            {isWriteOff ? "Списание" : "Gala Bonus"}
                          </span>
                        </div>
                        {isWriteOff ? (
                          <span className="text-[#7E7E7E] text-[16px] not-italic font-medium leading-[16px]">
                            {t("used")}
                          </span>
                        ) : (
                          <span className="text-[#20B837] text-[16px] not-italic font-medium leading-[16px]">
                            +{formatPrizeDisplay(rec.prize)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[#000] text-[14px] opacity-60">
                  {t("no_topups_yet")}. {t("spin_the_wheel_on_the_page")}{" "}
                  <Link href="/gala-bonus" className="text-[#1A3C7E] underline">
                    Gala Bonus
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}