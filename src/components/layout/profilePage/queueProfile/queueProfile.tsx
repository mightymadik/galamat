"use client"
import { useState, useEffect } from "react"
import { Button, ButtonGroup } from "@heroui/button"
import { Chip, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl"
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { QueueProfileStatus } from "@/store/queueProfileSlice";
import {
  cancelStatusChange, confirmStatusChange, goToWaitingForNext, requestStatusChange,
  setWithClient, startServicing, toggleHistory,
  openDeskModal, confirmDeskAndGoOnline, cancelDeskModal, addDesk, MAX_DESKS,
} from "@/store/queueProfileSlice";
import QueueMainPanel from "./panels/QueueMainPanel";
import WelcomeModal from "./panels/WelcomeModal";

const WAITING_TIMER_SEC = 500;

const STATUS_LABELS: Record<string, string> = {
    available: "Доступен",
    break: "Перерыв",
    lunch: "Обед",
    unavailable: "Недоступен",
}

const STATUS_CHIP_CONFIG: Record<
    string,
    { base: string; content: string; label: string }
> = {
    available: {
        base: "rounded-[16px] bg-[rgba(38,175,43,0.12)]",
        content: "text-[#007D04] text-center text-[12px] not-italic font-medium leading-[17.359px]",
        label: "• Вы онлайн",
    },
    break: {
        base: "rounded-[16px] bg-[rgba(129,68,219,0.40)]",
        content: "text-[#8144DB] text-center text-[12px] not-italic font-medium leading-[17.359px]",
        label: "• Перерыв",
    },
    lunch: {
        base: "rounded-[16px] bg-[rgba(245,160,18,0.12)]",
        content: "text-[#F5A012] text-center text-[12px] not-italic font-medium leading-[17.359px]",
        label: "• Обед",
    },
    unavailable: {
        base: "rounded-[16px] bg-[rgba(219,29,49,0.12)]",
        content: "text-[#DB1D31] text-center text-[12px] not-italic font-medium leading-[17.359px]",
        label: "• Недоступен",
    },
}

export default function QueueProfile() {
    const t = useTranslations()
    const [redirectWindow, setRedirectWindow] = useState<string>("")
    const [countdown, setCountdown] = useState<number>(WAITING_TIMER_SEC)
    const [showWelcomeModal, setShowWelcomeModal] = useState(false)
    // Local state for desk currently picked inside the modal (not yet confirmed)
    const [draftDesk, setDraftDesk] = useState<string>("")
    // Input for adding a new desk
    const [newDeskName, setNewDeskName] = useState<string>("")
    const dispatch = useAppDispatch()
    const {
        status, phase, callServicePhase, waitingElapsedSeconds,
        pendingStatus, isStatusModalOpen, isHistoryOpen,
        selectedDesk, desks, isDeskModalOpen,
    } = useAppSelector((s) => s.queueProfile)

    // Sync draft with the confirmed desk whenever the modal opens; reset add-input
    useEffect(() => {
        if (isDeskModalOpen) {
            setDraftDesk(selectedDesk)
            setNewDeskName("")
        }
    }, [isDeskModalOpen, selectedDesk])

    const handleAddDesk = () => {
        const trimmed = newDeskName.trim()
        if (!trimmed || desks.length >= MAX_DESKS) return
        const key = `desk_custom_${Date.now()}`
        dispatch(addDesk({ key, label: trimmed }))
        setDraftDesk(key)
        setNewDeskName("")
    }

    const isWaitingForNext = status === "available" && phase === "waitingForNext"

    useEffect(() => {
        if (!isWaitingForNext) {
            setCountdown(WAITING_TIMER_SEC)
            return
        }
        if (countdown <= 0) {
            dispatch(setWithClient())
            setShowWelcomeModal(true)
            return
        }
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
        return () => clearTimeout(t)
    }, [isWaitingForNext, countdown, dispatch])

    const handleStatusSelectionChange = (keys: unknown) => {
        const key = typeof keys === "object" && keys !== null && Symbol.iterator in keys
            ? Array.from(keys as Set<string>)[0]
            : undefined
        if (key != null && Object.prototype.hasOwnProperty.call(STATUS_LABELS, key)) {
            dispatch(requestStatusChange(key as QueueProfileStatus))
        }
    }

    const handleRedirect = () => {
        if (redirectWindow) {
            setCountdown(WAITING_TIMER_SEC)
            dispatch(goToWaitingForNext())
            setRedirectWindow("")
        }
    }

    const handleFinishService = () => {
        setCountdown(WAITING_TIMER_SEC)
        dispatch(goToWaitingForNext())
    }

    return (
        <div className="wrapper h-full flex flex-col gap-[32px]">
            <div className="flex flex-col lg:flex-row gap-[16px]">

                <div className="flex flex-col lg:min-w-[710px] w-full h-full items-start gap-[16px] self-stretch rounded-[24px] bg-[#F4F6FB]">
                    <QueueMainPanel
                        status={status}
                        phase={phase}
                        isHistoryOpen={isHistoryOpen}
                        onToggleHistory={() => dispatch(toggleHistory())}
                    />
                </div>

                <div className="flex w-full flex-col items-start gap-[12px]">
                    <Chip
                        classNames={{
                            base: STATUS_CHIP_CONFIG[status]?.base ?? "rounded-[16px]",
                            content: STATUS_CHIP_CONFIG[status]?.content ?? "text-center text-[12px] not-italic font-medium leading-[17.359px]",
                        }}
                    >
                        {STATUS_CHIP_CONFIG[status]?.label ?? STATUS_LABELS[status] ?? status}
                    </Chip>
                    <Select
                        placeholder="Выберите статус"
                        selectedKeys={[status]}
                        onSelectionChange={handleStatusSelectionChange}
                        classNames={{
                            base: "w-full",
                            label: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
                            trigger: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
                            listbox: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
                        }}
                    >
                        <SelectItem key="available">Доступен</SelectItem>
                        <SelectItem key="break">Перерыв</SelectItem>
                        <SelectItem key="lunch">Обед</SelectItem>
                        <SelectItem key="unavailable">Недоступен</SelectItem>
                    </Select>

                    {/* ── Desk row — always visible; "Изменить" only when unavailable ── */}
                    <div className="flex items-center justify-between gap-[8px] self-stretch px-[16px] py-[10px] rounded-[16px] bg-[#F4F6FB]">
                        <div className="flex flex-col gap-[2px]">
                            <span className="text-[rgba(7,7,31,0.48)] text-[12px] font-normal leading-[16px]">Рабочее окно</span>
                            <span className="text-[#1A3C7E] text-[16px] font-medium leading-[normal]">
                                {desks.find((d) => d.key === selectedDesk)?.label ?? selectedDesk}
                            </span>
                        </div>
                        {status === "unavailable" && (
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => dispatch(openDeskModal())}
                                className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E] text-[13px] font-medium h-[32px] min-w-[32px] px-[10px]"
                            >
                                Изменить
                            </Button>
                        )}
                    </div>

                    {status === "available" && phase === "withClient" ? (
                        <div className="flex flex-col items-start gap-[24px] self-stretch">
                            <div className="flex p-[16px] flex-col items-start gap-[10px] self-stretch rounded-[24px] bg-[#F4F6FB]">
                                <div className="flex flex-col items-start gap-[12px] self-stretch">
                                    <h1 className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
                                        Перенаправление клиента
                                    </h1>
                                    <div className="flex flex-col items-start gap-[12px] self-stretch">
                                        <p className="text-[rgba(7,_7,_31,_0.48)] text-[14px] not-italic font-normal leading-[normal]">
                                            Выберите окно
                                        </p>
                                        <Select
                                            placeholder="Перенаправление"
                                            selectedKeys={redirectWindow ? [redirectWindow] : []}
                                            onSelectionChange={(keys) => {
                                                const key = Array.from(keys)[0]
                                                setRedirectWindow(key != null ? String(key) : "")
                                            }}
                                            classNames={{
                                                base: "w-full bg-[#F4F6FB]",
                                                label: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
                                                trigger: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
                                                listbox: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
                                            }}
                                        >
                                            <SelectItem key="otbasy">Отбасы</SelectItem>
                                            <SelectItem key="cashbox">Касса</SelectItem>
                                            <SelectItem key="1">Асель</SelectItem>
                                            <SelectItem key="2">Темирлан</SelectItem>
                                        </Select>
                                        <Button
                                            isDisabled={!redirectWindow}
                                            onPress={handleRedirect}
                                            className="flex w-[100%] h-[40px] p-0 min-w-[100%] min-h-[40px] justify-center items-center gap-[4px] rounded-[12px] bg-[#1A3C7E] disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">Перенаправить</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {callServicePhase === "waiting" ? (
                                <div className="flex flex-col items-start gap-[12px] self-stretch">
                                    <p className="text-[#1E1E1E] text-[16px] not-italic font-medium leading-[normal]">Клиент явился?</p>
                                    <ButtonGroup className="w-full" size="lg" variant="flat">
                                        <Button
                                            onPress={() => dispatch(startServicing(waitingElapsedSeconds))}
                                            className="flex-1 rounded-[12px] bg-[#1A3C7E] text-[#FFF]"
                                        >
                                            Да
                                        </Button>
                                        <Button
                                            onPress={handleFinishService}
                                            className="flex-1 rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
                                        >
                                            Нет
                                        </Button>
                                    </ButtonGroup>
                                </div>
                            ) : (
                                <Button
                                    onPress={handleFinishService}
                                    className="flex h-[52px] min-w-[52px] min-h-[52px] p-[15px] justify-center items-center gap-[4px] self-stretch rounded-[24px] border-[1px] border-solid border-[rgba(19,44,94,0.24)] bg-[#DB1D31]"
                                >
                                    <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">Завершить обслуживание</span>
                                </Button>
                            )}
                        </div>
                    ) : isWaitingForNext ? (
                        <div className="flex flex-col items-start gap-[24px] self-stretch">
                            <div className="flex p-[16px] flex-col items-start gap-[12px] self-stretch rounded-[24px] bg-[#F4F6FB]">
                                <h1 className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
                                    Время до следующего клиента
                                </h1>
                                <div className="flex items-center justify-center self-stretch py-4">
                                    <span className="text-[#1A3C7E] text-[32px] not-italic font-bold tabular-nums">
                                        {countdown} с
                                    </span>
                                </div>
                            </div>
                            <Button
                                onPress={() => {
                                    dispatch(setWithClient())
                                    setShowWelcomeModal(true)
                                }}
                                className="flex h-[52px] min-w-[52px] min-h-[52px] p-[15px] justify-center items-center gap-[4px] self-stretch rounded-[24px] bg-[#1A3C7E]"
                            >
                                <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">Вызвать</span>
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
            {status === "available" && (
                <div className="flex h-full p-[16px] flex-col items-start gap-[16px] self-stretch rounded-[16px] bg-[#F4F6FB]">
                    <div className="flex justify-between items-end self-stretch">
                        <p className="text-[#2C2D31] text-[14.956px] not-italic font-normal leading-[12px] opacity-40">
                            ФИО
                        </p>
                        <p className="text-[#2C2D31] text-[14.956px] not-italic font-normal leading-[12px] opacity-40">
                            Талон №
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch rounded-[4px]">
                        <div className="flex flex-col items-start flex-[1_0_0] self-stretch rounded-[8px] bg-[#FFF]">
                            <div className="flex px-[16px] py-[8px] justify-between items-center self-stretch rounded-[8px] [border-bottom:1px_solid_rgba(19,_44,_94,_0.07)] bg-[rgba(38,_85,_175,_0.24)]">
                                <div className="flex flex-col justify-center items-start flex-[1_0_0] rounded-[8px]">
                                    <p className="text-[#132C5E] text-[14px] not-italic font-bold leading-[24px]">
                                        Следующий (-ая)
                                    </p>
                                    <span className="text-[#132C5E] text-[20px] not-italic font-normal leading-[24px]">
                                        Айымгүл Нұрсұлтанова Жанарбекқызы
                                    </span>
                                </div>
                            </div>
                            <div className="flex px-[16px] py-[8px] justify-between items-center self-stretch [border-bottom:1px_solid_rgba(19,_44,_94,_0.07)]">
                                <div className="flex flex-col justify-center items-start flex-[1_0_0] rounded-[8px]">
                                    <span className="text-[#132C5E] text-[20px] not-italic font-normal leading-[24px]">
                                        Ерлан Тұрарбеков Сейітбекұлы
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isStatusModalOpen}
                onOpenChange={(open) => !open && dispatch(cancelStatusChange())}
                placement="center"
                classNames={{
                    base: "rounded-[24px] border border-[rgba(19,44,94,0.12)]",
                    header: "border-b border-[rgba(19,44,94,0.07)]",
                    body: "py-6",
                    footer: "border-t border-[rgba(19,44,94,0.07)] gap-2",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <span className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
                            Изменение статуса
                        </span>
                    </ModalHeader>
                    <ModalBody>
                        <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[normal]">
                            Вы уверены, что хотите изменить статус на{" "}
                            <span className="font-medium text-[#1A3C7E]">
                                {pendingStatus ? STATUS_LABELS[pendingStatus] ?? pendingStatus : ""}
                            </span>
                            ?
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="flat"
                            onPress={() => dispatch(cancelStatusChange())}
                            className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
                        >
                            Отмена
                        </Button>
                        <Button
                            onPress={() => dispatch(confirmStatusChange())}
                            className="rounded-[12px] bg-[#1A3C7E] text-white"
                        >
                            Подтвердить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <WelcomeModal
                isOpen={showWelcomeModal}
                onClose={() => setShowWelcomeModal(false)}
                clientName="Кудайбергенова Асель Галаматовна"
                ticketNumber={124}
                managerName="Алем"
            />

            {/* ── Desk selection modal (unavailable → available) ── */}
            <Modal
                isOpen={isDeskModalOpen}
                onOpenChange={(open) => !open && dispatch(cancelDeskModal())}
                placement="center"
                classNames={{
                    base: "rounded-[24px] border border-[rgba(19,44,94,0.12)]",
                    header: "border-b border-[rgba(19,44,94,0.07)]",
                    body: "py-6",
                    footer: "border-t border-[rgba(19,44,94,0.07)] gap-2",
                }}
            >
                <ModalContent>
                    <ModalHeader>
                        <span className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
                            Выбор рабочего окна
                        </span>
                    </ModalHeader>
                    <ModalBody className="flex flex-col gap-[16px]">
                        <p className="text-[rgba(7,7,31,0.48)] text-[14px] font-normal leading-[20px]">
                            Выберите рабочее окно перед тем, как перейти в статус{" "}
                            <span className="font-medium text-[#1A3C7E]">«Доступен»</span>
                        </p>

                        {/* Desk select */}
                        <Select
                            label="Рабочее окно"
                            placeholder="Выберите окно"
                            selectedKeys={draftDesk ? [draftDesk] : []}
                            onSelectionChange={(keys) => {
                                const key = Array.from(keys as Set<string>)[0]
                                if (key) setDraftDesk(String(key))
                            }}
                            classNames={{
                                base: "w-full",
                                label: "text-[#1A3C7E] text-[14px] font-normal",
                                trigger: "text-[#1A3C7E] text-[16px] font-normal",
                                listbox: "text-[#1A3C7E] text-[16px] font-normal",
                            }}
                        >
                            {desks.map((desk) => (
                                <SelectItem key={desk.key}>{desk.label}</SelectItem>
                            ))}
                        </Select>

                        {/* Add new desk */}
                        <div className="flex flex-col gap-[8px]">
                            <div className="flex items-center justify-between">
                                <span className="text-[#282D3C] text-[14px] font-medium leading-[normal]">
                                    Добавить окно
                                </span>
                                <span className={`text-[12px] font-normal ${desks.length >= MAX_DESKS ? "text-[#DB1D31]" : "text-[rgba(7,7,31,0.40)]"}`}>
                                    {desks.length} / {MAX_DESKS}
                                </span>
                            </div>
                            <div className="flex items-center gap-[8px]">
                                <Input
                                    placeholder="Название окна"
                                    value={newDeskName}
                                    onValueChange={setNewDeskName}
                                    isDisabled={desks.length >= MAX_DESKS}
                                    maxLength={40}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleAddDesk() }}
                                    classNames={{
                                        base: "flex-1",
                                        input: "text-[#1A3C7E] text-[14px]",
                                        inputWrapper: "rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-[#F4F6FB]",
                                    }}
                                />
                                <Button
                                    isDisabled={!newDeskName.trim() || desks.length >= MAX_DESKS}
                                    onPress={handleAddDesk}
                                    className="rounded-[12px] bg-[#1A3C7E] text-white h-[40px] min-w-[40px] px-[14px] disabled:opacity-40"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 2.667v10.666M2.667 8h10.666" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </Button>
                            </div>
                            {desks.length >= MAX_DESKS && (
                                <p className="text-[#DB1D31] text-[12px] font-normal">
                                    Достигнут максимум ({MAX_DESKS} окон)
                                </p>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="flat"
                            onPress={() => dispatch(cancelDeskModal())}
                            className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
                        >
                            Отмена
                        </Button>
                        <Button
                            isDisabled={!draftDesk}
                            onPress={() => {
                                if (!draftDesk) return
                                dispatch(confirmDeskAndGoOnline(draftDesk))
                            }}
                            className="rounded-[12px] bg-[#1A3C7E] text-white disabled:opacity-50"
                        >
                            Подтвердить и выйти онлайн
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    )
}