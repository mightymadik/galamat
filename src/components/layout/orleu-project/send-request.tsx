"use client";

import React, { useState } from "react";
import { isValidInternationalPhoneNumber } from "@/utils/consts";
import { addToast, Button } from "@heroui/react";
import { SendCallBack } from "@/utils/api";
import Image from "next/image";
import clsx from "clsx";

interface IThisProps {
  className?: string;
}

function SendRequest({ className }: IThisProps) {
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

  return (
    <div className={clsx("leave-request-wrap", className)}>
      <img src="/img/title-style.svg" alt="" />
      {sendStatus ? (
        <div className="w-full flex-jc-c flex-col gap-4">
          <Image
            src="/img/icons/checked.svg"
            alt="check icon"
            width="178"
            height="103"
            style={{ filter: "brightness(10.5)" }}
          />
          <h4 className="text-white text-[28.74px] font-medium tracking-[-0.862px] text-center">
            Мы уже получили вашу заявку и скоро свяжемся!
          </h4>
        </div>
      ) : (
        <form action="#" onSubmit={startCallBack}>
          <h3>Оставьте заявку</h3>
          <p>
            Укажите номер телефона, чтобы мы могли перезвонить и
            проконсультировать вас.
          </p>
          <input type="text" name="name" placeholder="Ваше имя" />
          <input type="tel" name="phone" placeholder="Номер телефона" />
          <Button type="submit" className="send" isLoading={loading}>
            Отправить
          </Button>
        </form>
      )}
    </div>
  );
}

export default SendRequest;
