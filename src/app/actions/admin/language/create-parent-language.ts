"use server";
import prisma from "@/lib/prisma";

export async function CreateParentLanguage(name: string) {
  try {
    const oldWords = await prisma.languages.findMany({
      where: {
        parent_id: "ru",
      },
    });

    const result = await prisma.languages.create({
      data: {
        name,
        key: name.toLowerCase(),
        parent_id: "parents",
      },
    });

    await prisma.languages.createMany({
      data: [...oldWords].map((data) => {
        return {
          name: data.name,
          key: data.key,
          parent_id: result.key,
        };
      }),
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
