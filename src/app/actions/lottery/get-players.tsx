"use server";

import prisma from "@/lib/prisma";

export async function ActionGetPlayers() {
  try {
    const checkNumber = await prisma.lottery.findMany();

    return {
      status: "ok",
      data: checkNumber,
      error: "",
    };
  } catch (error: any) {
    return {
      status: "error",
      data: [],
      error,
    };
  }
}
