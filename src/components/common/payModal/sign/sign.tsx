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
import type { RealEstateType } from "@/types/flat";

function formatSignedAt(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
        return iso;
    }
}

interface DocStatus {
    templateType: string;
    documentName?: string;
    recordDocumentId?: string;
    doodocsDocumentId?: string;
    signUrl?: string;
    signed: boolean;
    signedAt: string | null;
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
    realEstateType?: RealEstateType;
    onNext: () => void;
}

export default function Sign({ flatData, agreementPayload, realEstateType = "property", onNext }: SignProps) {
    const t = useTranslations();
    const isResidential = realEstateType === "property";
    const unitLabel = realEstateType === "commerce" ? "Коммерция" : realEstateType === "parking" ? "Паркинг" : realEstateType === "pantry" ? "Кладовка" : "Квартира";
    const dispatch = useDispatch();
    const [completing, setCompleting] = useState(false);
    const [sendingToSign, setSendingToSign] = useState(false);
    const [sentToSign, setSentToSign] = useState(false);
    const [docStatuses, setDocStatuses] = useState<DocStatus[]>([]);
    const [signError, setSignError] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    const payFlatDocumentId = useSelector((state: RootState) => state.pay.flat?.documentId);
    const agreementFileUrl = useSelector((state: RootState) => state.pay.agreementFileUrl);
    const agreementFiles = useSelector((state: RootState) => state.pay.agreementFiles);
    const agreementTemplateType = useSelector((state: RootState) => state.pay.agreementTemplateType);
    const agreementNumber = useSelector((state: RootState) => state.pay.agreementNumber);
    const dealDocumentId = useSelector((state: RootState) => state.pay.dealDocumentId);
    const isPdb = agreementTemplateType === "pdb";

    const allDocsSigned = docStatuses.length > 0 && docStatuses.every((d) => d.signed);

    useEffect(() => {
        setSentToSign(false);
        setDocStatuses([]);
        if (!dealDocumentId) return;
        fetch(`/api/deals/${dealDocumentId}/summary`, { credentials: "include" })
            .then((r) => r.json().catch(() => ({})))
            .then((data: any) => {
                if (data?.agreementFileUrl) dispatch(setAgreementFileUrl(data.agreementFileUrl));
                const status = String(data?.dealStatus ?? "").trim();
                const isSigningFlowStatus =
                    status === "Ожидания договора" ||
                    status === "Договор подписан" ||
                    status === "Оплачено";
                // Old/cancelled deals can keep doodocsDocumentId in history.
                // Consider link as "sent" only when the deal is in signing flow statuses.
                if (Boolean(data?.doodocsDocumentId) && isSigningFlowStatus) {
                    setSentToSign(true);
                }
                if (!data?.agreementFileUrl) {
                    fetch(`/api/deals/${dealDocumentId}/signed-agreement`, { credentials: "include" })
                        .then((res) => res.json().catch(() => ({})))
                        .then((json: { url?: string }) => {
                            if (json?.url) dispatch(setAgreementFileUrl(json.url));
                        })
                        .catch(() => { });
                }
            })
            .catch(() => { });
    }, [dealDocumentId, dispatch]);

    const docTypeLabel = agreementTemplateType === "ddu" ? "ДДУ" : agreementTemplateType === "pdb" ? "ПДБ" : "";
    const contractName =
        agreementNumber && docTypeLabel
            ? `${docTypeLabel} ${agreementNumber.replace(/\//g, "-")}`
            : flatData?.title
                ? `Договор — ${flatData.title}${flatData?.apartmentNumber != null ? `, кв. ${flatData.apartmentNumber}` : ""}`
                : "Договор";

    const handleSendToDoodocs = async () => {
        if (!dealDocumentId) {
            setSignError("dealDocumentId отсутствует");
            return;
        }
        setSignError(null);
        setSendingToSign(true);
        try {
            const startRes = await fetch("/api/signing/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ dealDocumentId }),
            });
            const startJson = await startRes.json().catch(() => ({}));
            if (!startRes.ok || startJson.status === "error") {
                setSignError(startJson?.message ?? startJson?.detail ?? t("failed_to_start_signing"));
                setSendingToSign(false);
                return;
            }
            setSentToSign(true);
            if (Array.isArray(startJson.documents)) {
                setDocStatuses(startJson.documents.map((d: any) => ({
                    templateType: d.templateType,
                    documentName: d.documentName,
                    recordDocumentId: d.recordDocumentId,
                    doodocsDocumentId: d.doodocsDocumentId,
                    signUrl: d.signUrl,
                    signed: false,
                    signedAt: null,
                })));
            }
            setSendingToSign(false);
        } catch {
            setSignError(t("network_error"));
        } finally {
            setSendingToSign(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!dealDocumentId) return;
        setSignError(null);
        setCheckingStatus(true);
        try {
            const res = await fetch("/api/signing/check-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ dealDocumentId }),
            });
            const data = await res.json().catch(() => ({}));
            const remoteDocs: DocStatus[] = Array.isArray(data.documents)
                ? data.documents.map((d: any) => ({
                    templateType: d.templateType,
                    documentName: d.documentName,
                    recordDocumentId: d.recordDocumentId,
                    doodocsDocumentId: d.doodocsDocumentId,
                    signUrl: d.signUrl,
                    signed: Boolean(d.signed),
                    signedAt: d.signedAt ?? null,
                }))
                : [];

            if (data.allSigned) {
                setDocStatuses((prev) => {
                    if (prev.length === 0) return remoteDocs.map((d) => ({ ...d, signed: true }));
                    return prev.map((d) => ({
                        ...d,
                        signed: true,
                        signedAt: remoteDocs.find((dd) => dd.templateType === d.templateType)?.signedAt ?? d.signedAt
                    }));
                });
            } else if (remoteDocs.length > 0) {
                setDocStatuses((prev) => {
                    if (prev.length === 0) return remoteDocs;
                    return prev.map((d) => {
                        const remote = remoteDocs.find((dd) => dd.doodocsDocumentId === d.doodocsDocumentId || dd.templateType === d.templateType);
                        if (remote) {
                            return {
                                ...d,
                                documentName: remote.documentName ?? d.documentName,
                                signed: remote.signed,
                                signedAt: remote.signedAt ?? d.signedAt
                            };
                        }
                        return d;
                    });
                });
            } else if (!res.ok) {
                const err = data?.error ?? data?.detail ?? "Ошибка проверки статуса";
                setSignError(err === "doodocs_unavailable" ? t("doodocs_unavailable") : err);
            } else {
                setSignError(t("both_sides_must_sign"));
            }
        } catch {
            setSignError(t("network_error"));
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleFinish = async () => {
        setCompleting(true);
        setSignError(null);
        try {
            const idempotencyKey =
                (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
                    ? crypto.randomUUID()
                    : `pay_complete_${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const res = await fetch("/api/pay/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
                credentials: "include",
                body: JSON.stringify({
                    propertyDocumentId: payFlatDocumentId ?? agreementPayload?.propertyDocumentId ?? flatData?.documentId,
                    realEstateType,
                    dealDocumentId: dealDocumentId ?? undefined,
                    usedPromocodeCode: agreementPayload?.usedPromocodeCode,
                    usedGalaBonusAmount: agreementPayload?.usedGalaBonusAmount,
                }),
            });
            if (res.ok) {
                onNext();
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

    const templateTypeLabel = (type: string) => {
        if (type === "ДДУ") return "ДДУ";
        if (type === "Доп соглашение") return "Доп соглашение";
        if (type === "Соглашение о задатке") return "Соглашение о задатке";
        if (type === "Расторжение") return "Расторжение";
        if (type === "Переоформление") return "Переоформление";
        return type;
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
                                <h1 className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">
                                    {isResidential ? `${flatData?.room || ""} ${t("rooms_count")}` : unitLabel}
                                </h1>
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

                {/* Generated files list */}
                {!isPdb && agreementFiles.length > 0 && (
                    <div className="flex flex-col gap-1 self-stretch">
                        <p className="text-[#122C5E] text-[14px] font-medium">{t("generated_documents")}:</p>
                        {agreementFiles.map((f, i) => {
                            const label = f.documentName?.replace(/\.(docx|pdf)$/i, "") || `${templateTypeLabel(f.templateType)}${agreementNumber ? ` ${agreementNumber}` : ""}`;
                            return (
                                <a key={i} href={f.fileUrl}
                                    download={`${label}.docx`}
                                    className="flex items-center gap-2 text-[#2655AF] text-[13px] underline truncate">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    {label}
                                </a>
                            );
                        })}
                    </div>
                )}

                {isPdb && agreementFileUrl && !allDocsSigned && (
                    <p className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px]">
                        {t("precontract_generated")}
                    </p>
                )}
                {isPdb && allDocsSigned && (
                    <p className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px]">
                        {t("contract_signed")} {formatSignedAt(docStatuses.find((d) => d.signed)?.signedAt)}.
                    </p>
                )}

                {sentToSign && docStatuses.length > 0 && (
                    <div className="flex flex-col gap-1 self-stretch">
                        {docStatuses.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${d.signed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className="text-[14px] text-[#122C5E]">
                                    {templateTypeLabel(d.templateType)}: {d.signed ? `✓ ${t("document_signed") ?? "Подписан"} ${formatSignedAt(d.signedAt)}` : t("awaiting_signature") ?? "Ожидает подписания"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {sentToSign && docStatuses.length === 0 && (
                    <p className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px]">
                        {t("link_to_signing_sent_to_whatsapp")}
                    </p>
                )}

                {/* Signed documents download section */}
                {docStatuses.some((d) => d.signed && (d.recordDocumentId || d.doodocsDocumentId)) && (
                    <div className="flex flex-col gap-1 self-stretch">
                        <p className="text-[#122C5E] text-[14px] font-medium">{t("signed_documents")}:</p>
                        {docStatuses
                            .filter((d) => d.signed && (d.recordDocumentId || d.doodocsDocumentId))
                            .map((d, i) => {
                                const label = d.documentName?.replace(/\.(docx|pdf)$/i, "") || `${templateTypeLabel(d.templateType)}${agreementNumber ? ` ${agreementNumber}` : ""}`;
                                return (
                                    <a
                                        key={i}
                                        href={`/api/signed-agreements/download-signed?doodocsDocumentId=${encodeURIComponent(d.doodocsDocumentId ?? "")}${dealDocumentId ? `&dealDocumentId=${encodeURIComponent(dealDocumentId)}` : ""}`}
                                        download={`${label}.pdf`}
                                        className="flex items-center gap-2 text-[#2655AF] text-[13px] underline"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        {label} (PDF)
                                    </a>
                                );
                            })}
                    </div>
                )}

                {signError && (
                    <p className="text-red-600 text-[14px] not-italic font-normal leading-[20px]">{signError}</p>
                )}
                {sendingToSign && (
                    <p className="text-[#7E7E7E] text-[13px] not-italic font-normal leading-[18px]">
                        {t("it_usually_takes_20_to_40_seconds")}
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-3 self-stretch">
                {!sentToSign && (
                    <Button
                        onPress={handleSendToDoodocs}
                        isDisabled={sendingToSign || (!agreementFileUrl && agreementFiles.length === 0)}
                        className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]">
                        <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">
                            {sendingToSign ? t("sending") : t("send_to_sign")}
                        </span>
                    </Button>
                )}
                {sentToSign && !allDocsSigned && (
                    <Button
                        onPress={handleCheckStatus}
                        isDisabled={checkingStatus}
                        className="bg-[#1A3C7E] flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] border border-[#1A3C7E]">
                        <span className="text-white text-[15px] not-italic font-medium leading-[20px]">
                            {checkingStatus ? t("checking_status") : t("check_status")}
                        </span>
                    </Button>
                )}
                <Button
                    onPress={handleFinish}
                    isDisabled={completing || !allDocsSigned}
                    className="bg-[#DB1D31] flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] border border-[#1A3C7E] disabled:opacity-50 disabled:cursor-not-allowed">
                    <span className="text-white text-[15px] not-italic font-medium leading-[20px]">
                        {completing ? t("loading") : !allDocsSigned ? t("contract_not_signed") : t("finish")}
                    </span>
                </Button>
            </div>
        </div>
    )
}
