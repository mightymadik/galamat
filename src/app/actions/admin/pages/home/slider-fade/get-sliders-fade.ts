"use server";

import prisma from "@/lib/prisma";

export async function ActionGetSlidersFade(slider_name: string) {
  try {
    const mainSliders = await prisma.sliders_tb.findMany({
      where: {
        slider_name,
      },
    });

    const packages = await prisma.sliders_tb.findMany({
      where: {
        parent_id: {
          in: mainSliders.map((s) => s.slider_name),
        },
      },
    });

    const subPackages = await prisma.sliders_tb.findMany({
      where: {
        sub_parent_id: {
          in: packages.map((p) => p.id),
        },
      },
    });

    const result = mainSliders.map((main) => {
      const mainPackages = packages
        .filter((p) => p.slider_name === main.parent_id)
        .map((pkg) => ({
          ...pkg,
          children: subPackages.filter((sub) => sub.sub_parent_id === pkg.id),
        }));

      return {
        ...main,
        children: mainPackages,
      };
    });

    return {
      status: 0,
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
