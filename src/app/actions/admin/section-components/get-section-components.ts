"use server";

import prisma from "@/lib/prisma";

export async function ActionGetPageSection(key: string) {
  try {
    const result = await prisma.pages_sections.findFirst({
      where: {
        key,
      },
    });

    return {
      status: 1,
      data: result?.body_json,
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
