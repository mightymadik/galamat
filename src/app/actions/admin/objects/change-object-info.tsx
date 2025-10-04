"use server";

import prisma from "@/lib/prisma";

export async function ActionUpdateObjectInfo(data: any) {
  try {
    const result = await prisma.objects.create({
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
