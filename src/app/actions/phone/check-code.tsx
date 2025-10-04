"use server";

import prisma from "@/lib/prisma";

export async function ActionCheckCode(number: string, code: number) {
  try {
    const checkNumber = await prisma.lottery.findFirst({
      where: {
        phone: number,
        verification_code: code,
      },
    });

    if (!checkNumber) {
      return {
        status: "error",
        data: checkNumber,
        error: "Invalid code or phone",
      };
    }

    const changeStatus = await prisma.lottery.update({
      where: {
        id: checkNumber.id,
      },
      data: {
        status: "verified",
      },
    });

    return {
      status: "ok",
      data: changeStatus,
      error: "",
    };
  } catch (error: any) {
    return {
      status: "error",
      data: [],
      error: error?.response?.data || error.message,
    };
  }
}
