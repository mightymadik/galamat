"use server";

import prisma from "@/lib/prisma";

export async function ActionGetProbabilities() {
  try {
    const checkNumber = await prisma.probabilities.findMany();

    return {
      status: "ok",
      data: checkNumber,
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
