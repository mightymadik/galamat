"use server";

import prisma from "@/lib/prisma";

export async function GetLanguage(parent_id: string) {
  try {
    const result = await prisma.languages.findMany({
      where: {
        parent_id,
      },
    });

    return {
      status: 1,
      data: result || [],
      error: "",
    };
  } catch (error) {
    return {
      status: 0,
      data: [],
      error,
    };
  }
}
