"use server";

import prisma from "@/lib/prisma";

export async function RemoveUser(id: number) {
  try {
    const result = await prisma.users.delete({
      where: {
        id,
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
