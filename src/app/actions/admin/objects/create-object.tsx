"use server";

import prisma from "@/lib/prisma";

export async function ActionCreateObject(objectId: number, data: any) {
  try {
    const result = await prisma.objects.findFirst({
      where: {
        id: objectId,
      },
    });

    if (!result) {
      const resultCreated = await prisma.objects.create({
        data,
      });

      return {
        status: 1,
        data: resultCreated,
      };
    } else {
      const resultCreated = await prisma.objects.update({
        where: {
          id: objectId,
        },
        data,
      });

      return {
        status: 1,
        data: resultCreated,
      };
    }
  } catch (error) {
    return {
      status: 0,
      data: [],
      error,
    };
  }
}
