"use server";

import prisma from "@/lib/prisma";

export async function ActionCreateSliderFade(
  sub_id: number,
  langKey: string,
  imagePath: string,
  url: string,
) {
  try {
    const getItem = await prisma.sliders_tb.findFirst({
      where: {
        sub_parent_id: sub_id,
        lang_key: langKey,
      },
    });

    if (getItem) {
      const ChangeImage = await prisma.sliders_tb.update({
        where: {
          id: getItem.id,
        },
        data: {
          image_path: imagePath,
          url,
        },
      });
      return {
        status: "updated",
        data: ChangeImage,
        oldImagePath: getItem.image_path,
      };
    } else {
      const CreateImage = await prisma.sliders_tb.create({
        data: {
          sub_parent_id: sub_id,
          image_path: imagePath,
          url,
          parent_id: "",
          lang_key: langKey,
          slider_name: "",
          sort_index: 0,
        },
      });
      return {
        status: "created",
        data: CreateImage,
      };
    }
  } catch (error) {
    return {
      status: 0,
      data: {},
      error,
    };
  }
}
