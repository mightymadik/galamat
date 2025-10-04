"use server";

import axios from "axios";
import moment from "moment";
import prisma from "@/lib/prisma";

export async function ActionSendMessage(number: string, name: string) {
  try {
    const code = Math.floor(1000 + Math.random() * 9000);

    const checkNumber = await prisma.lottery.findFirst({
      where: {
        phone: number,
      },
    });

    if (checkNumber) {
      return {
        status: "have-db",
        data: checkNumber,
        error: "",
      };
    } else {
      const requestId = `req-${Date.now()}`;

      const body = {
        requestId,
        to: number,
        content: {
          whatsappContent: {
            contentType: "AUTHENTICATION",
            name: "authorization",
            code,
          },
        },
      };

      const response = await axios.post(
        "https://kazinfoteh.org/wasender/sendwamsg",
        body,
        {
          headers: {
            "X-API-KEY": "sk_3C0B706963AA4224BF430A39BD438F5D",
          },
        },
      );

      if (response.data.status === "ok") {
        const createNumber = await prisma.lottery.create({
          data: {
            phone: number,
            name,
            status: "no-verified",
            verification_code: code,
            winner: 0,
            timeout: moment().format(),
            promocode: "",
          },
        });

        return {
          status: "created-db",
          data: createNumber,
          dataWhatsappContent: response.data,
          error: "",
        };
      }
    }
  } catch (error: any) {
    return {
      status: "error",
      data: [],
      error: error?.response?.data || error.message,
    };
  }
}
