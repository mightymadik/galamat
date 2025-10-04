import "@/components/common/leave-request/leave-request.scss";

import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
} from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setModalSendRequest } from "@/redux/modals";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";
import { useTranslate } from "@/hooks/useTranslate";
import { isValidInternationalPhoneNumber } from "@/utils/consts";
import { SendCallBack } from "@/utils/api";
import IMask from "imask";

function ModalSendRequest() {
  const $t = useTranslate();
  const dispatch = useDispatch();
  const getModal = useSelector(
    (state: IModalState) => state.modals.modalSendRequest,
  );

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
      SendCallBack(phone, name, "").then(() => {
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
  }, [getModal]);

  return (
    <Modal
      isOpen={getModal}
      size="5xl"
      onOpenChange={() => dispatch(setModalSendRequest(false))}
    >
      <ModalContent className="bg-blue bottom-scroll-hidden">
        <ModalBody className="p-0 min-h-[500px] bottom-scroll-hidden">
          <div id="leave-request" className="leave-request !h-full relative">
            <div className="wrapper !px-0 !h-[500px]">
              <div className="leave-request-info !h-full">
                <Fade direction="left" className="md:w-[55%]" triggerOnce>
                  <div className="info !pl-6 sm:!pl-10 !pt-8 sm:!pt-12 !h-full !flex-js-s">
                    <div className="texts">
                      <h2>{$t("leave_a_request")}</h2>
                      <span className="w-full max-w-[310px] block">
                        {$t("we_are_building _the_future")}
                      </span>
                    </div>
                    <div className="img-wrap">
                      <Image
                        src="/img/leav-request.png"
                        alt="def image"
                        width={130}
                        height={130}
                      />
                    </div>
                  </div>
                </Fade>
                <Fade direction="right" className="md:w-[45%]" triggerOnce>
                  <div className="leave-request-form flex-jc-c !rounded-none h-full">
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
                          className="blue-btn send-btn h-12 w-full"
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
              className="absolute top-2 right-4 w-8 h-8 bg-white md:bg-blue/50 transition hover:bg-blue text-blue md:text-white rounded-full"
              onClick={() => dispatch(setModalSendRequest(false))}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ModalSendRequest;
