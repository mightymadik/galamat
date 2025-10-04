import { Button, Modal, ModalBody, ModalContent } from "@heroui/react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { SITE_URL } from "@/utils/consts";
import { usePathname } from "next/navigation";

const LS_KEY = "galaOneModalHideUntil";
const ONE_HOUR_MS = 60 * 60 * 1000;

function ModalGalaOne() {
  const pathname = usePathname();

  const [modal, setModal] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (pathname !== SITE_URL.SALES) {
      // run only on client
      const now = Date.now();
      let hideUntil = 0;

      const raw =
        typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (raw) {
        hideUntil = Number(raw) || 0;
      }

      const shouldSuppress = hideUntil && now < hideUntil;

      if (!shouldSuppress) {
        timerRef.current = window.setTimeout(() => setModal(true), 10 * 1000);
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, []);

  const handleGetClick = () => {
    localStorage.setItem(LS_KEY, String(Date.now() + ONE_HOUR_MS));
    setModal(false);
  };

  return (
    <Modal size="5xl" isOpen={modal} hideCloseButton>
      <ModalContent>
        <ModalBody className="p-0">
          <div className="bg-blue relative">
            <div className="min-h-[420px] min-[400px]:min-h-[480px]">
              <img
                src="/img/bg-modal-gal-bouns.webp"
                alt="bg modal-gal-bouns"
                className="w-full min-h-[420px] min-[400px]:min-h-[480px] object-cover object-[15%] min-[400px]:object-left"
              />
            </div>

            <div className="absolute top-0 left-0 pt-10 sm:pt-[57px] pl-6 min-[380px]:pl-10  sm:pl-[64px]">
              <img
                src="/img/galamata-white-logo.svg"
                alt="galamata-white-logo"
              />
              <h2 className="text-[45px] sm:text-[62px] text-white font-bold leading-[45px] sm:leading-[57px] tracking-[-1.884px] mt-10 sm:mt-[66px]">
                Испытай <br /> удачу
              </h2>
              <p className="text-[23px] text-white font-regular mt-5 w-full max-w-[350px]">
                Получи до 200 000 бонусов на покупку квартиры
              </p>

              <Link href={SITE_URL.SALES}>
                <Button
                  className="red-btn bg-[#DB1D31] mt-6 text-white rounded-full text-[20px] px-6"
                  onPress={handleGetClick}
                >
                  Получить
                </Button>
              </Link>
            </div>

            <i
              className="fa-regular fa-xmark absolute top-4 right-4 text-white cursor-pointer"
              onClick={() => {
                setModal(false);
                handleGetClick();
              }}
              aria-label="Close"
            />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ModalGalaOne;
