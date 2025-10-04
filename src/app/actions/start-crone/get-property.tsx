"use server";

import prisma from "@/lib/prisma";

export async function ActionGetProperty() {
  try {
    const checkNumber = await prisma.property.findMany();

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
