"use client"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    Button,
    Input,
    Spinner
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { withMask } from "use-mask-input";
import { useTranslations } from "next-intl";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { handleSpin } from "@/store/galaSlice";
import {
    saveFormData,
    getCustomer,
    sendMessage,
    setFormStep,
    setVerificationCode,
    setGeneratedCode,
    setTimeLeft,
    setFormErrors,
    clearFormErrors
} from "@/store/galaSlice";
import { validateName } from "@/app/utils/validations";
import { validatePhone } from "@/app/utils/validations";
import { formatTime, generateVerificationCode } from "@/app/utils/form";

interface FormProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Form({ isOpen, onClose }: FormProps) {
    const t = useTranslations();
    const dispatch = useAppDispatch();
    const {
        formStep,
        verificationCode,
        generatedCode,
        timeLeft,
        when,
        errors
    } = useAppSelector(state => state.gala);

    // Restore local state for name and phone since they're form inputs
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (timeLeft > 0 && formStep === "code") {
            const timer = setInterval(() => {
                dispatch(setTimeLeft(timeLeft - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, formStep, dispatch]);

    const handleNameChange = (value: string) => {
        setName(value);
        if (errors.name) {
            dispatch(clearFormErrors());
        }
    };

    const handlePhoneChange = (value: string) => {
        setPhone(value);
        if (errors.phone) {
            dispatch(clearFormErrors());
        }
    };

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;

        const newCode = [...verificationCode];
        newCode[index] = value;
        dispatch(setVerificationCode(newCode));

        if (errors.code) {
            dispatch(setFormErrors({ code: undefined }));
        }

        if (value && index < 3) inputsRef.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleSubmitForm = async () => {
        // Prevent multiple submissions
        if (isSubmitting) return;

        const newErrors: { phone?: string; name?: string } = {};

        if (!validateName(name)) {
            newErrors.name = t("invalid_name");
        }

        if (!validatePhone(phone)) {
            newErrors.phone = t("invalid_phone");
        }

        if (Object.keys(newErrors).length > 0) {
            dispatch(setFormErrors(newErrors));
            return;
        }

        dispatch(clearFormErrors());
        setIsSubmitting(true);

        try {
            // Generate code
            const code = generateVerificationCode();
            dispatch(setGeneratedCode(code));

            await dispatch(
                sendMessage({
                    phone: phone,
                    code,
                })
            ).unwrap();

            // If successful, move to code entry step
            dispatch(setFormStep("code"));
            dispatch(setTimeLeft(180)); // Reset timer
        } catch (e) {
            console.error(e);
            dispatch(setFormStep("error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyCode = async () => {
        try {
            const result = await dispatch(getCustomer(phone)).unwrap();
            const enteredCode = verificationCode.join("");

            if (!/^\d{4}$/.test(enteredCode)) {
                dispatch(setFormErrors({ code: t("invalid_code") }));
                return;
            }

            if (enteredCode === generatedCode) {
                if (result.status === "notFound") {
                    dispatch(saveFormData({ phone, name }));
                    dispatch(handleSpin());
                    onClose();
                }

                if (result.status === "found") {
                    dispatch(setFormStep("found"));
                }
            } else {
                dispatch(setFormErrors({ code: t("invalid_code") }));
            }
        } catch (e) {
            console.error(e);
            dispatch(setFormStep("error"));
        }
    };

    const resendCode = async () => {
        try {
            setIsResending(true);

            const newCode = generateVerificationCode();
            dispatch(setGeneratedCode(newCode));

            await dispatch(
                sendMessage({
                    phone,
                    code: newCode,
                })
            ).unwrap();

            dispatch(setTimeLeft(60));
        } catch (e) {
            console.error(e);
        } finally {
            setIsResending(false);
        }
    };

    const renderIdleForm = () => (
        <div className="flex flex-col gap-6 py-4">
            <p>{t("gala_bonus_description")}</p>
            <div className="flex items-start gap-[11px] w-full">
                <div className="flex w-full flex-col items-start gap-[12px] p-0">
                    <Input
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        isInvalid={!!errors.name}
                        placeholder={t("name")}
                        className="h-[44px] w-full rounded-[12px] bg-[#F4F6FB] px-[16px] text-[14px] text-[#282D3C] placeholder:text-[#9CA3AF] p-0"
                    />
                    {!!errors.name && (
                        <p className="text-red-500 text-sm mt-0">
                            {errors.name}
                        </p>
                    )}

                    <Input
                        ref={withMask("+7 (999) 999-99-99")}
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        isInvalid={!!errors.phone}
                        placeholder="Телефон"
                        type="tel"
                        className="h-[44px] w-full rounded-[12px] bg-[#F4F6FB] px-[16px] text-[14px] text-[#282D3CF] placeholder:text-[#9CA3AF] p-0"
                    />
                    {!!errors.phone && (
                        <p className="text-red-500 text-sm mt-0">
                            {errors.phone}
                        </p>
                    )}

                    <Button
                        onClick={handleSubmitForm}
                        isDisabled={isSubmitting}
                        className="flex w-full h-[44px] text-white font-medium rounded-[32px] bg-[#DB1D31]"
                    >
                        {isSubmitting ? <Spinner /> : t("send")}
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderCodeForm = () => (
        <div className="flex flex-col gap-6 py-4">
            <p>{t("gala_bonus_verification")}</p>
            <div className="flex items-start gap-[16px] self-stretch flex-col">
                <div className="flex flex-row gap-[16px] items-start">
                    <span className="text-[#122C5E] text-[16px] not-italic font-normal leading-[16px] opacity-60">
                        {phone}
                    </span>
                    <Button
                        onPress={() => dispatch(setFormStep("idle"))}
                        className="!p-0 !m-0 !bg-transparent !border-none !rounded-none text-[#1A3C7E] text-[16px] not-italic font-bold leading-[16px] min-h-0 h-auto"
                    >
                        {t("change")}
                    </Button>
                </div>

                <div className="flex flex-col gap-[16px] items-start">
                    {timeLeft > 0 ? (
                        <Button
                            disabled
                            className="!p-0 !m-0 !bg-transparent !border-none !rounded-none text-[#1A3C7E] text-[16px] not-italic font-normal leading-[16px] min-h-0 h-auto"
                        >
                            {t("send_code_again_in")} {formatTime(timeLeft)}
                        </Button>
                    ) : (
                        <Button
                            onPress={resendCode}
                            isLoading={isResending}
                            className="!p-0 !m-0 !bg-transparent !border-none !rounded-none text-[#1A3C7E] text-[16px] not-italic font-bold leading-[16px] min-h-0 h-auto"
                        >
                            {t("send_code_again")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-start gap-[11px] w-full">
                <div className="flex w-full flex-row items-start gap-[12px] p-0">
                    {verificationCode.map((value, index) => (
                        <Input
                            key={index}
                            type="tel"
                            inputMode="numeric"
                            value={value}
                            maxLength={1}
                            isInvalid={!!errors.code}
                            onChange={(e) => handleCodeChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            ref={(el) => { inputsRef.current[index] = el; }}
                            classNames={{
                                input:
                                    "flex justify-center items-center text-center text-[18px] font-medium text-[#282D3C] bg-[#F4F6FB] rounded-[20px] h-[62px]",
                                inputWrapper: "p-0 w-full h-[62px]",
                            }}
                        />
                    ))}
                </div>
                {errors.code && (
                    <p className="text-red-500 text-sm mt-2">
                        {errors.code}
                    </p>
                )}
                <Button
                    onClick={handleVerifyCode}
                    className="flex w-full h-[44px] text-white font-medium rounded-[32px] bg-[#DB1D31]"
                >
                    {t("send")}
                </Button>
            </div>
        </div>
    );

    const renderFoundForm = () => (
        <div className="flex flex-col gap-6 py-4">
            <p>{t("gala_bonus_already_spinned")}</p>
            <div className="flex items-start gap-[16px] self-stretch flex-col">
                <div className="flex flex-row gap-[16px] items-start">
                    <span className="text-[#122C5E] text-[16px] not-italic font-normal leading-[16px] opacity-60">
                        {t("gala_bonus_spinned_date")} {when ? new Date(when.replace(" ", "T")).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        }) : ""}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-start gap-[11px] w-full">
                <Button
                    onClick={() => onClose()}
                    className="flex w-full h-[44px] text-white font-medium min-w-[44px] min-h-[44px] justify-center items-center rounded-[32px] bg-[#DB1D31]"
                >
                    {t("close")}
                </Button>
            </div>
        </div>
    );

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
                        <DrawerHeader className="flex flex-col gap-1">{t("gala_bonus")}</DrawerHeader>
                        <DrawerBody>
                            {formStep === "idle" && renderIdleForm()}
                            {formStep === "code" && renderCodeForm()}
                            {formStep === "found" && renderFoundForm()}
                        </DrawerBody>
                    </>
                )}
            </DrawerContent>
        </Drawer>
    );
}