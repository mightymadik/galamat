import "./leave-request.scss";
import { Input } from "@heroui/react";
import { addToast, Button } from "@heroui/react";
import { SendCallBack } from "@/utils/api";
import { useEffect, useRef, useState } from "react";
import { isValidInternationalPhoneNumber } from "@/utils/consts";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";
import { useTranslate } from "@/hooks/useTranslate";
import clsx from "clsx";
import IMask from "imask";

interface IThisProps {
  background?: string;
  bgColorBtn?: "red" | "blue";
}

function LeaveRequest({ background, bgColorBtn }: IThisProps) {
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
  }, []);

  return (
    <div id="leave-request" className="leave-request mt-12">
      <div className="wrapper">
        <div className="leave-request-info">
          <Fade direction="left" className="md:w-[55%] " triggerOnce>
            <div
              className="info !bg-no-repeat !bg-cover max-[540px]:h-[180px]"
              style={{
                ...(background && { backgroundImage: `url(${background})` }),
              }}
            >
              <div className="texts">
                <h2 className="max-[465px]:!mb-1">{$t("leave_a_request")}</h2>
                <span className="w-full max-w-[310px] block">
                  {$t("we_are_building _the_future")}
                </span>
              </div>
              {!background && (
                <div className="img-wrap">
                  <Image
                    src="/img/leav-request.png"
                    alt="def image"
                    width={130}
                    height={130}
                  />
                </div>
              )}
            </div>
          </Fade>
          <Fade direction="right" className="md:w-[45%]" triggerOnce>
            <div className="leave-request-form flex-jc-c h-full">
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
                <form action="" onSubmit={startCallBack} className="w-full">
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
                    className={clsx(
                      `blue-btn send-btn h-12 w-full !text-white`,
                      {
                        "!bg-[#7F0217]": bgColorBtn === "red",
                      },
                    )}
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
    </div>
  );
}

export default LeaveRequest;
