"use server";

import prisma from "@/lib/prisma";

export async function GetUsers() {
  try {
    const result = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        login: true,
        status: true,
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
