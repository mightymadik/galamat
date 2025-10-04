"use server";

import axios from "axios";

import prisma from "@/lib/prisma";

export async function ActionSendNumberGoogle(id: number) {
  try {
    const updateProbabilities = await prisma.lottery.findUnique({
      where: {
        id,
      },
    });

    const getAxios = await axios.post(
      "https://core.passquare.com/api/v2/crm/user_create_or_update",
      {
        app_key: "ec3b90db-ed23-426e-bf06-1fc34c6d9f7b",
        phone: updateProbabilities?.phone,
        bonus: updateProbabilities?.winner,
      },
    );

    return getAxios.data;
  } catch (error: any) {
    return error;
  }
}
