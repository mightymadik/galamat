"use server";

import moment from "moment";
import prisma from "@/lib/prisma";

export async function ActionUpdateCode(id: number) {
  try {
    const changeStatus = await prisma.lottery.update({
      where: {
        id,
      },
      data: {
        status: "no-verified",
        timeout: moment().format(),
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
