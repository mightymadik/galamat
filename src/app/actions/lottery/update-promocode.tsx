"use server";

import prisma from "@/lib/prisma";

export async function ActionUpdatePromocode(id: number, value: string) {
  try {
    const updateProbabilities = await prisma.lottery.update({
      where: {
        id,
      },
      data: {
        promocode: value,
      },
    });

    return {
      status: "ok",
      data: updateProbabilities,
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
