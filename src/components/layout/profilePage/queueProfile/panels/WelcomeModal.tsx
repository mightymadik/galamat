"use client";

import { Button } from "@heroui/button";
import { Modal, ModalContent } from "@heroui/react";

export type WelcomeModalProps = {
    isOpen: boolean;
    onClose: () => void;
    /** ФИО вызванного клиента */
    clientName?: string;
    /** Номер талона */
    ticketNumber?: string | number;
    /** Имя менеджера (оператора) */
    managerName?: string;
};

const DEFAULT_CLIENT_NAME = "Кудайбергенова Асель Галаматовна";
const DEFAULT_TICKET = "124";
const DEFAULT_MANAGER = "Алем";

export default function WelcomeModal({
    isOpen,
    onClose,
    clientName = DEFAULT_CLIENT_NAME,
    ticketNumber = DEFAULT_TICKET,
    managerName = DEFAULT_MANAGER,
}: WelcomeModalProps) {
    const ticket = String(ticketNumber);

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={(open) => !open && onClose()}
            placement="center"
            hideCloseButton={true}
            size="3xl"
            classNames={{
                base: "rounded-[32px] border-0 bg-transparent shadow-none max-w-[90vw] overflow-hidden",
                wrapper: "bg-black/50",
                body: "p-0",
            }}
        >
            <ModalContent>
                <div className="relative flex flex-col rounded-[32px] overflow-hidden bg-[#B31623]">
                    <div
                        className="bg-[url('/img/welcomeModal.svg')] bg-cover bg-center p-6 sm:p-10 md:p-12 lg:p-16"
                        style={{ height: '80vh' }}
                    >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 h-full">
                            <div className="flex flex-col justify-between gap-4 sm:gap-6 flex-1 min-w-0 h-full">
                                <div className="flex justify-start items-start">
                                    <span className="text-white text-[clamp(80px,20vw,200px)] sm:text-[clamp(120px,25vw,260px)] font-bold leading-[0.9] tabular-nums">
                                        {ticket}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 sm:gap-3">
                                    <p className="text-white/70 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal">
                                        Здравствуйте,
                                    </p>
                                    <p className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold break-words">
                                        {clientName}
                                    </p>
                                    <p className="text-white text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-normal">
                                        Вас приветствует менеджер{" "}
                                        <span className="font-bold">{managerName}</span>
                                    </p>
                                </div>
                            </div>
                            <Button
                                onPress={onClose}
                                aria-label="Закрыть"
                                className="flex-shrink-0 w-12 h-12 min-w-12 min-h-12 sm:w-14 sm:h-14 sm:min-w-14 sm:min-h-14 rounded-[16px] bg-[#F4F6FB]"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    aria-hidden
                                >
                                    <path
                                        d="M10.6464 0.146447C10.8417 -0.0488153 11.1582 -0.0488155 11.3535 0.146447C11.5487 0.341712 11.5487 0.658228 11.3535 0.853478L6.45699 5.74996L11.3535 10.6464C11.5487 10.8417 11.5487 11.1582 11.3535 11.3535C11.1582 11.5487 10.8417 11.5487 10.6464 11.3535L5.74996 6.45699L0.853478 11.3535C0.658228 11.5487 0.341712 11.5487 0.146447 11.3535C-0.0488155 11.1582 -0.0488155 10.8417 0.146447 10.6464L5.04293 5.74996L0.146447 0.853478C-0.0488155 0.658216 -0.0488155 0.341709 0.146447 0.146447C0.341709 -0.0488155 0.658216 -0.0488155 0.853478 0.146447L5.74996 5.04293L10.6464 0.146447Z"
                                        fill="#122C5E"
                                    />
                                </svg>
                            </Button>
                        </div>
                    </div>
                </div>
            </ModalContent>
        </Modal>
    );
}
