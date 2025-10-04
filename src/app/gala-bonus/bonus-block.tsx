import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { addToast, Button } from "@heroui/react";
import { formatKzt, getDevicePlatform } from "@/utils/helpers";
import { ActionUpdateWinner } from "@/app/actions/phone/change-winner";
import { ActionGetProbabilities } from "@/app/actions/lottery/get-probabilities";
import { Spinner } from "@heroui/react";
import { Fade } from "react-awesome-reveal";
import { Modal, ModalBody, ModalContent } from "@heroui/react";
import { useTranslate } from "@/hooks/useTranslate";
import { ActionUpdateStatus } from "@/app/actions/lottery/update-status";
import { ActionSendNumberBitrix } from "@/app/actions/lottery/send-number-bitrix";
import { ActionSendNumberGoogle } from "@/app/actions/lottery/send-price-google";
import { ActionUpdatePromocode } from "@/app/actions/lottery/update-promocode";

interface IWinerItem {
  price: number;
  probability: number;
  rotate: number;
}

interface IThisProps {
  data: IDataSendMessage | null;
}

function BonusBlock({ data }: IThisProps) {
  const $t = useTranslate();
  const [prices, setPrices] = useState<IProbabilities[]>([]);

  useEffect(() => {
    ActionGetProbabilities().then((probabilities) => {
      setPrices(probabilities.data);
    });
  }, []);

  const probability = prices.flatMap((price) =>
    Array.from({ length: price.probability }, () => price.probability),
  );

  const audio = new Audio("/audio/chick.mp3");
  function pickRandom(array: number[]) {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  const rotateBlock = useRef<HTMLDivElement>(null);
  let successPlay = true;

  function findWinner() {
    const winnerCount = pickRandom(probability);
    const winner = prices.find((_p) => _p.probability === winnerCount);

    if (winner) {
      PrintRotateCalc(winner);
    }
  }

  const [winner, setWinner] = useState<IWinerItem | null>(null);

  useEffect(() => {
    if (winner && data) {
      ActionUpdateWinner(data.data.id, winner.price).then((winner) => {
        console.log("winner updated", winner);
      });
    }
  }, [winner]);

  function PrintRotateCalc(winner: IWinerItem) {
    if (rotateBlock && rotateBlock.current) {
      if (successPlay) {
        const emptyLoading =
          (Math.floor(Math.random() * (25 - 10 + 1)) + 10) * 360;

        const winnerCount = emptyLoading + winner.rotate;

        rotateBlock.current.style.transition =
          "18s cubic-bezier(0.0, 0.0, 0.1, 1)";
        rotateBlock.current.style.transform = `rotate(${-winnerCount}deg)`;

        audio.currentTime = 0;
        audio.play();

        successPlay = false;

        setTimeout(() => {
          audio.pause();
          setTimeout(() => {
            setWinner(winner);
          }, 2000);
        }, 1000 * 18);
      }
    }
  }

  const [userBonusLink, setUserBonusLink] = useState("");

  const [modalFindLink, setModalFindLink] = useState<boolean>(false);

  function fintWallet() {
    if (data) {
      setModalFindLink(true);

      ActionSendNumberBitrix(data.data.id).then((res) => {
        ActionUpdatePromocode(data.data.id, res.promocode).then(() => {
          console.log("promocode updates");
        });

        ActionSendNumberGoogle(data.data.id).then((res) => {
          const platform = getDevicePlatform();

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
        });
      });
    } else {
      addToast({
        title: "Произошла ошибка, пожалуйста, обновите страницу.",
        color: "danger",
      });
    }
  }

  console.log(userBonusLink);

  const [loading, setLoading] = useState(false);

  function ChangeStatus() {
    if (data) {
      setLoading(true);

      ActionUpdateStatus(data?.data.id, "winnings-taken")
        .then(() => {
          window.location.href = userBonusLink;
        })
        .finally(() => setLoading(false));
    }
  }

  return (
    <>
      <div className="bonus-wrap py-10 sm:!py-20 relative">
        <div
          className={clsx("wrapper relative z-[1] visible", {
            "!invisible": winner,
          })}
        >
          <div className="bonus-info">
            <div
              className={clsx("texts transform transition duration-[1s]", {
                "scale-0": winner,
              })}
            >
              <Fade direction="left" triggerOnce delay={1000}>
                <h1>{$t("try_your_luck")}</h1>
              </Fade>
              <Fade direction="left" triggerOnce delay={1200}>
                <p>{$t("get_up_to")}</p>
              </Fade>
              <Fade direction="left" triggerOnce delay={1400}>
                <Button className="red-btn" onPress={findWinner}>
                  {$t("get__")}
                </Button>
              </Fade>
            </div>
            <div className="bonus md:ml-20">
              {prices.length ? (
                <div
                  className={clsx(
                    "min-w-[650px] w-[650px] min-h-[650px] h-[650px] relative transform transition duration-[1s] gala-bonus-fortuna z-[-10] pointer-events-none",
                    {
                      "!scale-0": winner,
                    },
                  )}
                >
                  <img
                    src="/img/playgon-gal-bonus.svg"
                    alt="playgon-gal-bonus"
                    className="absolute left-[50%] top-[29px] transform translate-x-[-50%] z-10 w-[40px]"
                  />
                  <div className="w-full h-full transform rotate-[-21deg]">
                    <div ref={rotateBlock} className="w-full h-full transition">
                      <div className="w-full h-full bg-[#3579E0] flex-jc-c rounded-full transform relative overflow-hidden">
                        <div className="w-1/2 h-1/2 absolute top-0 right-0 playgon-top-right bg-blue flex-jc-c" />
                        <div className="w-1/2 h-1/2 absolute bottom-0 right-0 playgon-bottom-right bg-blue" />
                        <div className="w-1/2 h-1/2 absolute bottom-0 left-0 playgon-bottom-left bg-blue" />
                        <div className="w-1/2 h-1/2 absolute top-0 left-0 playgon-top-left bg-blue" />
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={`solid-${i}`}
                            className="w-[98%] h-[3px] bg-white transform absolute left-[50%] top-[50%]"
                            style={{
                              transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="w-full h-full flex-jc-c border-[28px] border-[#21468B] rounded-full overflow-hidden absolute top-0 left-0 shadow-bonus">
                        <div className="play-btn cursor-pointer z-10 transition-[0.2s] transform active:scale-[0.96]" />
                      </div>

                      {prices.map((price, i) => (
                        <div
                          key={`price-${i}`}
                          className="absolute left-0 top-[50%] text-white text-[35px] font-bold w-full "
                          style={{
                            transform: `translateY(-50%) rotate(${i * 45 + 111}deg)`,
                          }}
                        >
                          <span className="transform rotate-180 inline-block w-[250px]">
                            {formatKzt(price.price).replace(/ /, ".")}
                          </span>

                          <span className="w-6 h-6 bg-[#FFAB36] shadow-yellow rounded-full absolute right-[2px] top-[50%] transform translate-y-[-50%]"></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex-jc-c">
                  <Spinner color="white" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={clsx(
            "w-full h-full absolute left-0 top-0 overflow-hidden flex-jc-c invisible",
            {
              "!visible": winner,
            },
          )}
        >
          <img
            src="/img/winner-right.svg"
            alt="winner-right.svg"
            className={clsx(
              "w-auto h-[500px] sm:h-full absolute right-0 top-0 transition duration-[1s] transform translate-x-[100%]",
              {
                "translate-x-[40%] sm:!translate-x-[0]": winner,
              },
            )}
          />
          <img
            src="/img/winner-left.svg"
            alt="winner-left.svg"
            className={clsx(
              "w-auto h-[500px] sm:h-full  absolute left-0 top-0 transition duration-[1s] transform translate-x-[-100%]",
              {
                "translate-x-[-40%] sm:!translate-x-[0]": winner,
              },
            )}
          />

          <div
            className={clsx(
              "flex-jc-c flex-col transform transition duration-[1s] scale-0 mt-[-200px] sm:mt-0",
              {
                "scale-50 sm:scale-100": winner,
              },
            )}
          >
            <h3 className="text-[45px] text-white mb-4 text-center sm:text-left">
              Поздравляем! вы получили
            </h3>
            {winner ? (
              <h1 className="text-[154.75px] text-white font-bold mb-4">
                {formatKzt(winner?.price)
                  .replace(/ тг./g, "")
                  .replace(/ /g, ".")}
              </h1>
            ) : null}

            <h3 className="text-[45px] text-white relative top-[-40px] sm:top-0 sm:mb-4">
              Gala Bonus-ов
            </h3>
            <Button
              className="bg-[#DB1D31] text-white rounded-[30px] transform scale-[1.8] sm:scale-100"
              onPress={fintWallet}
            >
              {$t("claim_bonuses")}
            </Button>
          </div>
        </div>
      </div>

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
                  isLoading={loading}
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
    </>
  );
}

export default BonusBlock;
