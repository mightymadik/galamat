"use server";

import prisma from "@/lib/prisma";

export async function DeleteLanguage(id: string) {
  try {
    if (!id) {
      return {
        status: 0,
        data: [],
        error: "language not found",
      };
    }

    const getLanguage = await prisma.languages.findFirst({
      where: {
        key: id,
      },
    });

    if (getLanguage) {
      await prisma.languages.delete({
        where: {
          id: getLanguage.id,
        },
      });
    }

    await prisma.languages.deleteMany({
      where: {
        parent_id: id,
      },
    });

    return {
      status: 1,
      data: [],
    };
  } catch (error) {
    return {
      status: 0,
      data: [],
      error,
    };
  }
}
