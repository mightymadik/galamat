"use client"
import {
    Modal,
    ModalContent,
    ModalBody,
    Button,
    useDisclosure,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

export default function CtaModal() {
    const t = useTranslations();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const router = useRouter();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const hasShownRef = useRef(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const openModal = useCallback(() => {
        if (!hasShownRef.current) {
            onOpen();
            sessionStorage.setItem('ctaModalSessionShown', 'true');
            hasShownRef.current = true;
        }
    }, [onOpen]);

    useEffect(() => {
        if (!mounted || typeof window === 'undefined') {
            return;
        }

        try {
            const sessionKey = 'ctaModalSessionShown';
            const modalShownThisPage = sessionStorage.getItem(sessionKey);
            
            if (modalShownThisPage === 'true') {
                return;
            }

            const storageKey = 'ctaModalVisitTime';
            let visitTime = sessionStorage.getItem(storageKey);
            
            if (!visitTime) {
                visitTime = Date.now().toString();
                sessionStorage.setItem(storageKey, visitTime);
            }

            const timeElapsed = Date.now() - Number(visitTime);
            const timeRemaining = 30000 - timeElapsed;

            if (timeRemaining <= 0) {
                openModal();
            } else {
                timerRef.current = setTimeout(() => {
                    openModal();
                }, timeRemaining);
            }
        } catch (error) {
            // Silent error handling
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [mounted, openModal]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        
        if (!isOpen && hasShownRef.current) {
            sessionStorage.setItem('ctaModalSessionShown', 'true');
        }
    }, [isOpen]);

    if (!mounted) {
        return null;
    }

    return (
        <>
            <Modal backdrop={"blur"} isOpen={isOpen} onOpenChange={onOpenChange} size="4xl" hideCloseButton={true}>
                <ModalContent className="p-2 lg:p-4 bg-[#1A3B7E] rounded-4 w-[850px] h-[515px] bg-[url('/img/gala-bg.svg')] bg-cover bg-center">
                    {(onClose) => (
                        <>
                            <ModalBody className="flex flex-row">
                                <div className="flex flex-col items-start justify-center gap-[32px]">
                                    <div className="flex flex-col gap-[64px]">
                                        <div className="flex flex-col">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="166" height="18" viewBox="0 0 166 18" fill="none">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M19.704 0.375488H11.0684V17.8565H19.704V0.375488Z" fill="#DB1D31" />
                                                <path fillRule="evenodd" clipRule="evenodd" d="M8.78855 0.375488H0V17.8565H8.78855V0.375488ZM30.7752 0.375488H21.9867V17.8565H30.7752V0.375488Z" fill="white" />
                                                <path d="M46.5209 7.68537H56.1596V9.41505C56.1596 11.9283 55.2789 13.9714 53.5175 15.5387C51.75 17.0836 49.481 17.856 46.686 17.856C43.7321 17.856 41.2734 16.9997 39.3163 15.2924C37.4082 13.5796 36.4541 11.4749 36.4541 8.96162C36.4541 6.44833 37.4082 4.34361 39.3163 2.59718C41.2245 0.867554 43.5975 0 46.4169 0C48.1844 0 49.8174 0.363805 51.3035 1.08588C52.7713 1.78557 53.9456 2.73161 54.7957 3.94627L50.6552 6.07335C50.2699 5.53039 49.7011 5.10495 48.955 4.78029C48.2089 4.44444 47.3832 4.28764 46.4781 4.28764C44.9674 4.28764 43.732 4.7243 42.7657 5.60311C41.7994 6.49871 41.3101 7.62943 41.3101 8.98403C41.3101 10.3386 41.7872 11.4357 42.729 12.3313C43.6953 13.2493 45.047 13.7083 46.7655 13.7083C48.9917 13.7083 50.4534 12.9582 51.1629 11.4581H46.5209V7.69097V7.68537ZM75.4797 17.4922H70.2078L69.3944 15.0182H63.0277L62.2143 17.4922H56.9179L63.2295 0.374989H69.1742L75.4858 17.4922H75.4797ZM66.1896 5.43516L64.2815 11.2566H68.1345L66.1896 5.43516ZM82.6475 0.374989V13.2661H89.2344V17.4922H77.7671V0.374989H82.6414H82.6475ZM109.288 17.4922H104.016L103.203 15.0182H96.8364L96.023 17.4922H90.7267L97.0382 0.374989H102.983L109.295 17.4922H109.288ZM99.9983 5.43516L98.0902 11.2566H101.943L99.9983 5.43516ZM126.003 0.374989H130.737V17.4922H126.003V8.26753L121.477 15.1413H121L116.499 8.28994V17.4922H111.729V0.374989H116.499L121.233 7.68537L126.003 0.374989ZM151.653 17.4922H146.394L145.568 15.0182H139.214L138.4 17.4922H133.104L139.403 0.374989H145.36L151.659 17.4922H151.653ZM142.375 5.43516L140.467 11.2566H144.32L142.375 5.43516ZM151.372 0.374989H165.701V4.60114H160.974V17.4922H156.093V4.60114H151.366V0.374989H151.372Z" fill="white" />
                                            </svg>
                                        </div>
                                        <div className="flex flex-col items-start gap-[32px]">
                                            <h1 className="text-[#FFF] [font-size:_clamp(24px,7vw,63px)] not-italic font-medium leading-[57px] max-w-[291px]">{t("challenge_the_fortune")}</h1>
                                            <p className="text-[#FFF] [font-size:_clamp(16px,5vw,24px)] font-medium leading-[31px] max-w-[256px]">{t("challenge_the_fortune_description")}</p>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-[215px] h-[61px] rounded-[70px] bg-[#DB1D31] text-[#FFF] text-[16px] font-medium leading-[20px]"
                                        onPress={() => {
                                            onClose();
                                            router.push('/gala-bonus');
                                        }}
                                    >
                                        {t("challenge_the_fortune_modal_button")}
                                    </Button>
                                </div>
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
