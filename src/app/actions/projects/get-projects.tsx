"use server";

import prisma from "@/lib/prisma";

export async function ActionGetProjectsInfo() {
  try {
    const result = await prisma.projects.findMany();

    return {
      status: 1,
      data: result,
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
