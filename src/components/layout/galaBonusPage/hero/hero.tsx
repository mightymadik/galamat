"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { useRef, useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useSelector, useDispatch } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { openAuth, setPhone, setStep } from "@/store/authSlice";
import {
  claimPrize,
  createBonus,
  fetchBonuses,
  fetchProbability,
  setFormStep,
  setWhen,
  trySpin,
} from "@/store/galaSlice";
import { useTranslations } from "next-intl";
import Form from "@/components/layout/galaBonusPage/form/form";

// Typed versions of useDispatch and useSelector
const useAppDispatch: () => AppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default function GalaBonus() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [prizeClaimed, setPrizeClaimed] = useState(false);
  const t = useTranslations();

  const user = useAppSelector((state) => state.auth.user);
  const {
    rotation,
    isSpinning,
    hasSpun,
    prize,
    probabilityStatus,
    lastBonus,
    bonusesStatus,
  } = useAppSelector((state) => state.gala);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [spinChecking, setSpinChecking] = useState(false);

  const toMaskedPhone = (phoneRaw: string): string => {
    const digits = String(phoneRaw || "").replace(/\D/g, "");
    // ожидаем KZ: +7XXXXXXXXXX (11 цифр, начинается с 7)
    const d = digits.length === 11 && digits.startsWith("7")
      ? digits
      : (digits.length === 10 ? `7${digits}` : digits);
    if (d.length !== 11 || !d.startsWith("7")) return phoneRaw;
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  };

  useEffect(() => {
    if (probabilityStatus === "idle") {
      dispatch(fetchProbability());
    }
  }, [dispatch, probabilityStatus]);

  useEffect(() => {
    if (user?.documentId && bonusesStatus === "idle") {
      dispatch(fetchBonuses(user.documentId) as any);
    }
  }, [dispatch, user?.documentId, bonusesStatus]);

  useEffect(() => {
    if (!parentRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, []);

  const handleClaimClick = async () => {
    if (!prize || !user) return;

    const phone = user.phone;
    const name = [user.name, user.surname].filter(Boolean).join(" ") || user.phone;

    setLoading(true);
    setClaimError(null);

    const utm_source = searchParams.get("utm_source") ?? undefined;
    const utm_medium = searchParams.get("utm_medium") ?? undefined;
    const utm_campaign = searchParams.get("utm_campaign") ?? undefined;
    const utm_content = searchParams.get("utm_content") ?? undefined;

    try {
      const result = await dispatch(
        claimPrize({
          prize,
          phone,
          name,
          ...(utm_source && { utm_source }),
          ...(utm_medium && { utm_medium }),
          ...(utm_campaign && { utm_campaign }),
          ...(utm_content && { utm_content }),
        })
      ).unwrap();

      setPrizeClaimed(true);

      // Save to gala-bonuses in background so user doesn't wait for Strapi
      if (user?.documentId) {
        dispatch(
          createBonus({
            documentId: user.documentId,
            prize: prize.replace(/\D/g, "") || prize,
          }) as any
        ).catch((bonusErr: any) => {
          const msg =
            typeof bonusErr === "string"
              ? bonusErr
              : bonusErr?.message || t("gala_bonus_save_error");
          setClaimError(msg);
        });
      }

      const { cardUrl, gpayUrl, user_hash } = result;

      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      const isAndroid = /Android/i.test(ua);

      if (isIOS && cardUrl) {
        window.location.assign(cardUrl);
        return;
      }

      if (isAndroid && gpayUrl) {
        window.open(gpayUrl, "_blank");
        return;
      }

      if (gpayUrl && user_hash) {
        const formUrl = `https://form.passquare.com/9fd66ccf-746d-481e-9a16-860da142a6d7?hash=${user_hash}`;
        window.open(formUrl, "_blank");
      }
    } catch (err: any) {
      const msg =
        typeof err === "string" ? err : err?.message || t("gala_bonus_claim_error");
      setClaimError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <><div className="py-[40px] relative overflow-hidden">
      <div className="wrapper relative flex flex-col items-center justify-center gap-[10px] overflow-hidden rounded-[32px]">
        <div
          ref={parentRef}
          className="flex flex-col justify-start items-center w-full h-[500px] md:h-[675px] gap-[32px] bg-[url('/img/galabg.svg')] bg-cover bg-center relative z-10 overflow-hidden rounded-[32px] transition-all duration-500"
        >
          {hasSpun && <Confetti width={size.width} height={size.height} recycle={false} />}

          {/* Тексты и кнопка */}
          <div
            className={`inline-flex flex-col justify-center items-center px-[20px] pt-[50px] gap-[16px] lg:gap-[32px] transition-all duration-1500 ${isSpinning ? "opacity-0 -translate-y-5" : "opacity-100 translate-y-0"}`}
          >
            <h1 className="text-[#FFF] text-center [font-size:_clamp(24px,10vw,64px)] font-bold leading-[45px]">
              {hasSpun ? t("gala_bonus_congratulation") : "Gala Bonus"}
            </h1>
            <p className="max-w-[540px] text-[#FFF] text-center text-[16px] font-normal leading-[normal]">
              {hasSpun ? "" : t("gala_bonus_description")}
            </p>

            {/* Купон и приз */}
            {hasSpun && prize && (
              <div className="flex flex-col items-center gap-[16px] absolute translate-y-42 w-full max-w-[608px] h-[226px] animate-fade-in">
                <Image
                  src="/img/coupon.svg"
                  alt="Coupon"
                  width={609}
                  height={227}
                  className="w-full h-full object-contain opacity-100 pointer-events-none" />
                <h1 className="absolute inset-0 -translate-y-5 translate-x-5 flex items-center justify-center text-[#FFF] [font-size:_clamp(22px,10vw,64px)] font-black leading-[73px]">
                  {prize}
                </h1>
                <div className="flex flex-col items-start gap-[11.393px]">
                  {claimError && (
                    <p className="text-red-500 text-sm">{claimError}</p>
                  )}
                  {!prizeClaimed && (
                    <Button
                      className="flex h-[53.167px] px-[22.786px] py-0 flex-col justify-center items-center rounded-[32px] bg-[#EF0406] text-[#FFF] text-center text-[16px] font-medium"
                      disabled={loading}
                      onClick={handleClaimClick}
                    >
                      {loading ? <Spinner size="sm" /> : t("claim_prize")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!hasSpun && !isSpinning && (
              <Button
                className="flex w-[300px] h-[44px] lg:h-[64px] justify-center items-center rounded-[32px] bg-[#DB1D31] text-[#FFF] text-[15px] font-medium transition-opacity duration-500"
                isDisabled={!!user && bonusesStatus === "loading"}
                onClick={async () => {
                  if (!user) {
                    dispatch(openAuth());
                    return;
                  }
                  const hasName = typeof user.name === "string" && user.name.trim() !== "";
                  const hasSurname = typeof user.surname === "string" && user.surname.trim() !== "";
                  if (!hasName || !hasSurname) {
                    // профиль неполный → просим заполнить имя/фамилию и не даём крутить
                    dispatch(openAuth());
                    dispatch(setPhone(toMaskedPhone(user.phone)));
                    dispatch(setStep("registration"));
                    return;
                  }
                  setSpinChecking(true);
                  try {
                    const result = await dispatch(
                      trySpin(user.documentId) as any
                    );
                    if (result?.locked && result?.when) {
                      dispatch(setWhen(result.when));
                      dispatch(setFormStep("found"));
                      setDrawerOpen(true);
                    }
                  } catch (_) {}
                  setSpinChecking(false);
                }}
              >
                {user
                  ? spinChecking || bonusesStatus === "loading"
                    ? t("gala_bonus_checking")
                    : t("gala_bonus_cta")
                  : t("gala_bonus_login_to_spin")}
              </Button>
            )}
          </div>

          {/* Колесо */}
          <div
            className={`relative mx-auto my-0 w-full aspect-square max-w-[1930px] flex justify-center items-center transition-transform duration-1500 ${isSpinning
              ? "-translate-y-5"
              : hasSpun
                ? "translate-y-60 md:translate-y-70"
                : "translate-y-0"}`}
          >
            <Image
              src="/img/spinner.svg"
              alt="Gala Wheel"
              width={1930}
              height={1930}
              className="wheel w-full h-auto"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: "center center",
                transition: isSpinning ? `transform 16s cubic-bezier(0.33,1,0.68,1)` : undefined,
              }} />

            {/* Стрелка */}
            <svg
              className="absolute top-[0%] left-1/2 -translate-x-1/2 w-[10%] max-w-[88px] h-auto"
              viewBox="0 0 88 88"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M37.8347 84.1888C40.3749 89.2704 47.6251 89.2704 50.1653 84.1889L87.2634 9.97772C89.555 5.39361 86.2222 0 81.0981 0H6.90192C1.77777 0 -1.55499 5.3936 0.73661 9.97771L37.8347 84.1888Z"
                fill="#DB1D31" />
              <circle cx="44" cy="6" r="6" fill="#DB1D31" />
            </svg>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 1.5s ease-out forwards;
        }
      `}</style>

      <Form
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
    </>
  );
}
