"use client";

import React, { useEffect, useState } from "react";
import {
  AppProvider,
  DashboardLayout,
  Navigation,
  PageContainer,
} from "@toolpad/core";
import { localStorageKeys, SITE_URL } from "@/utils/consts";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  HeroUIProvider,
  ToastProvider,
} from "@heroui/react";

const NAVIGATION: Navigation = [
  {
    segment: SITE_URL.ADMIN,
    title: "Главная",
    icon: <i className="fa-solid fa-house"></i>,
  },
  {
    segment: SITE_URL.ADMIN_TRANSLATE,
    title: "Перевод сайта",
    icon: <i className="fa-solid fa-language"></i>,
  },
  {
    segment: SITE_URL.ADMIN_USERS,
    title: "Пользователи",
    icon: <i className="fa-solid fa-user"></i>,
  },
  {
    segment: SITE_URL.ADMIN_PROJECTS,
    title: "Проекты",
    icon: <i className="fa-solid fa-rectangle-vertical-history"></i>,
  },
  {
    segment: SITE_URL.ADMIN_LOTTERY,
    title: "Лотерея",
    icon: <i className="fa-solid fa-dice"></i>,
  },
  {
    segment: SITE_URL.ADMIN_PAGES,
    title: "Страницы ",
    icon: <i className="fa-duotone fa-regular fa-list-dropdown"></i>,
    children: [
      {
        segment: SITE_URL.ADMIN_PAGES_HOME,
        title: "Главная",
        icon: "",
      },
      {
        segment: SITE_URL.ADMIN_PAGES_COMPANY,
        title: "О компании",
        icon: "",
      },
    ],
  },
];

function AdminMainTemplate({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const router = useRouter();

  function changeUrl(string: string | URL) {
    if (typeof string === "string") {
      router.push(string);
    }
  }

  const routerObj = {
    pathname,
    searchParams: new URLSearchParams(),
    navigate: (path: string | URL) => changeUrl(path),
  };

  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<IUser | null>(null);

  useEffect(() => {
    const getToken = localStorage.getItem(localStorageKeys.tokenAdmin);
    const getUser = localStorage.getItem(localStorageKeys.userAdmin);

    if (getToken && getUser) {
      setSuccess(true);
      setUser(JSON.parse(getUser));
    } else {
      router.push(`/${SITE_URL.ADMIN_LOGIN}`);
    }
  }, []);

  function LogOut() {
    localStorage.removeItem(localStorageKeys.tokenAdmin);
    localStorage.removeItem(localStorageKeys.userAdmin);
    setSuccess(false);
    setUser(null);
    router.push(`/${SITE_URL.ADMIN_LOGIN}`);
  }

  function ToolbarActionsSearch() {
    return (
      <div className="w-full py-4 px-4">
        <Dropdown>
          <DropdownTrigger>
            <Avatar name={user?.name} className="cursor-pointer " />
          </DropdownTrigger>
          <DropdownMenu aria-label="Static Actions">
            <DropdownItem
              key="delete"
              className="text-danger"
              color="danger"
              onPress={LogOut}
            >
              Выход
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    );
  }

  return (
    <>
      {success ? (
        <HeroUIProvider>
          <AppProvider
            navigation={NAVIGATION}
            router={routerObj}
            branding={{
              logo: "",
              title: "GALAMAT Admin",
              homeUrl: `/${SITE_URL.ADMIN}`,
            }}
          >
            <DashboardLayout
              slots={{
                toolbarAccount: ToolbarActionsSearch,
              }}
            >
              <PageContainer className="pt-6">
                <ToastProvider />

                {children}
              </PageContainer>
            </DashboardLayout>
          </AppProvider>
        </HeroUIProvider>
      ) : null}
    </>
  );
}

export default AdminMainTemplate;
