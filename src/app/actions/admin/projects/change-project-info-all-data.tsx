"use server";

import prisma from "@/lib/prisma";

export async function ActionUpdateProjectInfoAllData(id: number, data: object) {
  try {
    const result = await prisma.projects.update({
      where: {
        id,
      },
      data,
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
