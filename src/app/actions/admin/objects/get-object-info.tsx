"use server";

import prisma from "@/lib/prisma";

export async function ActionGetObjectInfo(projectId: number, api_url: string) {
  try {
    const result = await prisma.objects.findFirst({
      where: {
        project_house_id: projectId,
      },
    });

    if (!result) {
      const resultCreated = await prisma.objects.create({
        data: {
          project_house_id: projectId,
          parent_id: null,
          coordinates: null,
          image_path: null,
          api_url,
          color: null,
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
