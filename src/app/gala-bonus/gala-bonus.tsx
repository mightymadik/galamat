"use client";

import MainTemplate from "@/components/common/main-template/main-template";
import "./gala-bonus.scss";
import React, { useEffect, useState } from "react";
import { addToast, Button, Checkbox, InputOtp, Tooltip } from "@heroui/react";
import { Modal, ModalBody, ModalContent } from "@heroui/react";
import BonusBlock from "@/app/gala-bonus/bonus-block";
import { InputMask } from "@react-input/mask";
import { ActionSendMessage } from "@/app/actions/phone/send-message";
import {
  getDevicePlatform,
  getRemainingDaysText90Days,
  normalizeKazakhstanPhoneNumber,
} from "@/utils/helpers";
import { ActionCheckCode } from "@/app/actions/phone/check-code";
import moment from "moment";
import { ActionUpdateCode } from "@/app/actions/phone/update-now";
import { Fade } from "react-awesome-reveal";
import HowPlaying from "@/app/gala-bonus/how-playing";
import { useTranslate } from "@/hooks/useTranslate";
import clsx from "clsx";
import { Spinner } from "@heroui/react";
import { ActionSendNumberBitrix } from "@/app/actions/lottery/send-number-bitrix";
import { ActionUpdateStatus } from "@/app/actions/lottery/update-status";
import BonusBlockCover from "@/app/gala-bonus/bonus-block-cover";
import { ActionUpdatePromocode } from "@/app/actions/lottery/update-promocode";
import { ActionSendNumberGoogle } from "@/app/actions/lottery/send-price-google";

type PlayerStatus = "phone-success" | "wait-day" | "start" | "winnings-taken";

function GalaBonus() {
  const $t = useTranslate();

  const [modalCheckPhone, setModalCheckPhone] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");

  const [openBlockCode, setOpenBlockCode] = useState(false);

  const [phoneSucceed, setPhoneSucceed] = useState<boolean>(false);

  const [startPlying, setStartPlying] = useState<PlayerStatus>("phone-success");

  const [loading, setLoading] = useState(false);

  const [sendData, setSendData] = useState<IDataSendMessage | null>(null);
  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    if (sendData) {
      if (
        sendData.data.status === "played" ||
        sendData.data.status === "winnings-taken"
      ) {
        setStartPlying("wait-day");
        setModalCheckPhone(false);
      } else if (sendData.data.status === "verified") {
        setStartPlying("start");
        setModalCheckPhone(false);

        addToast({
          title: `Вы еще не закончили, можете начать.`,
          color: "default",
        });
      } else if (sendData.data.status === "no-verified") {
        setOpenBlockCode(true);
      }
      if (
        sendData.status === "have-db" &&
        sendData.data.status !== "verified" &&
        sendData.data.status !== "played"
      ) {
        addToast({
          title: `Код уже отправлено ваше WhatsApp, ${moment(sendData.data.timeout).format("DD.MM.YYYY hh:mm")} проверьте пожалуйста`,
          color: "default",
        });
      }
    }
  }, [sendData]);

  const getFilteredNumber = normalizeKazakhstanPhoneNumber(phoneNumber);

  function sendCodeNumber(e: any) {
    e.preventDefault();

    if (!phoneNumber) {
      addToast({
        title: "Напишите, пожалуйста, ваш телефон",
        color: "warning",
      });
      return;
    }

    if (!name) {
      addToast({
        title: "Напишите, пожалуйста, ваш имя",
        color: "warning",
      });
      return;
    }

    setLoading(true);

    ActionSendMessage(getFilteredNumber, name)
      .then((result: any) => {
        const checkRemainingDays = getRemainingDaysText90Days(
          result.data.timeout,
        );

        if (checkRemainingDays > 0) {
          setSendData(result);
        } else {
          ActionUpdateCode(result.data.id).then((res: any) => {
            setSendData(res);
          });
        }
      })
      .finally(() => setLoading(false));
  }

  const [userBonusLink, setUserBonusLink] = useState("");
  const [modalFindLink, setModalFindLink] = useState<boolean>(false);

  const [loadingCheckCode, setLoadingCheckCode] = useState(false);

  function numberSucceed(e: any) {
    e.preventDefault();
    if (sendData) {
      if (codeInput) {
        addToast({
          title: "Подождите пожалуйста",
          color: "warning",
        });
        setLoadingCheckCode(true);
        ActionCheckCode(getFilteredNumber, +codeInput)
          .then((result: any) => {
            if (result.data) {
              setPhoneSucceed(true);

              setSendData(result);

              setTimeout(() => {
                setModalCheckPhone(false);
                setStartPlying("start");
              }, 3000);

              addToast({
                title: "Спасибо начинаем",
                color: "success",
              });
            } else {
              addToast({
                title: "Неверные код ",
                color: "danger",
              });
            }
          })
          .finally(() => setLoadingCheckCode(false));
      } else {
        addToast({
          title: "Неправильные код",
          color: "danger",
        });
      }
    }
  }

  function fintWallet() {
    if (sendData) {
      setModalFindLink(true);

      console.log("hasav");
      ActionSendNumberBitrix(sendData.data.id).then((res) => {
        console.log("mtav");
        ActionUpdatePromocode(sendData.data.id, res.promocode).then(() => {
          console.log("promocode updates");
        });

        ActionSendNumberGoogle(sendData.data.id)
          .then((res) => {
            const platform = getDevicePlatform();

            console.log(res);

            if (platform === "android") {
              setUserBonusLink(res.card_gpay_url);
            } else if (platform === "ios") {
              setUserBonusLink(res.card_url);
            } else if (platform === "windows") {
              setUserBonusLink(res.card_gpay_url);
            } else if (platform === "mac") {
              setUserBonusLink(res.card_url);
            } else {
              setUserBonusLink(res.card_gpay_url);
            }
          })
          .catch((err) => {
            console.log(err);
          });
      });
    } else {
      addToast({
        title: "Произошла ошибка, пожалуйста, обновите страницу.",
        color: "danger",
      });
    }
  }

  const [loadingFindBonus, setLoadingFindBonus] = useState(false);
  function ChangeStatus() {
    if (sendData) {
      setLoadingFindBonus(true);

      ActionUpdateStatus(sendData?.data.id, "winnings-taken")
        .then(() => {
          window.location.href = userBonusLink;
        })
        .finally(() => setLoadingFindBonus(false));
    }
  }

  const [isLoading, setIsLoading] = useState(false);

  return (
    <MainTemplate>
      <div className="w-full h-auto">
        <div
          className={clsx("bonus-wrap hidden", {
            "!block": startPlying === "phone-success",
          })}
        >
          <div className="wrapper">
            <div className="bonus-info">
              <div className="texts">
                <Fade direction="left" triggerOnce delay={500}>
                  <h1>Gala Bonus</h1>
                </Fade>
                <Fade direction="left" triggerOnce delay={700}>
                  <p>{$t("gala_description")}</p>
                </Fade>
                <Fade direction="left" triggerOnce delay={900}>
                  <Button
                    onPress={() => setModalCheckPhone(true)}
                    className="red-btn"
                  >
                    {$t("spin_the_wheel_of_fortune")}
                  </Button>
                </Fade>
              </div>
              <div className="bonus">
                <BonusBlockCover
                  idLoaded={(status: boolean) => setIsLoading(status)}
                />
                {/*<Fade direction="right" triggerOnce delay={500}>*/}
                {/*  <img src="/img/gala-bonus-role.svg" alt="" />*/}
                {/*</Fade>*/}
              </div>
            </div>
          </div>
        </div>

        <div
          className={clsx("hidden", {
            "!block": startPlying === "start",
          })}
        >
          <BonusBlock data={sendData} />
        </div>

        <div
          className={clsx("bonus-wrap hidden", {
            "!block": startPlying === "wait-day",
          })}
        >
          <div className="wrapper">
            <div className="bonus-info">
              <div className="texts">
                <h1>Gala Bonus</h1>
                <p>{$t("you_have_already_participated")}</p>
                {sendData ? (
                  <div>
                    <h3 className="text-[30px] text-white tracking-[-0.9px] flex-js-c gap-3">
                      <img
                        src="/img/icons/time-white.svg"
                        alt="time-white.svg"
                      />
                      {getRemainingDaysText90Days(sendData.data.timeout)}{" "}
                      {$t("days__")}
                    </h3>

                    {sendData.data.status === "played" ? (
                      <Tooltip content="Вы еще не получили бонусы">
                        <Button
                          onPress={fintWallet}
                          color="danger"
                          className="bg-[#CE2432] mt-4 rounded-full"
                        >
                          Получить бонусы
                        </Button>
                      </Tooltip>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="bonus">
                <img src="/img/gala-bonus-role.svg" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? <HowPlaying /> : null}

      <Modal
        isOpen={modalCheckPhone}
        onOpenChange={() => setModalCheckPhone(false)}
        classNames={{
          wrapper: "!z-[100000000]",
        }}
      >
        <ModalContent className="bg-blue">
          <ModalBody>
            {!phoneSucceed ? (
              <h2 className="text-center text-white text-[36px] md:text-[45px] font-medium mt-6 leading-[35px] md:leading-[40px]">
                {$t("please_complete_verification")}
              </h2>
            ) : null}

            {openBlockCode ? (
              <>
                {phoneSucceed ? (
                  <>
                    <h2 className="text-center text-white text-[30px] font-medium mt-4 md:mt-6 leading-[40px]">
                      {$t("verification_successfully_completed")}
                    </h2>

                    <div className="w-full flex-jc-c mt-[78px]">
                      <img
                        src="/img/icons/green-check.svg"
                        alt="green-check.svg"
                      />
                    </div>

                    <p className="text-center text-white text-[20px] mt-[50px] mb-6">
                      {$t("you_have_successfully_verified_your")}
                    </p>
                  </>
                ) : (
                  <form action="#" onSubmit={numberSucceed}>
                    <p className="text-center text-white text-[20px] mt-[50px]">
                      {$t("we_have_sent_you_a_code")}
                    </p>

                    <div className="w-full flex-jc-c overflow-hidden mt-6">
                      <InputOtp
                        length={4}
                        size="lg"
                        variant="bordered"
                        color="danger"
                        onValueChange={(e) => setCodeInput(e)}
                        classNames={{
                          wrapper: "flex-jc-c",
                          errorMessage: "text-center",
                          segment:
                            "w-16 h-16 border-[1px] text-white border-white text-[30px]",
                        }}
                      />
                    </div>

                    <Button
                      type="submit"
                      isLoading={loadingCheckCode}
                      className="w-full bg-[#2859AA] text-white mb-6 mt-4 rounded-[30px] text-[20px] h-[53px]"
                    >
                      {$t("confirm")}
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <form action="#" onSubmit={sendCodeNumber}>
                <p className="text-center text-white text-[20px] mt-[50px]">
                  {$t("enter_your_phone_number")}
                </p>

                <div className="w-full border-[2px] !border-[#2859AA] rounded-[30px] py-2 mt-[50px] mb-4">
                  <InputMask
                    mask="+7 (___) ___-__-__"
                    replacement={{ _: /\d/ }}
                    value={phoneNumber}
                    required
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-transparent text-white text-center text-[20px]"
                    placeholder={$t("enter_your_phone_number")}
                  />
                </div>
                <div className="w-full border-[2px] !border-[#2859AA] rounded-[30px] py-2 mb-4">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-white text-[20px] text-center"
                    placeholder={$t("enter_your_name")}
                  />
                </div>

                <Checkbox
                  isRequired
                  color="danger"
                  className="ml-4"
                  classNames={{
                    label: "text-white text-[#D9D9D9] text-[10.085px]",
                    wrapper: "w-5 h-5 rounded-[4px]",
                  }}
                >
                  {$t("consent_to_the_collection_and_processing")}
                </Checkbox>

                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full bg-[#2859AA] text-white mb-6 mt-4 rounded-[30px] text-[20px] h-[53px]"
                >
                  {$t("send")}
                </Button>
              </form>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={modalFindLink}
        onOpenChange={() => setModalFindLink(false)}
      >
        <ModalContent className="bg-blue">
          <ModalBody>
            {userBonusLink ? (
              <div className="w-full h-[200px] flex-jc-c flex-col">
                <h3 className="text-[25px] md:text-[30px] font-medium text-center text-white mb-6">
                  {$t("add_the_coupon")}
                </h3>

                <Button
                  className="red-btn bg-[#CE2432] rounded-full text-white"
                  onPress={ChangeStatus}
                  isLoading={loadingFindBonus}
                >
                  {$t("get__")}
                </Button>
              </div>
            ) : (
              <div className="w-full h-[150px] flex-jc-c">
                <Spinner color="white" />
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </MainTemplate>
  );
}

export default GalaBonus;
