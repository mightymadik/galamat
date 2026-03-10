"use client"

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import Image from "next/image";
import type { AgreementPayload } from "@/types/agreement";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { setAgreementFileUrl } from "@/store/paySlice";
import { formatPriceDisplay } from "@/lib/paymentFormUtils";
import { useTranslations } from "next-intl";

function formatSignedAt(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
        return iso;
    }
}

interface SignProps {
    flatData: {
        id?: string | number;
        documentId?: string;
        projectDocumentId?: string;
        images?: string[];
        title?: string;
        room?: string;
        area?: string;
        price?: string;
        deadline?: string;
        section?: string;
        entrance?: string;
        floor?: string;
        apartmentNumber?: number;
        discountPercent?: number;
        totalPrice?: number;
    } | null;
    agreementPayload: AgreementPayload | null;
    activeButton: string | null; // '1day', '3days', '5days'
    onNext: () => void;
}

export default function Sign({ flatData, agreementPayload, onNext }: SignProps) {
    const t = useTranslations();
    const dispatch = useDispatch();
    const [completing, setCompleting] = useState(false);
    const [sendingToSign, setSendingToSign] = useState(false);
    const [sendStepMessage, setSendStepMessage] = useState<string | null>(null);
    const [sentToSign, setSentToSign] = useState(false);
    const [doodocsDocumentId, setDoodocsDocumentId] = useState<string | null>(null);
    const [signError, setSignError] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [doodocsSignedAt, setDoodocsSignedAt] = useState<string | null>(null);
    const [pdbSignedAt, setPdbSignedAt] = useState<string | null>(null);
    const [signingPdb, setSigningPdb] = useState(false);
    /** Проект из сводки по сделке — для «Отправить на подпись», если в flatData нет projectDocumentId */
    const [projectDocumentIdFromDeal, setProjectDocumentIdFromDeal] = useState<string | null>(null);

    const payFlatDocumentId = useSelector((state: RootState) => state.pay.flat?.documentId);
    const agreementFileUrl = useSelector((state: RootState) => state.pay.agreementFileUrl);
    const agreementTemplateType = useSelector((state: RootState) => state.pay.agreementTemplateType);
    const agreementNumber = useSelector((state: RootState) => state.pay.agreementNumber);
    const dealDocumentId = useSelector((state: RootState) => state.pay.dealDocumentId);
    const isPdb = agreementTemplateType === "pdb";
    const isSigned = isPdb ? Boolean(pdbSignedAt) : Boolean(doodocsSignedAt);

    useEffect(() => {
        if (!isPdb || !dealDocumentId) return;
        fetch(`/api/deals/${dealDocumentId}/sign-pdb`, { method: "GET", credentials: "include" })
            .then((r) => r.json().catch(() => ({})))
            .then((data) => {
                if (data?.signed && data?.signedAt) setPdbSignedAt(data.signedAt);
            })
            .catch(() => { });
    }, [isPdb, dealDocumentId]);

    // После перезагрузки восстанавливаем сводку по сделке: doodocsDocumentId, статус «Ожидания договора», agreementFileUrl (чтобы кнопка «Отправить на подпись» была доступна).
    useEffect(() => {
        if (!dealDocumentId) return;
        fetch(`/api/deals/${dealDocumentId}/summary`, { credentials: "include" })
            .then((r) => r.json().catch(() => ({})))
            .then((data: { doodocsDocumentId?: string | null; dealStatus?: string; agreementFileUrl?: string | null; projectDocumentId?: string | null }) => {
                if (data?.agreementFileUrl) dispatch(setAgreementFileUrl(data.agreementFileUrl));
                if (data?.projectDocumentId) setProjectDocumentIdFromDeal(data.projectDocumentId);
                if (!isPdb) {
                    if (data?.doodocsDocumentId) setDoodocsDocumentId(data.doodocsDocumentId);
                    if (data?.dealStatus === "Ожидания договора") setSentToSign(true);
                    // Если summary не вернул agreementFileUrl (например, другой формат в Strapi), запрашиваем ссылку на договор отдельно
                    if (!data?.agreementFileUrl) {
                        fetch(`/api/deals/${dealDocumentId}/signed-agreement`, { credentials: "include" })
                            .then((res) => res.json().catch(() => ({})))
                            .then((json: { url?: string }) => {
                                if (json?.url) dispatch(setAgreementFileUrl(json.url));
                            })
                            .catch(() => { });
                    }
                }
            })
            .catch(() => { });
    }, [dealDocumentId, isPdb, dispatch]);

    const docTypeLabel = agreementTemplateType === "ddu" ? "ДДУ" : agreementTemplateType === "pdb" ? "ПДБ" : "";
    const contractName =
        agreementNumber && docTypeLabel
            ? `${docTypeLabel} ${agreementNumber.replace(/\//g, "-")}`
            : flatData?.title
                ? `Договор — ${flatData.title}${flatData?.apartmentNumber != null ? `, кв. ${flatData.apartmentNumber}` : ""}`
                : "Договор";

    const handleSendToDoodocs = async () => {
        if (!agreementFileUrl) {
            setSignError(t("contract_link_not_available"));
            return;
        }
        const projectDocumentId = flatData?.projectDocumentId ?? projectDocumentIdFromDeal;
        if (!projectDocumentId) {
            setSignError(t("project_not_specified"));
            return;
        }
        setSignError(null);
        setSendStepMessage(null);
        setSendingToSign(true);
        try {
            const startRes = await fetch("/api/signing/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    fileUrl: agreementFileUrl,
                    contractName,
                    projectDocumentId,
                    dealDocumentId: dealDocumentId ?? undefined,
                }),
            });
            const startJson = await startRes.json().catch(() => ({}));
            if (!startRes.ok || startJson.status === "error") {
                setSignError(startJson?.message ?? startJson?.detail ?? t("failed_to_start_signing"));
                setSendingToSign(false);
                return;
            }
            if (startJson.signUrl) setSentToSign(true);
            if (startJson.documentId) setDoodocsDocumentId(startJson.documentId);
            setSendStepMessage(null);
            setSendingToSign(false);
        } catch {
            setSignError(t("network_error"));
        } finally {
            setSendingToSign(false);
            setSendStepMessage(null);
        }
    };

    const handleSignPdbOnSite = async () => {
        if (!dealDocumentId) return;
        setSignError(null);
        setSigningPdb(true);
        try {
            const res = await fetch(`/api/deals/${dealDocumentId}/sign-pdb`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.signedAt) {
                setPdbSignedAt(json.signedAt);
            } else {
                setSignError(json?.error ?? t("failed_to_confirm_signature"));
            }
        } catch {
            setSignError(t("network_error"));
        } finally {
            setSigningPdb(false);
        }
    };

    const handleFinish = async () => {
        setCompleting(true);
        setSignError(null);
        try {
            const res = await fetch("/api/pay/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    propertyDocumentId: payFlatDocumentId ?? agreementPayload?.propertyDocumentId ?? flatData?.documentId,
                    dealDocumentId: dealDocumentId ?? undefined,
                    usedPromocodeCode: agreementPayload?.usedPromocodeCode,
                    usedGalaBonusAmount: agreementPayload?.usedGalaBonusAmount,
                }),
            });
            if (res.ok) {
                onNext();
                window.location.reload();
                return;
            }
            const json = await res.json().catch(() => ({}));
            setSignError(json?.error ?? json?.message ?? t("failed_to_complete"));
        } catch {
            setSignError(t("network_error"));
        } finally {
            setCompleting(false);
        }
    };
    return (
        <div className="flex flex-col items-start gap-[24px] self-stretch">
            <div className="flex flex-col items-start gap-[8px] self-stretch">
                <div className="flex w-full h-full max-h-[168px] p-[16px] flex-col items-start gap-[10px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                    <div className="flex h-full max-h-[168px] justify-between items-center self-stretch gap-[36px]">
                        {flatData?.images?.[0] ? (
                            <div className="flex p-[10px] flex-col items-start gap-[10px] rounded-[16px] bg-[#FFF]">
                                <Image
                                    rel="preload"
                                    src={flatData.images[0]}
                                    alt={flatData?.id?.toString() || "no-image"}
                                    width={130}
                                    height={116}
                                    className="max-w-[200px] max-h-[200px] h-full w-full"
                                />
                            </div>
                        ) : (
                            <div className="w-[130px] h-[116px] bg-gray-200 rounded-[12px] flex items-center justify-center p-1">
                                <span className="text-gray-500 text-center">{t("no_image")}</span>
                            </div>
                        )}
                        <div className="flex w-full flex-col justify-between items-start self-stretch">
                            <div className="flex justify-between items-start self-stretch">
                                <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[24px]">{flatData?.title || ''}</h1>
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px] opacity-30">№{flatData?.apartmentNumber || ''}</span>
                            </div>
                            <div className="flex justify-between items-start self-stretch">
                                <h1 className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">{flatData?.room || ''} {t("rooms")}</h1>
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">{flatData?.area || ''}</span>
                            </div>
                            <div className="flex items-end gap-[5px] self-stretch">
                                <h1 className="text-[#2655AF] text-[20px] not-italic font-medium leading-[16px]">
                                    {agreementPayload?.totalSum != null
                                        ? formatPriceDisplay(agreementPayload.totalSum)
                                        : flatData?.price ?? ""}
                                </h1>
                            </div>
                            <div className="flex items-end gap-[5px] self-stretch">
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center self-stretch">
                    <div className="flex items-center gap-[4px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z" stroke="#7E7E7E" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span className="text-[#122C5E] text-[16px] not-italic font-normal leading-[100%]">
                            {t("sign_contract")}
                        </span>
                    </div>
                </div>
                {isPdb && agreementFileUrl && !pdbSignedAt && (
                    <p className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px]">
                        {t("precontract_generated")}
                    </p>
                )}
                {isPdb && pdbSignedAt && (
                    <p className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px]">
                        {t("contract_signed")} {formatSignedAt(pdbSignedAt)}.
                    </p>
                )}
                {!isPdb && sentToSign && !doodocsSignedAt && (
                    <p className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px]">
                        {t("link_to_signing_sent_to_whatsapp")}
                    </p>
                )}
                {!isPdb && doodocsSignedAt && (
                    <p className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px]">
                        {t("document_signed")} {formatSignedAt(doodocsSignedAt)}.
                    </p>
                )}
                {signError && (
                    <p className="text-red-600 text-[14px] not-italic font-normal leading-[20px]">{signError}</p>
                )}
                {!isPdb && sendingToSign && (
                    <>
                        {sendStepMessage && (
                            <p className="text-[#1A3C7E] text-[14px] not-italic font-medium leading-[20px]">
                                {sendStepMessage}
                            </p>
                        )}
                        <p className="text-[#7E7E7E] text-[13px] not-italic font-normal leading-[18px]">
                            {t("it_usually_takes_20_to_40_seconds")}
                        </p>
                    </>
                )}
            </div>
            <div className="flex flex-col gap-3 self-stretch">
                {isPdb && agreementFileUrl && (
                    <>
                        <Button
                            as="a"
                            href={agreementFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] border border-[#1A3C7E] bg-transparent">
                            <span className="text-[#1A3C7E] text-[15px] not-italic font-medium leading-[20px]">
                                {t("download_contract")}
                            </span>
                        </Button>
                        {!pdbSignedAt && (
                            <Button
                                onPress={handleSignPdbOnSite}
                                isDisabled={signingPdb || !dealDocumentId}
                                isLoading={signingPdb}
                                className="bg-[#1A3C7E] flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] border border-[#1A3C7E]">
                                <span className="text-white text-[15px] not-italic font-medium leading-[20px]">
                                    {signingPdb ? t("saving") : t("sign_contract")}
                                </span>
                            </Button>
                        )}
                    </>
                )}
                {!isPdb && !sentToSign && (
                    <Button
                        onPress={handleSendToDoodocs}
                        isDisabled={sendingToSign || !agreementFileUrl}
                        className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]">
                        <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">
                            {sendingToSign ? t("sending") : t("send_to_sign")}
                        </span>
                    </Button>
                )}
                {!isSigned && !isPdb && sentToSign && doodocsDocumentId && dealDocumentId && (
                    <Button
                        onPress={async () => {
                            setSignError(null);
                            setCheckingStatus(true);
                            try {
                                const res = await fetch("/api/signing/check-status", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({
                                        documentId: doodocsDocumentId,
                                        dealDocumentId,
                                    }),
                                });
                                const data = await res.json().catch(() => ({}));
                                if (data.signed && data.signedAt) {
                                    setDoodocsSignedAt(data.signedAt);
                                } else if (!res.ok) {
                                    setSignError(data?.error ?? data?.detail ?? "Ошибка проверки статуса");
                                } else {
                                    setSignError(t("both_sides_must_sign"));
                                }
                            } catch {
                                setSignError(t("network_error"));
                            } finally {
                                setCheckingStatus(false);
                            }
                        }}
                        isDisabled={checkingStatus}
                        className="bg-[#1A3C7E] flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] border border-[#1A3C7E]">
                        <span className="text-white text-[15px] not-italic font-medium leading-[20px]">
                            {checkingStatus ? t("checking_status") : t("check_status")}
                        </span>
                    </Button>
                )}
                <Button
                    onPress={handleFinish}
                    isDisabled={completing || !isSigned}
                    className="bg-[#DB1D31] flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] border border-[#1A3C7E] disabled:opacity-50 disabled:cursor-not-allowed">
                    <span className="text-white text-[15px] not-italic font-medium leading-[20px]">
                        {completing ? t("loading") : !isSigned ? t("contract_not_signed") : t("finish")}
                    </span>
                </Button>
            </div>
        </div>
    )
}