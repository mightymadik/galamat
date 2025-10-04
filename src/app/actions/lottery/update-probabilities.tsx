"use server";

import prisma from "@/lib/prisma";

export async function ActionUpdateProbabilities(
  id: number,
  key: string,
  value: number,
) {
  try {
    const updateProbabilities = await prisma.probabilities.update({
      where: {
        id,
      },
      data: {
        [key]: value,
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
