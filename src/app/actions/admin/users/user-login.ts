"use server";
import bcrypt from "bcrypt";

import { encryptData } from "@/utils/helpers";
import prisma from "@/lib/prisma";

export async function UserLogin(login: string, password: string) {
  try {
    const getUser = await prisma.users.findFirst({
      where: {
        login,
      },
    });

    if (!getUser) {
      return {
        status: 0,
        message: "Пользователя с указанными данными не существует.",
      };
    }

    const passwordMatch = await bcrypt.compare(password, getUser.password);
    if (!passwordMatch) {
      return { status: 0, message: "Неверное имя пользователя или пароль." };
    }

    const getToken = encryptData(JSON.stringify(getUser), "բանալին");

    const user: any = { ...getUser };
    delete user.password;

    return {
      status: 1,
      data: {
        token: getToken,
        user,
      },
    };
  } catch (error) {
    return {
      status: 0,
      data: {},
      error,
    };
  }
}
