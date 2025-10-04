"use server";

import prisma from "@/lib/prisma";

export async function UpdateLanguage(id: number, value: string) {
  try {
    const result = await prisma.languages.update({
      where: {
        id,
      },
      data: {
        name: value,
      },
    });

    return {
      status: 1,
      data: result,
    };
  } catch (error) {
    return {
      status: 0,
      data: [],
      error,
    };
  }
}
