"use server";

import prisma from "@/lib/prisma";

export async function ActionGetHouseImages(parent_id: number) {
  try {
    const result = await prisma.objects.findMany({
      where: {
        parent_id,
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
