import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
} from "@heroui/react";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { isValidInternationalPhoneNumber } from "@/utils/consts";
import { SendCallBack } from "@/utils/api";
import { useDispatch, useSelector } from "react-redux";
import { setModalSendRequestGalaOne } from "@/redux/modals";
import IMask from "imask";

function ModalSendRequestPlan() {
  const dispatch = useDispatch();
  const modalSendRequest = useSelector(
    (state: IModalState) => state.modals.modalSendRequestGlaOne,
  );

  const $t = useTranslate();

  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState(false);

  function startCallBack(e: any) {
    e.preventDefault();
    const phone = e.target.phone.value;
    const name = e.target.name.value;

    if (isValidInternationalPhoneNumber(phone)) {
      if (!name) {
        addToast({
          title: "Поле «Имя» обязательно для заполнения.",
          color: "danger",
        });
        return;
      }

      setLoading(true);
      SendCallBack(phone, name, modalSendRequest || "").then(() => {
        setLoading(false);
        setSendStatus(true);
      });
    } else {
      addToast({
        title: "Пожалуйста, введите номер телефона правильно.",
        color: "danger",
      });
    }
  }

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }
    const mask = IMask(inputRef.current, {
      mask: "+7 (000) 000-00-00",
    });
    return () => mask.destroy();
  }, [modalSendRequest]);

  return (
    <Modal
      isOpen={!!modalSendRequest}
      size="5xl"
      onOpenChange={() => dispatch(setModalSendRequestGalaOne(null))}
    >
      <ModalContent className="bg-white bottom-scroll-hidden">
        <ModalBody className="p-0 max-[768px]:min-h-[600px] bottom-scroll-hidden">
          <div id="leave-request" className="leave-request !h-full relative">
            <div className="wrapper !px-0 !h-[500px]">
              <div className="leave-request-info !h-full !flex-jsb-s">
                <Fade
                  direction="left"
                  className="w-full md:w-[55%]"
                  triggerOnce
                >
                  <div className="info h-auto md:h-full !p-0 !rounded-none overflow-hidden  !bg-white w-full">
                    <Image
                      src="/img/gala-one/modal-send-request.png"
                      alt="def image"
                      width={600}
                      height={600}
                      className="w-full h-[250px] md:h-full object-cover !rounded-none"
                    />
                  </div>
                </Fade>
                <Fade direction="right" className="md:w-[45%]" triggerOnce>
                  <div className="leave-request-form flex-jc-c !rounded-none h-full !p-[24px] md:!p-[30px] !pt-0">
                    {sendStatus ? (
                      <div className="w-full h-full flex-jc-c flex-col gap-4">
                        <Image
                          src="/img/icons/checked.svg"
                          alt="check icon"
                          width="178"
                          height="103"
                          className="w-[140px] h-auto"
                        />
                        <h4 className="text-blue text-[28.74px] font-medium tracking-[-0.862px] text-center">
                          {$t("we_have_already_received")}
                        </h4>
                      </div>
                    ) : (
                      <form
                        action=""
                        onSubmit={startCallBack}
                        className="w-full"
                      >
                        <h1 className="text-[32px] lg:text-[54px] font-medium md:leading-[46px]">
                          Оставьте заявку
                        </h1>
                        <h3 className="text-[18px] lg:text-[27px] md:mt-4 mb-4">
                          Мы с вами свяжемся в скором времени
                        </h3>
                        <div className="mb-4">
                          <Input
                            label={$t("your_name")}
                            name="name"
                            type="text"
                            variant="bordered"
                            required
                            className="w-full"
                          />
                        </div>
                        <div className="mb-4">
                          <Input
                            ref={inputRef}
                            label={$t("phone_number")}
                            type="text"
                            name="phone"
                            variant="bordered"
                            required
                            className="w-full"
                          />
                        </div>
                        <Button
                          className="blue-btn send-btn !bg-[#7F0217] h-12 w-full !text-white"
                          type="submit"
                          isLoading={loading}
                        >
                          {$t("send")}
                        </Button>
                      </form>
                    )}
                  </div>
                </Fade>
              </div>
            </div>
            <button
              className="absolute top-2 right-4 w-8 h-8 bg-white md:bg-[#7F0217]/50 transition hover:bg-[#7F0217] text-[#7F0217] md:text-white rounded-full"
              onClick={() => dispatch(setModalSendRequestGalaOne(null))}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ModalSendRequestPlan;
