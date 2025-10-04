import Link from "next/link";
import { localStorageKeys, SITE_URL } from "@/utils/consts";
import { Button } from "@heroui/react";
import React, { useEffect, useState } from "react";
import clsx from "clsx";

function CookieComponent() {
  const [view, setView] = useState(false);

  useEffect(() => {
    const getCookie = localStorage.getItem(localStorageKeys.cookieComplete);

    if (!getCookie) {
      setView(true);
    }
  }, []);

  function CompleteCookie() {
    localStorage.setItem(localStorageKeys.cookieComplete, "1");
    setView(false);
  }

  return (
    <div
      className={clsx(
        "flex-jsb-c w-[calc(100%-20px)] max-w-[650px] bg-white gap-4 sm:gap-10 px-3 sm:px-6 py-4 rounded-[20px] sm:rounded-[30px] shadow-2xl fixed left-[50%] bottom-4 sm:bottom-10 transform translate-x-[-50%] z-[1000000] transition",
        {
          "opacity-0 invisible": !view,
          "opacity-100": view,
        },
      )}
    >
      <div>
        <p className="mb-[-5px] text-[14px] sm:text-[16px] leading-[15px] sm:leading-normal">
          Мы используем cookie, чтобы улучшать работу сайта.
        </p>
        <Link
          href={SITE_URL.COOKIE}
          target="_blank"
          className="text-[12px] sm:text-[14px] text-black/50"
        >
          Как это работает
        </Link>
      </div>

      <Button
        color="primary"
        variant="flat"
        className="rounded-[20px] hover:rounded-[10px] !transition-all"
        onPress={CompleteCookie}
      >
        Ок
      </Button>
    </div>
  );
}

export default CookieComponent;
