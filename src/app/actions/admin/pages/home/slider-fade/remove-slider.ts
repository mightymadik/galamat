"use server";

import prisma from "@/lib/prisma";

export async function ActionRemoveSliderFade(id: number) {
  try {
    const getChild = await prisma.sliders_tb.findMany({
      where: {
        sub_parent_id: id,
      },
    });

    await prisma.sliders_tb.deleteMany({
      where: {
        id: {
          in: getChild.map((ch) => ch.id),
        },
      },
    });

    const result = await prisma.sliders_tb.delete({
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
