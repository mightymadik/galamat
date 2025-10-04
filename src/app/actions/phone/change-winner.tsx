"use server";

import prisma from "@/lib/prisma";

export async function ActionUpdateWinner(id: number, winner: number) {
  try {
    const changeWinner = await prisma.lottery.update({
      where: {
        id,
      },
      data: {
        winner,
        status: "played",
      },
    });

    return {
      status: "ok",
      data: changeWinner,
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
