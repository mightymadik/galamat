"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@heroui/react";
import { Button } from "@heroui/react";
import { UserLogin } from "@/app/actions/admin/users/user-login";
import { localStorageKeys, SITE_URL } from "@/utils/consts";
import { useRouter } from "next/navigation";
import { CheckSecurity } from "@/app/actions/admin/users/check-security";

function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [successLogin, setSuccessLogin] = useState(false);

  useEffect(() => {
    const getToken = localStorage.getItem(localStorageKeys.tokenAdmin);

    if (getToken) {
      router.push(`/${SITE_URL.ADMIN}`);
    }

    const getPass = prompt("Ваше имя");

    CheckSecurity(getPass).then(({ status }) => {
      if (status) {
        setSuccessLogin(true);
      } else {
        router.push(`/${SITE_URL.HOME}`);
      }
    });
  }, []);

  function handleSubmit(e: any) {
    e.preventDefault();

    const login = e.target.login.value;
    const password = e.target.password.value;

    if (login && password) {
      setLoading(true);
      UserLogin(login, password)
        .then((res) => {
          const { data, status } = res;
          if (status) {
            localStorage.setItem(
              localStorageKeys.tokenAdmin,
              data?.token || "",
            );
            localStorage.setItem(
              localStorageKeys.userAdmin,
              JSON.stringify(data?.user),
            );
            router.push(`/${SITE_URL.ADMIN}`);
          }
        })
        .finally(() => setLoading(false));
    }
  }

  return (
    <>
      {successLogin ? (
        <div className="flex items-center justify-center min-h-screen from-purple-900 via-indigo-800 to-indigo-500 bg-gradient-to-br">
          <div className="w-full max-w-lg px-10 py-8 mx-auto bg-white border rounded-lg shadow-2xl">
            <form
              onSubmit={handleSubmit}
              action="#"
              className="max-w-md mx-auto space-y-3"
            >
              <h3 className="text-lg font-semibold mb-4">
                &#128540; Welcome GALMAT
              </h3>
              <div>
                <Input
                  className="w-full"
                  label="Имя пользователя"
                  type="text"
                  variant="bordered"
                  name="login"
                  required
                />
              </div>
              <div>
                <Input
                  className="w-full"
                  label="Пароль"
                  type="password"
                  variant="bordered"
                  name="password"
                  required
                />
              </div>
              <div className="flex gap-3 pt-3 items-center">
                <Button
                  type="submit"
                  variant="flat"
                  color="secondary"
                  isLoading={loading}
                >
                  Вход
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default Login;
