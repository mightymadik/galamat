"use server";

import prisma from "@/lib/prisma";

export async function ActionUpdateProjectInfo(
  id: number,
  key: string,
  value: string | number | boolean,
) {
  try {
    const updateData: Record<string, any> = {
      [key]: value,
    };

    const result = await prisma.projects.update({
      where: {
        id,
      },
      data: updateData,
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
