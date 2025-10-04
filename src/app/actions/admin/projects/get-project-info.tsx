"use server";

import prisma from "@/lib/prisma";

export async function ActionGetProjectInfo(projectId: number) {
  try {
    const result = await prisma.projects.findFirst({
      where: {
        project_id: projectId,
      },
    });

    if (!result) {
      const resultCreated = await prisma.projects.create({
        data: {
          project_id: projectId,
          hide: false,
          position: "",
          page_url: "",
          address: "",
          min_price: 0,
          file_url: "",
          completion_date: "",
        },
      });

      return {
        status: 1,
        data: resultCreated,
      };
    }
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
