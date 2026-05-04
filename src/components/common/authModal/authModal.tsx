"use client"

import React, { useEffect, useRef, useState } from "react";
import { sendAuthCode } from "@/store/authThunks";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { handleSpin } from "@/store/galaSlice";
import { closeAuth, setPhone, setFirstName, setLastName, changeNumber, clearVerifyError, setStep } from "@/store/authSlice";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Button, Input } from "@heroui/react";
import { withMask } from "use-mask-input";
import { verifyAuthCode, registerAuth, createAuthSession } from "@/store/authThunks";
import { mapSendCodeErrorMessage } from "@/lib/authErrorI18n";

function normalizeCyrillicNameInput(raw: string): string {
    const cleaned = String(raw || "")
        .replace(/[^А-Яа-яЁё -]/g, "")
        .replace(/\s+/g, " ")
        .replace(/-+/g, "-")
        .trim();

    if (!cleaned) return "";

    const toTitle = (part: string) => {
        const p = part.trim();
        if (!p) return "";
        const first = p[0]?.toUpperCase() ?? "";
        const rest = p.slice(1).toLowerCase();
        return `${first}${rest}`;
    };

    // Title-case for each word and hyphenated segment
    return cleaned
        .split(" ")
        .map((word) => word.split("-").map(toTitle).filter(Boolean).join("-"))
        .filter(Boolean)
        .join(" ");
}

export default function AuthModal() {
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations();
    const dispatch = useDispatch();
    const { isOpen, step, phone, firstName, lastName, isRegistered, isSendingCode, sendCodeError, otpExpiresInSec, isRegistering, registerError, user } =
        useSelector((state: RootState) => state.auth);

    const isPhoneValid = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone || "");
    const isNameValid = (firstName?.trim() || "") !== "";
    const isSurnameValid = (lastName?.trim() || "") !== "";
    const canCloseDuringRegistration =
        !(pathname === "/gala-bonus" && step === "registration" && !(isNameValid && isSurnameValid));

    const [code, setCode] = useState(["", "", "", ""]);
    const [timeLeft, setTimeLeft] = useState(30); // 3 минуты
    const [otpChannel, setOtpChannel] = useState<"whatsapp" | "sms">("whatsapp");
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        if (step === "verification") setTimeLeft(30);
    }, [step, otpExpiresInSec]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // === Формат таймера (mm:ss) ===
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // === Проверка валидности кода ===
    const isCodeValid = code.join("").length === 4;

    // === Обработка ввода ===
    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return; // только цифры

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // переход к следующему инпуту
        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }

        // если все цифры введены
        if (newCode.join("").length === 4) {
            // здесь можно вызывать проверку кода через API
            console.log("Код введен:", newCode.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    // === Повторная отправка кода ===
    const resendCode = (channel: "whatsapp" | "sms" = otpChannel) => {
        setOtpChannel(channel);
        setTimeLeft(30);
        dispatch(sendAuthCode({ phoneMasked: phone ?? "", channel }) as any);
    };

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize(); // Проверяем сразу при монтировании
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const { verifyError, attemptsLeft, isVerifyingCode } = useSelector((s: RootState) => s.auth);

    useEffect(() => {
        if (verifyError === "invalid_code") {
            setCode(["", "", "", ""]);
            inputsRef.current[0]?.focus();
        }
    }, [verifyError]);

    const verifyErrorText =
        verifyError === "invalid_code"
            ? `${t("wrong_code")}${typeof attemptsLeft === "number" ? `. ${t("attempts_left")}: ${attemptsLeft}` : ""}`
            : verifyError === "code_expired_or_not_found"
                ? `${t("code_expired")}. ${t("request_new_code")}.`
                : verifyError === "too_many_attempts"
                    ? `${t("too_many_attempts")}. ${t("try_later")}.`
                    : verifyError
                        ? `${t("code_verification_error")}. ${t("retry")}.`
                        : null;

    return (
        <Drawer
            isDismissable={false}
            hideCloseButton
            isKeyboardDismissDisabled
            classNames={{ base: "fixed flex w-full max-w-full lg:max-w-[600px] min-h-[75vh] bottom-0 h-full px-[16px] py-[24px] lg:px-[40px] lg:py-[64px] flex-col gap-[10px] rounded-t-[32px] bg-[#FFF]" }}
            placement={isMobile ? "bottom" : "right"}
            isOpen={isOpen}
            onOpenChange={(open) => { if (!open) dispatch(closeAuth()); }}
        >
            <DrawerContent className="flex flex-col gap-[32px] h-full self-stretch">
                {() => (
                    <>
                        <DrawerHeader className="flex items-start justify-between gap-[32px] self-stretch text-[#122C5E] text-[32px] not-italic font-normal leading-[100%] bg-white p-0">
                            {(step === "phone" || step === "verification") && t("auth_verification_title")}
                            {step === "registration" && t("auth_registration_title")}
                            {(step === "successSpin" || step === "successDefault") && t("auth_verification_success_title")}
                            <Button
                                onPress={() => {
                                    if (!canCloseDuringRegistration) return;
                                    dispatch(closeAuth());
                                }}
                                isDisabled={!canCloseDuringRegistration}
                                className="!p-0 !min-w-[32px] !w-[32px] !h-[32px] rounded-[16px] bg-[#F4F6FB] flex items-center !justify-center disabled:opacity-40"
                            >
                                ✕
                            </Button>
                        </DrawerHeader>

                        <DrawerBody className="flex flex-col gap-[32px] p-0 self-stretch h-full">
                            {/* PHONE STEP */}
                            {step === "phone" && (
                                <div className="flex flex-col items-start gap-[32px] self-stretch">
                                    <div className="flex flex-col gap-[12px] w-full">
                                        <span>{t("auth_phone_prompt")}</span>
                                        <Input
                                            type="tel"
                                            inputMode="numeric"
                                            value={phone}
                                            onChange={(e) => dispatch(setPhone(e.target.value))}
                                            ref={withMask("+7 (999) 999-99-99")}
                                            classNames={{
                                                input: "flex pt-[11px] pr-[12px] pb-[13px] pl-[16px] rounded-[12px] bg-[#F4F6FB] text-[#282D3C] text-[15px] font-medium leading-[20px]",
                                                inputWrapper: "p-0"
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-col items-center gap-[16px] self-stretch">
                                        <Button
                                            onPress={() => {
                                                setOtpChannel("whatsapp");
                                                dispatch(sendAuthCode({ phoneMasked: phone || "", channel: "whatsapp" }) as any);
                                            }}
                                            isDisabled={!isPhoneValid || isSendingCode}
                                            className={`flex w-full h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center self-stretch rounded-[12px] ${isPhoneValid && !isSendingCode ? "bg-[#DB1D31] text-white" : "bg-[#F2F1F0] text-[#A3A3A3] cursor-not-allowed"}`}
                                        >
                                            {isSendingCode ? t("sending") : t("get_code")}
                                        </Button>
                                        {sendCodeError && (
                                            <p className="text-[12px] text-red-600">
                                                {mapSendCodeErrorMessage(sendCodeError, t)}
                                            </p>
                                        )}
                                        <p className="text-[#1E1E1E] text-center text-[12px] not-italic font-normal leading-[100%]">
                                            {t("auth_sms_consent")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* VERIFICATION STEP */}
                            {step === "verification" && (
                                <div className="flex flex-col items-start gap-[32px] self-stretch">
                                    <div className="flex flex-col gap-[12px]">
                                        <div className="flex flex-col items-start gap-[8px] self-stretch">
                                            <span className="text-[#122C5E] text-[16px] not-italic font-normal leading-[16px] opacity-60">
                                                {otpChannel === "sms"
                                                    ? t("auth_code_sent_to_sms_on_number", { phone: phone ?? "" })
                                                    : t("auth_code_sent_to_whatsapp_on_number", { phone: phone ?? "" })}
                                            </span>
                                            <div className="flex items-end gap-[16px] self-stretch">
                                                <span className="text-[#122C5E] text-[16px] not-italic font-normal leading-[16px] opacity-60">
                                                    {phone}
                                                </span>
                                                <Button
                                                    onPress={() => dispatch(changeNumber())}
                                                    className="!p-0 !m-0 !bg-transparent !border-none !rounded-none text-[#1A3C7E] text-[16px] not-italic font-bold leading-[16px] min-h-0 h-auto"
                                                >
                                                    {t("change")}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-[8px] self-stretch w-full">
                                            {code.map((value, index) => (
                                                <Input
                                                    key={index}
                                                    type="tel"
                                                    inputMode="numeric"
                                                    value={value}
                                                    maxLength={1}
                                                    onChange={(e) => {
                                                        handleChange(index, e.target.value);
                                                        if (verifyError) dispatch(clearVerifyError());
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                                    ref={(el: HTMLInputElement | null) => { inputsRef.current[index] = el; }}
                                                    classNames={{
                                                        input:
                                                            `flex justify-center items-center text-center text-[18px] font-medium text-[#282D3C] bg-[#F4F6FB] rounded-[20px] h-[62px]`,
                                                        inputWrapper:
                                                            `p-0 w-full h-[62px]`,
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {verifyErrorText && (
                                            <p className="text-[12px] text-red-600 -mt-2">
                                                {verifyErrorText}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start gap-[16px] self-stretch">
                                        <Button
                                            onPress={async () => {
                                                const res = await dispatch(
                                                    verifyAuthCode({ phoneMasked: phone ?? "", code: code.join(""), confirmOnly: true }) as any
                                                );
                                                if (res?.meta?.requestStatus !== "fulfilled") {
                                                    return;
                                                }
                                                const u = res?.payload?.user;
                                                const hasName = typeof u?.name === "string" && u.name.trim() !== "";
                                                const hasSurname = typeof u?.surname === "string" && u.surname.trim() !== "";

                                                if (!hasName || !hasSurname) {
                                                    dispatch(setStep("registration"));
                                                    return;
                                                }

                                                const sessionRes = await dispatch(
                                                    createAuthSession({ phoneMasked: phone ?? "" }) as any
                                                );
                                                if (sessionRes?.payload?.status === "ok") {
                                                    dispatch(setStep(pathname === "/gala-bonus" ? "successSpin" : "successDefault"));
                                                }
                                            }}
                                            isDisabled={!isCodeValid || isVerifyingCode}
                                            className={`flex w-full h-[44px] justify-center items-center rounded-[12px] transition-colors ${isCodeValid
                                                ? "bg-[#DB1D31] text-white"
                                                : "bg-[#F2F1F0] text-[#A3A3A3] cursor-not-allowed"
                                                }`}
                                        >
                                            {isVerifyingCode ? t("verification_in_progress") : t("confirm")}
                                        </Button>

                                        {timeLeft > 0 ? (
                                            <Button
                                                disabled
                                                className="!p-0 !m-0 !bg-transparent !border-none !rounded-none text-[#1A3C7E] text-[16px] not-italic font-normal leading-[16px] min-h-0 h-auto"
                                            >
                                                {t("send_code_again_in")} {formatTime(timeLeft)}
                                            </Button>
                                        ) : (
                                            <div className="flex flex-col items-start gap-[8px] self-stretch">
                                                <Button
                                                    onPress={() => resendCode("whatsapp")}
                                                    isDisabled={isSendingCode}
                                                    className="!p-0 !m-0 !bg-transparent !border-none !rounded-none text-[#1A3C7E] text-[16px] not-italic font-bold leading-[16px] min-h-0 h-auto disabled:opacity-50"
                                                >
                                                    {isSendingCode && otpChannel === "whatsapp" ? t("sending") : t("auth_send_whatsapp")}
                                                </Button>
                                                <Button
                                                    onPress={() => resendCode("sms")}
                                                    isDisabled={isSendingCode}
                                                    className="!p-0 !m-0 !bg-transparent !border-none !rounded-none text-[#1A3C7E] text-[16px] not-italic font-bold leading-[16px] min-h-0 h-auto disabled:opacity-50"
                                                >
                                                    {isSendingCode && otpChannel === "sms" ? t("sending") : t("auth_send_sms")}
                                                </Button>
                                            </div>
                                        )}

                                        <p className="text-[#1E1E1E] text-center text-[12px] not-italic font-normal leading-[100%]">
                                            {t("auth_sms_consent")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* REGISTRATION STEP */}
                            {/* {step === "registration" && !isRegistered && ( */}
                            {step === "registration" && (
                                <div className="flex flex-col items-start gap-[32px] self-stretch">
                                    <div className="flex flex-col gap-[12px] w-full">
                                        <div className="flex flex-col items-start gap-[16px] self-stretch w-full">
                                            <div className="flex flex-col items-start gap-[16px] self-stretch">
                                                <div className="flex flex-col items-start self-stretch gap-[16px]">
                                                    <div className="flex flex-col items-start gap-[16px] self-stretch">
                                                        <div className="flex flex-col items-start self-stretch gap-[12px]">
                                                            <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[20px]">
                                                                {t("first_name")}
                                                            </p>
                                                            <Input
                                                                placeholder={t("auth_enter_first_name")}
                                                                value={firstName}
                                                                onChange={(e) => dispatch(setFirstName(normalizeCyrillicNameInput(e.target.value)))}
                                                                classNames={{
                                                                    input: "flex w-full pt-[11px] pr-[12px] pb-[13px] pl-[16px] rounded-[12px] bg-[#F4F6FB] text-[#282D3C] text-[15px] font-normal leading-[20px]",
                                                                    inputWrapper: "p-0"
                                                                }}
                                                                isRequired
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-start gap-[16px] self-stretch">
                                                <div className="flex flex-col items-start self-stretch gap-[16px]">
                                                    <div className="flex flex-col items-start gap-[16px] self-stretch">
                                                        <div className="flex flex-col items-start self-stretch gap-[12px]">
                                                            <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[20px]">
                                                                {t("last_name")}
                                                            </p>
                                                            <Input
                                                                placeholder={t("auth_enter_last_name")}
                                                                value={lastName}
                                                                onChange={(e) => dispatch(setLastName(normalizeCyrillicNameInput(e.target.value)))}
                                                                classNames={{
                                                                    input: "flex w-full pt-[11px] pr-[12px] pb-[13px] pl-[16px] rounded-[12px] bg-[#F4F6FB] text-[#282D3C] text-[15px] font-normal leading-[20px]",
                                                                    inputWrapper: "p-0"
                                                                }}
                                                                isRequired
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {registerError && <p className="text-[12px] text-red-600">{registerError}</p>}
                                    </div>
                                    {pathname === "/gala-bonus" && (
                                        <div className="flex flex-col items-start gap-[16px] self-stretch">

                                            <Button
                                                onPress={async () => {
                                                    const res = await dispatch(
                                                        registerAuth({
                                                            phoneMasked: phone ?? "",
                                                            firstName: firstName ?? "",
                                                            lastName: lastName ?? "",
                                                        }) as any
                                                    );
                                                    // если регистрация прошла — показываем сценарий "успешно, можно крутить"
                                                    if (res?.payload?.status === "ok") {
                                                        dispatch(setStep("successSpin"));
                                                    }
                                                }}
                                                isDisabled={!(isNameValid && isSurnameValid) || isRegistering}
                                                className={`flex w-full h-[44px] justify-center items-center rounded-[12px] transition-colors ${isNameValid && isSurnameValid
                                                    ? "bg-[#DB1D31] text-white"
                                                    : "bg-[#F2F1F0] text-[#A3A3A3] cursor-not-allowed"}`}
                                            >
                                                {isRegistering ? t("saving") : t("auth_submit_registration")}
                                            </Button>
                                        </div>
                                    )}
                                    {pathname !== "/gala-bonus" && (
                                        <div className="flex flex-col items-start gap-[16px] self-stretch">

                                            <Button
                                                onPress={() =>
                                                    dispatch(
                                                        registerAuth({
                                                            phoneMasked: phone ?? "",
                                                            firstName: firstName ?? "",
                                                            lastName: lastName ?? "",
                                                        }) as any
                                                    )
                                                }
                                                isDisabled={!(isNameValid && isSurnameValid) || isRegistering}
                                                className={`flex w-full h-[44px] justify-center items-center rounded-[12px] transition-colors ${isNameValid && isSurnameValid
                                                    ? "bg-[#DB1D31] text-white"
                                                    : "bg-[#F2F1F0] text-[#A3A3A3] cursor-not-allowed"}`}
                                            >
                                                {isRegistering ? t("saving") : t("auth_submit_registration")}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SUCCESS  SPIN*/}
                            {step === "successSpin" && (
                                <div className="flex flex-col items-start gap-[32px] self-stretch">
                                    <div className="flex flex-row gap-[12px] w-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10ZM14.0303 6.96967C14.3232 7.26256 14.3232 7.73744 14.0303 8.03033L9.03033 13.0303C8.73744 13.3232 8.26256 13.3232 7.96967 13.0303L5.96967 11.0303C5.67678 10.7374 5.67678 10.2626 5.96967 9.96967C6.26256 9.67678 6.73744 9.67678 7.03033 9.96967L8.5 11.4393L10.7348 9.2045L12.9697 6.96967C13.2626 6.67678 13.7374 6.67678 14.0303 6.96967Z" fill="#26AF2B" />
                                        </svg>
                                        <span>{t("auth_can_spin_now")}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-[16px] self-stretch">
                                        <Button
                                            onPress={() => {
                                                dispatch(closeAuth());
                                                dispatch(handleSpin() as any);
                                            }}
                                            className={`flex w-full h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center self-stretch rounded-[12px] bg-[#DB1D31] font-medium text-white`}
                                        >
                                            {t("auth_spin_wheel")}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* SUCCESS  DEFAULT*/}
                            {step === "successDefault" && (
                                <div className="flex flex-col items-start gap-[32px] self-stretch">
                                    <div className="flex flex-row gap-[12px] w-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10ZM14.0303 6.96967C14.3232 7.26256 14.3232 7.73744 14.0303 8.03033L9.03033 13.0303C8.73744 13.3232 8.26256 13.3232 7.96967 13.0303L5.96967 11.0303C5.67678 10.7374 5.67678 10.2626 5.96967 9.96967C6.26256 9.67678 6.73744 9.67678 7.03033 9.96967L8.5 11.4393L10.7348 9.2045L12.9697 6.96967C13.2626 6.67678 13.7374 6.67678 14.0303 6.96967Z" fill="#26AF2B" />
                                        </svg>
                                        <span>{t("auth_login_success")}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-[16px] self-stretch">
                                        {pathname === "/gala-bonus" && (
                                            <Button
                                                onPress={() => {
                                                    dispatch(closeAuth());
                                                    dispatch(handleSpin() as any);
                                                }}
                                                className="flex w-full h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center self-stretch rounded-[12px] bg-[#DB1D31] font-medium text-white"
                                            >
                                                {t("auth_spin_wheel")}
                                            </Button>
                                        )}
                                        <Button
                                            onPress={() => {
                                                dispatch(closeAuth());
                                                router.push(
                                                    user?.documentId
                                                        ? `/profile/${user.documentId}${String(user.role ?? "").toLowerCase() ===
                                                            "external_manager"
                                                            ? "?section=queue"
                                                            : ""
                                                        }`
                                                        : "/profile",
                                                );
                                            }}
                                            className={`flex w-full h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center self-stretch rounded-[12px] font-medium ${pathname === "/gala-bonus" ? "bg-[#F4F6FB] text-[#1A3C7E]" : "bg-[#DB1D31] text-white"}`}
                                        >
                                            {t("auth_go_to_profile")}
                                        </Button>
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
