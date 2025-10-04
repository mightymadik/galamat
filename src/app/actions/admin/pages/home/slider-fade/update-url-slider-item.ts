"use server";

import prisma from "@/lib/prisma";

export async function ActionCUpdateSliderFade(id: number, url: string) {
  try {
    const update = await prisma.sliders_tb.update({
      where: {
        id,
      },
      data: {
        url,
      },
    });

    return {
      status: 0,
      data: update,
      error: "",
    };
  } catch (error) {
    return {
      status: 0,
      data: {},
      error,
    };
  }
}
