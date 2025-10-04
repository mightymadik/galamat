"use client";

import "./header.scss";
import Link from "next/link";
import { localStorageKeys, SITE_URL } from "@/utils/consts";
import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Button,
  Select,
  SelectItem,
  SharedSelection,
  Skeleton,
} from "@heroui/react";
import Image from "next/image";
import { GetLanguage } from "@/app/actions/admin/language/get-languages";
import { useDispatch, useSelector } from "react-redux";
import { setLang } from "@/redux/translate";
import { useTranslate } from "@/hooks/useTranslate";
import { setModalSendRequest } from "@/redux/modals";

interface IThisProps {
  info: boolean;
}

function Header({ info = true }: IThisProps) {
  const dispatch = useDispatch();
  const $t = useTranslate();

  const activeLang = useSelector(
    (state: IStateTranslate) => state.translateSite.selectedLang,
  );

  function openModalSendRequest() {
    dispatch(setModalSendRequest(true));
  }

  const menuItems = [
    {
      name: $t("real_estate"),
      url: SITE_URL.REAL_ESTATE,
    },
    {
      name: $t("projects"),
      url: SITE_URL.PROJECTS,
    },
    {
      name: $t("bid"),
      url: "#",
      onClick: openModalSendRequest,
    },
    {
      name: $t("about_company"),
      url: SITE_URL.OUR_COMPANY,
    },
    {
      name: $t("stock"),
      url: SITE_URL.SALES,
    },
    // {
    //   name: $t("methods_purchase"),
    //   url: SITE_URL.METHODS_PURCHASE,
    // },
    // {
    //   name: $t("calculator"),
    //   url: SITE_URL.CALCULATOR,
    // },
  ];

  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState<boolean>(false);
  const [languages, setLanguages] = useState<ILanguage[]>([]);

  useEffect(() => {
    GetLanguage("parents").then((res) => {
      setLanguages(res.data);
    });
  }, []);

  useEffect(() => {
    const overflowValue = mobileMenu ? "hidden" : "auto";
    document.body.style.overflow = overflowValue;
    document.documentElement.style.overflow = overflowValue;
  }, [mobileMenu]);

  function selectLanguage(keys: SharedSelection) {
    const getKey = keys.currentKey;

    if (getKey) {
      localStorage.setItem(localStorageKeys.languages, getKey);

      dispatch(setLang(getKey));
    }
  }

  function selectLanguageMobile(key: string | null) {
    if (key) {
      localStorage.setItem(localStorageKeys.languages, key);

      dispatch(setLang(key));
    }
  }

  const lastScrollY = useRef(0);
  const getBottomLine = useRef<HTMLDivElement>(null);
  const [menuBottomLineFix, setMenuBottomLineFix] = useState<number>(0);

  const [isStickyVisible, setIsStickyVisible] = useState<boolean>(true);

  useLayoutEffect(() => {
    if (getBottomLine && getBottomLine.current) {
      const getParams = getBottomLine.current.getBoundingClientRect();

      window.addEventListener("scroll", function () {
        const scrollTop = window.scrollY;

        if (scrollTop > getParams.top) {
          setMenuBottomLineFix(getParams.height);
        } else {
          setMenuBottomLineFix(0);
        }

        if (scrollTop > 500 && scrollTop > lastScrollY.current) {
          setIsStickyVisible(false);
        } else if (scrollTop < lastScrollY.current) {
          setIsStickyVisible(true);
        }

        lastScrollY.current = scrollTop;
      });
    }
  }, [getBottomLine]);

  return (
    <header className="header">
      <div className="w-full h-[50px] block md:hidden"></div>
      <div
        className={clsx(
          "wrapper max-[767px]:fixed top-0 bg-white transition-all duration-[0.5s]",
          {
            "top-[-100px]": !isStickyVisible,
          },
        )}
      >
        {info ? (
          <div className="top-line">
            <Link href={SITE_URL.HOME} className="logo">
              <Image
                src="/img/logo.svg"
                alt="logo navbar"
                width={162}
                height={20}
              />
            </Link>
            <div className="social-icons">
              {languages.length ? (
                <div className="min-[576px]:hidden flex-jsb-c border border-blue rounded-[2px] overflow-hidden">
                  {languages.map((lang) => (
                    <span
                      key={`mobile-lang-${lang.key}`}
                      className={clsx(
                        "px-2 h-6 flex-jc-c text-[12px] text-[#353535] rounded-[1px]",
                        {
                          "bg-blue text-white": activeLang === lang.key,
                        },
                      )}
                      onClick={() => selectLanguageMobile(lang.key)}
                    >
                      {lang.name}
                    </span>
                  ))}
                </div>
              ) : (
                <Skeleton className="w-[50px] h-6 rounded-[2px]" />
              )}

              <Link
                href="https://wa.me/+77001085757"
                target="_blank"
                className="max-[576px]:!hidden"
              >
                <Image
                  src="/img/wp-icon.svg"
                  alt="icon soc sites"
                  width={18}
                  height={18}
                  className="h-auto"
                />
              </Link>
              {/*<Link href="tel: +7 700 108 5757" target="_blank">*/}
              {/*  <Image*/}
              {/*    src="/img/tg-icon.svg"*/}
              {/*    alt="icon soc sites"*/}
              {/*    width={18}*/}
              {/*    height={18}*/}
              {/*    className="h-auto"*/}
              {/*  />*/}
              {/*</Link>*/}
              <Link
                href="tel: +7 700 108 5757"
                target="_blank"
                className="max-[576px]:!hidden"
              >
                <Image
                  src="/img/phone-icon.svg"
                  alt="icon soc sites"
                  width={18}
                  height={18}
                  className="h-auto"
                />
              </Link>
            </div>
            <Button
              onPress={openModalSendRequest}
              className="border-btn bg-white order-call !h-[40px] flex-jc-c"
            >
              {$t("request_call")}
            </Button>
            <Select
              selectedKeys={[`${activeLang}`]}
              className="w-[80px] rounded-[8px] outline outline-[1px] outline-[#b2b2b2] hidden md:!block"
              classNames={{
                trigger: "bg-white rounded-[8px]",
              }}
              onSelectionChange={selectLanguage}
            >
              {languages.map((lang) => (
                <SelectItem key={lang.key}>{lang.name}</SelectItem>
              ))}
            </Select>

            <div
              className={clsx("drop-menu max-[576px]:!hidden", {
                "is-active": mobileMenu,
              })}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <span className="line"></span>
              <span className="line"></span>
              <span className="line"></span>
            </div>
            <div
              className={clsx("menu-wrap", {
                open: mobileMenu,
              })}
            >
              <ul className="main-menu">
                {menuItems.map((menuItem, i) => (
                  <li key={`desktop-menu-${i}`}>
                    <Link
                      href={menuItem.url}
                      className={clsx({
                        "!opacity-70": menuItem.url === pathname,
                      })}
                      onClick={menuItem.onClick}
                    >
                      {menuItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="btns !flex-jsb-c gap-4">
                <button
                  onClick={openModalSendRequest}
                  className="border-btn btn-white border-none order-call !m-0"
                >
                  {$t("request_call")}
                </button>
                <Select
                  selectedKeys={[`${activeLang}`]}
                  className="w-[80px] rounded-[4px] outline-[#b2b2b2]"
                  radius="sm"
                  onSelectionChange={selectLanguage}
                >
                  {languages.map((lang) => (
                    <SelectItem key={lang.key}>{lang.name}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div
        ref={getBottomLine}
        className={clsx(
          "w-full flex-jsc-c bg-white transition-all duration-[0.5s]",
          {
            "fixed top-0 shadow": !!menuBottomLineFix,
            "top-[-100px]": !isStickyVisible,
          },
        )}
      >
        <div className="wrapper">
          <div className="bottom-line">
            <Link href={SITE_URL.HOME} className="logo">
              <Image
                src="/img/logo.svg"
                alt="logo navbar"
                width={162}
                height={20}
              />
            </Link>
            <ul className="main-menu">
              {menuItems.map((menuItem, i) => (
                <li
                  key={`desktop-menu-${i}`}
                  className={clsx({
                    active: menuItem.url === pathname,
                  })}
                  onClick={menuItem.onClick}
                >
                  <Link href={menuItem.url}>{menuItem.name}</Link>
                </li>
              ))}
            </ul>
            {/*<a href="#" className="login">*/}
            {/*  <img src="img/login-icon.svg" alt="" />*/}
            {/*  Войти*/}
            {/*</a>*/}
          </div>
        </div>
      </div>
      {menuBottomLineFix ? (
        <div className="w-full" style={{ height: menuBottomLineFix }} />
      ) : null}
    </header>
  );
}

export default Header;
