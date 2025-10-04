import "./whatsapp.scss";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";

function Whatsapp() {
  const [topStatus, setTopStatus] = useState<boolean>(false);

  useEffect(() => {
    window.addEventListener("scroll", function () {
      const top = window.scrollY;

      if (top > 300) {
        setTopStatus(true);
      } else {
        setTopStatus(false);
      }
    });

    return () => window.addEventListener("scroll", function () {});
  }, []);

  function WindowGoTuTop() {
    window.scrollTo(0, 0);
  }

  return (
    <>
      <div
        className={clsx(
          "w-12 h-12 rounded-full bg-blue flex-jc-c fixed bottom-12 transition-all text-white cursor-pointer hover:bg-blue/90 hidden sm:flex",
          {
            "right-[-150px]": !topStatus,
            "right-5": topStatus,
          },
        )}
        onClick={WindowGoTuTop}
      >
        <i className="fa-solid fa-chevron-up"></i>
      </div>

      <div
        className={clsx(
          "rs-video whatsapp-fixed transition-all  hidden sm:block",
          {
            "!right-[90px]": topStatus,
          },
        )}
      >
        <div className="animate-border">
          <Link
            className="video-vemo-icon btn-whatsapp"
            aria-label="WhatsApp"
            href="https://wa.me/+77001085757"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fa-brands fa-whatsapp"></i>
            <div className="sm-red-dot"></div>
          </Link>
        </div>
        <div id="hover-message" className="quick-message">
          <p>Свяжитесь с нами через Whatsapp</p>
          <div className="seta-direita"></div>
        </div>
      </div>
    </>
  );
}

export default Whatsapp;
