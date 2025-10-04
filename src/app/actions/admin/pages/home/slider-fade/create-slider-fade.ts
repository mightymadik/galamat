"use server";

import prisma from "@/lib/prisma";

export async function ActionCreateSliderFade(parent_id: string) {
  try {
    const result = await prisma.sliders_tb.create({
      data: {
        slider_name: "",
        image_path: "",
        url: "",
        parent_id,
        sub_parent_id: null,
        lang_key: "",
        sort_index: 30,
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
