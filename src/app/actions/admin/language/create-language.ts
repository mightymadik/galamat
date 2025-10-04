"use server";

import prisma from "@/lib/prisma";

export async function CreateLanguage(
  name: string,
  key: string,
  parent_id: string,
) {
  try {
    const getParents = await prisma.languages.findMany({
      where: {
        parent_id: "parents",
      },
    });

    if (getParents) {
      const newData = getParents
        .filter((parent) => parent.key !== "ru")
        .map((parent) => {
          return {
            key,
            name,
            parent_id: parent.key,
          };
        });

      await prisma.languages.createMany({
        data: [...newData],
      });
    }

    const result = await prisma.languages.create({
      data: {
        name,
        key,
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
